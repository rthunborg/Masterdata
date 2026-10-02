import { EventEmitter } from 'node:events';
import { generateKeyPairSync, sign } from 'node:crypto';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { verifyDryRunPacket, readProtectedDryRunPacket, PROTECTED_DRY_RUN_PREPARATION_TIMEOUT_MS, PROTECTED_DRY_RUN_PACKET_TIMEOUT_MS } from '../../../../src/lib/release/protected-dry-run-worker.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const nonce = 'a'.repeat(64);
function request() {
  return { schemaVersion: 1, operation: 'production-dry-run', nonce, workspace: path.resolve('synthetic-private-workspace'), environment: {
    EXPECTED_SUPABASE_ENVIRONMENT: 'production', EXPECTED_SUPABASE_PROJECT_REF: 'a'.repeat(20),
    SUPABASE_DB_CONNECTION_MODE: 'session-pooler', EXPECTED_SUPABASE_POOLER_HOST: 'synthetic.invalid',
    SUPABASE_DB_URL: 'synthetic-only', SUPABASE_SSL_ROOT_CERT: 'synthetic-certificate',
    EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256: 'b'.repeat(64), SUPABASE_CLI_EXECUTABLE: 'synthetic-cli',
    EXPECTED_SUPABASE_CLI_SHA256: 'c'.repeat(64), SystemRoot: 'synthetic-windows', WINDIR: 'synthetic-windows', PATH: 'synthetic-system',
  } };
}
function packet(value: unknown, key = privateKey) {
  const payload = Buffer.from(JSON.stringify(value));
  return JSON.stringify({ payload: payload.toString('base64'), signature: sign('RSA-SHA256', payload, key).toString('base64') });
}

describe('protected dry-run signed challenge', () => {
  it('accepts the installed signing key and exact fresh request, without performing an operation', () => {
    expect(verifyDryRunPacket(packet(request()), nonce, publicKey)).toEqual(request());
  });
  it('rejects another signer', () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    expect(() => verifyDryRunPacket(packet(request(), other.privateKey), nonce, publicKey)).toThrow();
  });
  it('rejects replay against a fresh worker nonce', () => {
    expect(() => verifyDryRunPacket(packet(request()), 'b'.repeat(64), publicKey)).toThrow();
  });
  it('rejects payload mutation after signing', () => {
    const envelope = JSON.parse(packet(request()));
    envelope.payload = Buffer.from(JSON.stringify({ ...request(), operation: 'apply' })).toString('base64');
    expect(() => verifyDryRunPacket(JSON.stringify(envelope), nonce, publicKey)).toThrow();
  });
  it.each(['apply', 'repair', 'cleanup', 'verify-toolchain'])('rejects signed unsupported operation %s', operation => {
    expect(() => verifyDryRunPacket(packet({ ...request(), operation }), nonce, publicKey)).toThrow();
  });
  it.each(['approvalAttested', 'args', 'target', 'executable'])('rejects signed extra field %s', field => {
    expect(() => verifyDryRunPacket(packet({ ...request(), [field]: true }), nonce, publicKey)).toThrow();
  });
  it.each(['NODE_OPTIONS', 'NODE_PATH', 'PGHOSTADDR', 'PGPASSWORD', 'SUPABASE_ACCESS_TOKEN'])('rejects signed ambient variable %s', key => {
    const value = request(); Object.assign(value.environment, { [key]: 'untrusted' });
    expect(() => verifyDryRunPacket(packet(value), nonce, publicKey)).toThrow();
  });
  it('rejects missing environment keys', () => {
    const value = request(); delete (value.environment as Partial<typeof value.environment>).EXPECTED_SUPABASE_CLI_SHA256;
    expect(() => verifyDryRunPacket(packet(value), nonce, publicKey)).toThrow();
  });
  it('rejects environment mismatch', () => {
    const value = request(); value.environment.EXPECTED_SUPABASE_ENVIRONMENT = 'staging';
    expect(() => verifyDryRunPacket(packet(value), nonce, publicKey)).toThrow();
  });
  it('rejects nonabsolute workspace', () => {
    expect(() => verifyDryRunPacket(packet({ ...request(), workspace: 'relative' }), nonce, publicKey)).toThrow();
  });
  it.each(['{', '{}', ' '.repeat(65537)])('rejects malformed or oversized envelope', text => {
    expect(() => verifyDryRunPacket(text, nonce, publicKey)).toThrow();
  });
});

