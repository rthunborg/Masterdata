import { pathToFileURL } from 'node:url';
import { readPausedLock } from './production-pause-next-build-policy.mjs';

// Covers both scheduled and manually dispatched backup/refresh jobs. The
// secret-bearing Production job must depend on this separate, secret-free job.
// An absent/invalid lock fails the prerequisite job; it never permits backup.
export function backupAllowedByProductionPause(root = process.cwd()) {
  return readPausedLock(root).state === 'reopening-authorized';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 2) throw new Error('Unexpected arguments');
    process.stdout.write(`backup_allowed=${backupAllowedByProductionPause()}\n`);
  } catch {
    process.stderr.write('Backup and staging refresh refused: production pause lock is unavailable or invalid.\n');
    process.exitCode = 1;
  }
}
