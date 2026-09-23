import { generateKeyPairSync, sign } from 'node:crypto';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyDryRunPacket } from '../../../../src/lib/release/protected-dry-run-worker.mjs';

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
