import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { runTimeoutAfterObservedHistoryFault } from '../../../support/production-cli-matrix-timeout.mjs';

const targetVersion = '20260314000002';
const armed = (firingCount: number) => ({
  armed: true,
  complete: true,
  observed: firingCount === 1,
  targetVersion,
  firingCount,
});

function childThatTerminatesOnKill() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    stdin: PassThrough;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.kill = vi.fn(() => {
    setTimeout(() => {
      child.emit('exit', null, 'SIGTERM');
      child.emit('close', null, 'SIGTERM');
    }, 0);
    return true;
  });
  return child;
}

const base = (child: ReturnType<typeof childThatTerminatesOnKill>) => ({
  executable: 'synthetic-cli',
  args: ['db', 'push'],
  options: { cwd: 'C:/synthetic', env: {}, encoding: 'utf8', input: '' },
  targetVersion,
  spawnChild: vi.fn(() => child),
  setupTimeoutMs: 80,
  cancellationDelayMs: 5,
  exitGraceMs: 5,
  escalationGraceMs: 5,
  observationIntervalMs: 1,
});

describe('local CLI matrix timeout fault cancellation', () => {
  it('starts the cancellation delay only after the independent observer sees one armed target firing', async () => {
    const child = childThatTerminatesOnKill();
    child.stdout.write('Applying migration 20260314000002_add_headcount_upper_bound.sql\n');
    const observeHook = vi.fn()
      .mockResolvedValueOnce(armed(0))
      .mockResolvedValueOnce(armed(1));

    const result = await runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook,
    });

    expect(observeHook).toHaveBeenCalledTimes(2);
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.stdin.writableEnded).toBe(true);
    expect(result.child).toEqual({ kind: 'timeout', code: null });
    expect(result.actualChildExit).toEqual({ kind: 'signal', code: null, signal: 'SIGTERM' });
    expect(result.observedHook).toEqual(armed(1));
    expect(result.cancellation).toMatchObject({
      afterObservedHook: true,
      delayMs: 5,
      actualExitKind: 'signal',
    });
    expect(result.output).toContain('20260314000002');
  });

  it('refuses an unfired hook at the absolute setup deadline instead of treating an early cancellation as proof', async () => {
    const child = childThatTerminatesOnKill();
    const observeHook = vi.fn().mockResolvedValue(armed(0));

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook, setupTimeoutMs: 25,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(observeHook.mock.calls.length).toBeGreaterThan(0);
  });

  it('keeps a stalled read-only observation inside the same absolute child deadline', async () => {
    const child = childThatTerminatesOnKill();
    const observeHook = vi.fn(() => new Promise(() => {}));

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook, setupTimeoutMs: 25,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(observeHook).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['changed hook', { ...armed(1), armed: false, complete: false }],
    ['double firing', armed(2)],
  ])('refuses a %s without retrying the observer', async (_label, observation) => {
    const child = childThatTerminatesOnKill();
    const observeHook = vi.fn().mockResolvedValue(observation);

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(observeHook).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('refuses a child that exits before the hook is independently observed', async () => {
    const child = childThatTerminatesOnKill();
    const observeHook = vi.fn().mockImplementation(async () => {
      child.emit('exit', 0, null);
      child.emit('close', 0, null);
      return armed(0);
    });

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).not.toHaveBeenCalled();
  });

  it('refuses an observer error and terminates the started child', async () => {
    const child = childThatTerminatesOnKill();
    const observeHook = vi.fn().mockRejectedValue(new Error('synthetic observer failure'));

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('escalates an unacknowledged normal kill to exact-child SIGKILL and closes before passing', async () => {
    const child = childThatTerminatesOnKill();
    child.kill.mockImplementation((signal?: string) => {
      if (signal === 'SIGKILL') {
        setTimeout(() => {
          child.emit('exit', null, 'SIGKILL');
          child.emit('close', null, 'SIGKILL');
        }, 0);
      }
      return true;
    });

    const result = await runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook: vi.fn().mockResolvedValue(armed(1)),
      setupTimeoutMs: 60,
    });

    expect(child.kill.mock.calls).toEqual([[], ['SIGKILL']]);
    expect(result.actualChildExit).toEqual({ kind: 'signal', code: null, signal: 'SIGKILL' });
    expect(result.cancellation).toMatchObject({
      escalationRequested: true,
      escalationAccepted: true,
    });
  });

  it('remains incomplete when both exact-child termination requests lack close acknowledgement', async () => {
    const child = childThatTerminatesOnKill();
    child.kill.mockImplementation(() => true);

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook: vi.fn().mockResolvedValue(armed(1)),
      setupTimeoutMs: 25,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill.mock.calls).toEqual([[], ['SIGKILL']]);
  });

  it('rejects a false kill acknowledgement even if the child later exits normally', async () => {
    const child = childThatTerminatesOnKill();
    child.kill.mockImplementation(() => {
      setTimeout(() => {
        child.emit('exit', 0, null);
        child.emit('close', 0, null);
      }, 0);
      return false;
    });

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook: vi.fn().mockResolvedValue(armed(1)),
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('rejects a throwing kill request', async () => {
    const child = childThatTerminatesOnKill();
    child.kill.mockImplementation(() => { throw new Error('synthetic kill failure'); });

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook: vi.fn().mockResolvedValue(armed(1)),
      setupTimeoutMs: 20,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill.mock.calls).toEqual([[], ['SIGKILL']]);
  });

  it.each([
    ['wrong target', { ...armed(1), targetVersion: '20260314000001' }],
    ['missing hook', { armed: false, complete: false, observed: false, targetVersion, firingCount: null }],
  ])('refuses a %s observation before cancellation', async (_label, observation) => {
    const child = childThatTerminatesOnKill();

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook: vi.fn().mockResolvedValue(observation),
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('rejects bounded output overflow before it can become a timeout proof', async () => {
    const child = childThatTerminatesOnKill();
    const spawnChild = vi.fn(() => {
      setTimeout(() => child.stdout.write('x'.repeat(17)), 0);
      return child;
    });

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), spawnChild, observeHook: vi.fn().mockResolvedValue(armed(0)),
      maxOutputBytes: 16,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('rejects a normal child exit during the post-observation cancellation delay', async () => {
    const child = childThatTerminatesOnKill();
    const observeHook = vi.fn().mockImplementation(async () => {
      setTimeout(() => {
        child.emit('exit', 0, null);
        child.emit('close', 0, null);
      }, 1);
      return armed(1);
    });

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), observeHook, cancellationDelayMs: 10,
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(child.kill).not.toHaveBeenCalled();
  });

  it('rejects a nonempty async stdin before it can spawn a reviewed child', async () => {
    const child = childThatTerminatesOnKill();
    const spawnChild = vi.fn(() => child);

    await expect(runTimeoutAfterObservedHistoryFault({
      ...base(child), spawnChild, observeHook: vi.fn().mockResolvedValue(armed(1)),
      options: { cwd: 'C:/synthetic', env: {}, encoding: 'utf8', input: 'unsafe' },
    })).rejects.toThrow('matrix_incomplete_fixture');

    expect(spawnChild).not.toHaveBeenCalled();
  });
});
