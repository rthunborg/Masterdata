import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const lockPath = resolve(process.cwd(), 'src/maintenance/production-pause-lock.json');

function readPausedLock() {
  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    throw new Error('Production pause lock is missing or invalid; refusing Vercel build.');
  }

  if (!lock || lock.version !== 1 || !['paused', 'reopening-authorized'].includes(lock.state) || typeof lock.purpose !== 'string') {
    throw new Error('Production pause lock has an unrecognized shape; refusing Vercel build.');
  }
  if (lock.state === 'reopening-authorized' && (typeof lock.reopeningDecision !== 'string' || lock.reopeningDecision.length < 1 || lock.reopeningDecision.length > 160 || /[\r\n]/.test(lock.reopeningDecision))) {
    throw new Error('Production reopening authorization record is missing or invalid; refusing Vercel build.');
  }

  return lock;
}

function resolveVercelTarget() {
  const environmentTarget = process.env.VERCEL_ENV;
  const explicitTarget = process.env.VERCEL_TARGET_ENV;
  const recognized = new Set(['preview', 'development', 'production']);

  if ((environmentTarget !== undefined && !recognized.has(environmentTarget)) || (explicitTarget !== undefined && !recognized.has(explicitTarget))) {
    throw new Error('Missing or ambiguous Vercel target.');
  }
  if (environmentTarget === 'production' || explicitTarget === 'production') return 'production';
  if (environmentTarget && explicitTarget && environmentTarget !== explicitTarget) {
    throw new Error('Conflicting non-production Vercel targets.');
  }
  if (environmentTarget === 'preview' || explicitTarget === 'preview') return 'preview';
  if (environmentTarget === 'development' || explicitTarget === 'development') return 'development';
  throw new Error('Missing or ambiguous Vercel target.');
}

const vercel = process.env.VERCEL;
let ignore = true;
try {
  if (vercel !== '1') throw new Error('Ambiguous Vercel runtime marker.');
  const target = resolveVercelTarget();
  const lock = readPausedLock();
  ignore = target === 'production' && lock.state === 'paused';
} catch {
  // A zero ignoreCommand result is an ignored Vercel build. Treat unknown input
  // and malformed locks as paused so they cannot become an application deploy.
}
process.exitCode = ignore ? 0 : 1;
