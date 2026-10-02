import { readPausedLock, resolveVercelTarget } from './production-pause-next-build-policy.mjs';

let ignore = true;
try {
  if (process.env.VERCEL !== '1') throw new Error('Ambiguous Vercel runtime marker.');
  const target = resolveVercelTarget(process.env);
  const lock = readPausedLock(process.cwd());
  ignore = target === 'production' && lock.state === 'paused';
} catch {
  // A zero ignoreCommand result is an ignored Vercel build. Treat unknown input
  // and malformed locks as paused so they cannot become an application deploy.
}
process.exitCode = ignore ? 0 : 1;
