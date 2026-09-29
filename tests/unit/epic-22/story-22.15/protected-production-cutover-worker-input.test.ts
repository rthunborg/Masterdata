import { PassThrough } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PROTECTED_CUTOVER_PACKET_MAX_BYTES,
  PROTECTED_CUTOVER_PACKET_TIMEOUT_MS,
  PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS,
  readProtectedCutoverPacket,
  runProtectedProductionCutoverWorker,
} from '../../../../src/lib/release/protected-production-cutover-worker.mjs';

const startedAt = new Date('2026-09-29T12:00:00.000Z');

beforeEach(() => vi.useFakeTimers({ now: startedAt }));
afterEach(() => vi.useRealTimers());

function input() {
  return new PassThrough();
}

function tracked<T>(promise: Promise<T>) {
  void promise.catch(() => { });
  return promise;
}

function expectReleased(stream: PassThrough) {
  expect(stream.listenerCount('data')).toBe(0);
  expect(stream.listenerCount('end')).toBe(0);
  expect(stream.listenerCount('error')).toBe(0);
  expect(stream.listenerCount('close')).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
}

async function expectRefused(promise: Promise<unknown>, stream: PassThrough) {
  await expect(promise).rejects.toThrow('Protected production cutover refused');
  expect(stream.destroyed).toBe(true);
  expectReleased(stream);
}

function workerWithInput(stream: PassThrough) {
  const readFile = vi.fn();
  const publicKeyFactory = vi.fn();
  const verifyPacket = vi.fn();
  const executorFactory = vi.fn();
  const result = runProtectedProductionCutoverWorker({
    input: stream,
    output: { write: vi.fn() },
    argv: ['node', 'protected-production-cutover-worker.mjs'],
    root: process.cwd(),
    randomBytesFn: () => Buffer.alloc(32),
    readFile,
    publicKeyFactory,
    verifyPacket,
    executorFactory,
  });
  return { result: tracked(result), readFile, publicKeyFactory, verifyPacket, executorFactory };
}

function expectNoCapabilityCalls(spies: ReturnType<typeof workerWithInput>) {
  expect(spies.readFile).not.toHaveBeenCalled();
  expect(spies.publicKeyFactory).not.toHaveBeenCalled();
  expect(spies.verifyPacket).not.toHaveBeenCalled();
  expect(spies.executorFactory).not.toHaveBeenCalled();
}

describe('Story 22.15 protected cutover worker input bounds', () => {
  it('exports fixed preparation and packet deadlines without a caller-configurable timeout', () => {
    expect(PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS).toBe(60_000);
    expect(PROTECTED_CUTOVER_PACKET_TIMEOUT_MS).toBe(10_000);
    expect(PROTECTED_CUTOVER_PACKET_MAX_BYTES).toBe(65_536);
  });

  it('allows host preparation beyond ten seconds when the packet arrives and closes before sixty seconds', async () => {
    const stream = input();
    const received = tracked(readProtectedCutoverPacket(stream));

    await vi.advanceTimersByTimeAsync(10_001);
    stream.end(Buffer.from('{"packet":"synthetic"}', 'utf8'));

    await expect(received).resolves.toBe('{"packet":"synthetic"}');
    expectReleased(stream);
  });

  it('rejects a first byte at the preparation deadline even when a delayed timer callback has not run', async () => {
    const stream = input();
    const received = tracked(readProtectedCutoverPacket(stream));

    vi.setSystemTime(new Date(startedAt.getTime() + PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS));
    stream.write(Buffer.from('x'));

    await expectRefused(received, stream);
  });

  it('rejects packet EOF at the packet deadline even when a delayed timer callback has not run', async () => {
    const stream = input();
    const received = tracked(readProtectedCutoverPacket(stream));

    stream.write(Buffer.from('x'));
    vi.setSystemTime(new Date(startedAt.getTime() + PROTECTED_CUTOVER_PACKET_TIMEOUT_MS));
    stream.end();

    await expectRefused(received, stream);
  });

  it('rejects a partial packet with no EOF after the packet deadline', async () => {
    const stream = input();
    const received = tracked(readProtectedCutoverPacket(stream));

    stream.write(Buffer.from('{"partial":', 'utf8'));
    await vi.advanceTimersByTimeAsync(PROTECTED_CUTOVER_PACKET_TIMEOUT_MS);

    await expectRefused(received, stream);
  });

  it('counts raw bytes before UTF-8 decoding and refuses an oversized packet', async () => {
    const stream = input();
    const received = tracked(readProtectedCutoverPacket(stream));

    stream.end(Buffer.from('€'.repeat(Math.ceil((PROTECTED_CUTOVER_PACKET_MAX_BYTES + 1) / 3)), 'utf8'));

    await expectRefused(received, stream);
  });

  it('refuses source errors, close without EOF, and empty EOF without retaining listeners or timers', async () => {
    const cases = [
      (stream: PassThrough) => stream.destroy(new Error('synthetic input error')),
      (stream: PassThrough) => stream.destroy(),
      (stream: PassThrough) => stream.end(),
    ];
    for (const produceFailure of cases) {
      const stream = input();
      const received = tracked(readProtectedCutoverPacket(stream));
      produceFailure(stream);
      await expectRefused(received, stream);
    }
  });

  it('refuses nonfinite and backward clocks while closing the input', async () => {
    const nonfinite = input();
    expect(() => readProtectedCutoverPacket(nonfinite, { now: () => Number.NaN })).toThrow(
      'Protected production cutover refused'
    );
    expect(nonfinite.destroyed).toBe(true);

    const throwing = input();
    expect(() => readProtectedCutoverPacket(throwing, { now: () => { throw new Error('synthetic clock'); } })).toThrow(
      'Protected production cutover refused'
    );
    expect(throwing.destroyed).toBe(true);

    const backward = input();
    const values = [100, 99];
    const received = tracked(readProtectedCutoverPacket(backward, { now: () => values.shift() ?? 99 }));
    backward.write(Buffer.from('x'));
    await expectRefused(received, backward);
  });

  it.each([
    ['preparation expiry', async (stream: PassThrough) => {
      vi.setSystemTime(new Date(startedAt.getTime() + PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS));
      stream.write(Buffer.from('x'));
    }],
    ['packet expiry without EOF', async (stream: PassThrough) => {
      stream.write(Buffer.from('x'));
      await vi.advanceTimersByTimeAsync(PROTECTED_CUTOVER_PACKET_TIMEOUT_MS);
    }],
    ['oversized packet', async (stream: PassThrough) => {
      stream.end(Buffer.alloc(PROTECTED_CUTOVER_PACKET_MAX_BYTES + 1));
    }],
    ['input error', async (stream: PassThrough) => {
      stream.destroy(new Error('synthetic input error'));
    }],
    ['empty packet', async (stream: PassThrough) => {
      stream.end();
    }],
  ])('refuses %s before packet verification or CLI capability selection', async (_label, produceFailure) => {
    const stream = input();
    const worker = workerWithInput(stream);
    await produceFailure(stream);

    await expectRefused(worker.result, stream);
    expectNoCapabilityCalls(worker);
  });
});
