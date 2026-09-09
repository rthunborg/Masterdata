import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readPausedLock(root) {
  let lock;
  try {
    lock = JSON.parse(readFileSync(resolve(root, 'src/maintenance/production-pause-lock.json'), 'utf8'));
  } catch {
    throw new Error('Production pause lock is missing or invalid; refusing Vercel build.');
  }

  if (!lock || lock.version !== 1 || !['paused', 'reopening-authorized'].includes(lock.state) || typeof lock.purpose !== 'string') {
    throw new Error('Production pause lock has an unrecognized shape; refusing Vercel build.');
  }
  if (lock.state === 'reopening-authorized' && (typeof lock.reopeningDecision !== 'string' || lock.reopeningDecision.trim().length < 1 || lock.reopeningDecision.length > 160 || /[\r\n]/.test(lock.reopeningDecision))) {
    throw new Error('Production reopening authorization record is missing or invalid; refusing Vercel build.');
  }

  return lock;
}

export function resolveVercelTarget(environment) {
  const environmentTarget = environment.VERCEL_ENV;
  const explicitTarget = environment.VERCEL_TARGET_ENV;
  const recognized = new Set(['preview', 'development', 'production']);

  // VERCEL_ENV is the deployment class; VERCEL_TARGET_ENV may be a custom
  // preview environment name (for example staging), rather than that class.
  if (!recognized.has(environmentTarget)) {
    throw new Error('Missing or ambiguous Vercel deployment target; refusing application build.');
  }
  if (explicitTarget !== undefined && (typeof explicitTarget !== 'string' || !explicitTarget || /\s/.test(explicitTarget) || (recognized.has(explicitTarget.toLowerCase()) && !recognized.has(explicitTarget)))) {
    throw new Error('Missing or ambiguous Vercel deployment target; refusing application build.');
  }
  if (environmentTarget === 'production' || explicitTarget === 'production') return 'production';
  if (explicitTarget && recognized.has(explicitTarget) && environmentTarget !== explicitTarget) {
    throw new Error('Conflicting non-production Vercel deployment targets; refusing application build.');
  }
  if (environmentTarget === 'preview') return 'preview';
  if (environmentTarget === 'development' && (!explicitTarget || explicitTarget === 'development')) return 'development';
  throw new Error('Missing or ambiguous Vercel deployment target; refusing application build.');
}

export function assertNextBuildAllowed(environment, root = process.cwd()) {
  if (environment.VERCEL === undefined) {
    if (environment.VERCEL_ENV !== undefined || environment.VERCEL_TARGET_ENV !== undefined) {
      throw new Error('Vercel target marker is present without a Vercel runtime marker; refusing application build.');
    }
    return;
  }
  if (environment.VERCEL !== '1') {
    throw new Error('Ambiguous Vercel runtime marker; refusing application build.');
  }
  const target = resolveVercelTarget(environment);
  const lock = readPausedLock(root);
  if (target === 'production') {
    if (lock.state === 'paused') {
      throw new Error('Production application build refused: the committed production pause is active.');
    }
  }
}
