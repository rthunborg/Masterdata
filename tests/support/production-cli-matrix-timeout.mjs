import { spawn } from 'node:child_process';

const fail = (code) => { throw new Error(code); };
const settleWithin = (promise, milliseconds) => new Promise((resolve) => {
  if (milliseconds <= 0) {
    resolve({ timedOut: true });
    return;
  }
  const timer = setTimeout(() => resolve({ timedOut: true }), milliseconds);
  Promise.resolve(promise).then(
    (value) => { clearTimeout(timer); resolve({ value }); },
    (error) => { clearTimeout(timer); resolve({ error }); }
  );
});

function isVerifiedSingleFiring(value, targetVersion) {
  return value && value.armed === true && value.complete === true &&
    value.observed === true && value.targetVersion === targetVersion &&
    value.firingCount === 1;
}

function isStillArmedWithoutFiring(value, targetVersion) {
  return value && value.armed === true && value.complete === true &&
    value.observed === false && value.targetVersion === targetVersion &&
    value.firingCount === 0;
}

function boundedText(chunks) {
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Local-fixture-only timeout proof. Unlike a wall-clock-only cancellation, it
 * cancels only after a separate read-only observer has proved that the exact
 * synthetic history hook fired once. The absolute child deadline remains in
 * force from process start and no failed observation is retried.
 */
export async function runTimeoutAfterObservedHistoryFault({
  executable,
  args,
  options,
  targetVersion,
  observeHook,
  spawnChild = spawn,
  setupTimeoutMs = 60_000,
  cancellationDelayMs = 1_500,
  exitGraceMs = 1_000,
  escalationGraceMs = 1_000,
  observationIntervalMs = 50,
  maxOutputBytes = 1024 * 1024,
} = {}) {
  if (
    typeof executable !== 'string' ||
    !Array.isArray(args) ||
    args.some((value) => typeof value !== 'string') ||
    !options || options.input !== '' ||
    typeof targetVersion !== 'string' ||
    !/^\d{14}$/u.test(targetVersion) ||
    typeof observeHook !== 'function' ||
    typeof spawnChild !== 'function' ||
    !Number.isInteger(setupTimeoutMs) || setupTimeoutMs < 1 ||
    !Number.isInteger(cancellationDelayMs) || cancellationDelayMs < 0 ||
    !Number.isInteger(exitGraceMs) || exitGraceMs < 1 ||
    !Number.isInteger(escalationGraceMs) || escalationGraceMs < 1 ||
    !Number.isInteger(observationIntervalMs) || observationIntervalMs < 1 ||
    !Number.isInteger(maxOutputBytes) || maxOutputBytes < 1
  ) fail('matrix_incomplete_fixture');

  let child;
  try {
    const { input: _closedInput, ...childOptions } = options;
    child = spawnChild(executable, args, {
      ...childOptions,
      stdio: 'pipe',
      shell: false,
      windowsHide: true,
    });
  } catch {
    fail('matrix_incomplete_fixture');
  }
  if (!child || typeof child.once !== 'function' || typeof child.kill !== 'function' ||
      !child.stdin || typeof child.stdin.end !== 'function' ||
      !child.stdout || typeof child.stdout.on !== 'function' ||
      !child.stderr || typeof child.stderr.on !== 'function') fail('matrix_incomplete_fixture');

  const stdout = [];
  const stderr = [];
  let outputBytes = 0;
  let outputOverflow = false;
  let exitedChild = false;
  let closedChild = false;
  let cancellationRequested = false;
  let cancellationAccepted = null;
  let escalationRequested = false;
  let escalationAccepted = null;
  let childExit = null;
  const started = Date.now();
  const deadline = started + setupTimeoutMs;
  let resolveExit;
  const exited = new Promise((resolve) => { resolveExit = resolve; });
  let resolveClose;
  const closed = new Promise((resolve) => { resolveClose = resolve; });
  const requestTermination = () => {
    if (!exitedChild && !cancellationRequested) {
      cancellationRequested = true;
      try { cancellationAccepted = child.kill() === true; } catch { cancellationAccepted = false; }
    }
  };
  const requestEscalation = () => {
    if (!exitedChild && !escalationRequested) {
      escalationRequested = true;
      try { escalationAccepted = child.kill('SIGKILL') === true; } catch { escalationAccepted = false; }
    }
  };
  const waitForCloseWithinGrace = async (grace) => {
    if (closedChild) return true;
    const remaining = Math.min(deadline - Date.now(), grace);
    if (remaining <= 0) return false;
    return !(await settleWithin(closed, remaining)).timedOut;
  };
  const terminateAndContain = async () => {
    requestTermination();
    if (await waitForCloseWithinGrace(exitGraceMs)) return true;
    requestEscalation();
    return waitForCloseWithinGrace(escalationGraceMs);
  };
  const collect = (target) => (chunk) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    outputBytes += bytes.length;
    if (outputBytes > maxOutputBytes) {
      outputOverflow = true;
      requestTermination();
      return;
    }
    target.push(bytes);
  };
  child.stdout.on('data', collect(stdout));
  child.stderr.on('data', collect(stderr));
  child.once('error', () => {
    if (!exitedChild) {
      exitedChild = true;
      childExit = { kind: 'error', code: null, signal: null };
      resolveExit(childExit);
    }
  });
  child.once('exit', (code, signal) => {
    if (!exitedChild) {
      exitedChild = true;
      childExit = { kind: signal ? 'signal' : 'exit', code, signal: signal ?? null };
      resolveExit(childExit);
    }
  });
  child.once('close', (code, signal) => {
    if (!exitedChild) {
      exitedChild = true;
      childExit = { kind: signal ? 'signal' : 'exit', code, signal: signal ?? null };
      resolveExit(childExit);
    }
    if (!closedChild) {
      closedChild = true;
      resolveClose(childExit);
    }
  });

  let observed = null;
  try {
    // The synchronous fixture used an explicitly empty input buffer. Close the
    // asynchronous child's stdin before any observation so the command cannot
    // wait for a prompt while the timeout proof is being established.
    child.stdin.end();
    while (true) {
      if (exitedChild) fail('matrix_incomplete_fixture');
      const remaining = deadline - Date.now();
      // Reserve the complete cancellation interval within the fixed child
      // ceiling. A late observation cannot extend that ceiling.
      if (remaining <= cancellationDelayMs + exitGraceMs + escalationGraceMs) {
        await terminateAndContain();
        fail('matrix_incomplete_fixture');
      }
      const observation = await settleWithin(
        Promise.resolve().then(observeHook),
        remaining - cancellationDelayMs - exitGraceMs - escalationGraceMs
      );
      if (observation.timedOut || observation.error) {
        await terminateAndContain();
        fail('matrix_incomplete_fixture');
      }
      const current = observation.value;
      if (Date.now() > deadline - cancellationDelayMs - exitGraceMs - escalationGraceMs) {
        await terminateAndContain();
        fail('matrix_incomplete_fixture');
      }
      if (isVerifiedSingleFiring(current, targetVersion)) {
        observed = current;
        break;
      }
      if (!isStillArmedWithoutFiring(current, targetVersion)) fail('matrix_incomplete_fixture');
      await settleWithin(exited, Math.min(observationIntervalMs, Math.max(1, deadline - Date.now())));
    }

    if (exitedChild) fail('matrix_incomplete_fixture');
    if (Date.now() > deadline - cancellationDelayMs - exitGraceMs - escalationGraceMs) {
      await terminateAndContain();
      fail('matrix_incomplete_fixture');
    }
    const cancellationAt = Date.now();
    await settleWithin(exited, cancellationDelayMs);
    if (!await terminateAndContain()) fail('matrix_incomplete_fixture');
    if (Date.now() > deadline || outputOverflow || !cancellationRequested || cancellationAccepted !== true ||
        childExit?.kind !== 'signal' || !childExit.signal) fail('matrix_incomplete_fixture');
    return Object.freeze({
      child: Object.freeze({ kind: 'timeout', code: null }),
      actualChildExit: Object.freeze(childExit),
      output: boundedText(stdout) + boundedText(stderr),
      outputBytes,
      durationMs: Date.now() - started,
      observedHook: Object.freeze({
        armed: observed.armed,
        complete: observed.complete,
        observed: observed.observed,
        targetVersion: observed.targetVersion,
        firingCount: observed.firingCount,
      }),
      cancellation: Object.freeze({
        afterObservedHook: true,
        delayMs: cancellationDelayMs,
        observedAtMs: cancellationAt - started,
        actualExitKind: childExit.kind,
        actualExitCode: childExit.code,
        actualExitSignal: childExit.signal,
        escalationRequested,
        escalationAccepted,
      }),
    });
  } catch (error) {
    if (!closedChild) await terminateAndContain();
    throw error;
  }
}