// Use the same fixed production deadlines with a controlled clock. This tests
// delayed host preparation separately from an attacker delaying packet EOF.
describe('protected dry-run two-phase packet receipt', () => {
  function fixture() {
    class Input extends EventEmitter {
      pause = vi.fn(); resume = vi.fn(); destroy = vi.fn();
    }
    const input = new Input(); let clock = 100; let id = 0;
    const timers = new Map<number, { callback: () => void; delay: number }>();
    const setTimer = vi.fn((callback: () => void, delay: number) => { timers.set(++id, { callback, delay }); return id; });
    const clearTimer = vi.fn((value: number) => { timers.delete(value); });
    const options = { now: () => clock, setTimer, clearTimer };
    return { input, timers, setTimer, options, advance: (value: number) => { clock += value; } };
  }
  it('accepts delayed host preparation without changing signed request validation', async () => {
    const f = fixture(); const reading = readProtectedDryRunPacket(f.input, f.options);
    f.advance(20_000); const text = packet(request()); f.input.emit('data', Buffer.from(text)); f.input.emit('end');
    expect(await reading).toBe(text); expect(verifyDryRunPacket(text, nonce, publicKey)).toEqual(request());
    expect(f.setTimer.mock.calls.map(call => call[1])).toEqual([60_000, 10_000]);
    expect(f.timers.size).toBe(0);
  });
  it('rejects preparation arriving at its exact deadline even if the timer callback is delayed', async () => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    f.advance(PROTECTED_DRY_RUN_PREPARATION_TIMEOUT_MS); f.input.emit('data', Buffer.from('{}')); await rejected;
    expect(f.input.destroy).toHaveBeenCalledOnce();
  });
  it('rejects missing input at the bounded preparation timer', async () => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    [...f.timers.values()][0].callback(); await rejected;
    expect(f.input.listenerCount('data')).toBe(0); expect(f.input.destroy).toHaveBeenCalledOnce();
  });
  it('rejects an empty packet', async () => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    f.input.emit('end'); await rejected;
  });
  it('does not start or reset transmission for an empty chunk', async () => {
    const f = fixture(); const reading = readProtectedDryRunPacket(f.input, f.options);
    f.advance(15_000); f.input.emit('data', Buffer.alloc(0)); expect(f.setTimer).toHaveBeenCalledTimes(1);
    f.advance(5_000); f.input.emit('data', Buffer.from('{}')); f.input.emit('end'); expect(await reading).toBe('{}');
  });
  it('rejects slow-drip EOF and never resets the transmission deadline', async () => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    f.advance(20_000); f.input.emit('data', Buffer.from('{')); f.advance(9_000); f.input.emit('data', Buffer.from('}'));
    f.advance(1_000); f.input.emit('end'); await rejected;
    expect(f.setTimer.mock.calls.map(call => call[1])).toEqual([60_000, 10_000]);
  });
  it('rejects a packet stalled after its first byte', async () => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    f.input.emit('data', Buffer.from('{'));
    const timer = [...f.timers.values()].find(value => value.delay === PROTECTED_DRY_RUN_PACKET_TIMEOUT_MS)!;
    timer.callback(); await rejected; expect(f.input.destroy).toHaveBeenCalledOnce();
  });
  it('enforces bytes rather than character count for oversized input', async () => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    f.input.emit('data', Buffer.from('é'.repeat(32_769))); await rejected;
  });
  it.each(['error', 'close'])('rejects premature stream %s', async event => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    f.input.emit(event, new Error('synthetic')); await rejected;
  });
  it('rejects a clock that moves backward during preparation', async () => {
    const f = fixture(); const rejected = expect(readProtectedDryRunPacket(f.input, f.options)).rejects.toThrow();
    f.advance(-1); f.input.emit('data', Buffer.from('{}')); await rejected;
  });
  it('rejects a nonfinite initial clock and destroys the stream', () => {
    const f = fixture(); expect(() => readProtectedDryRunPacket(f.input, { ...f.options, now: () => NaN })).toThrow();
    expect(f.input.destroy).toHaveBeenCalledOnce();
  });
});