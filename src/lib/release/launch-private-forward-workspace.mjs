import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Trusted entry point: the operator must pin this launcher and Node independently.
// Runtime files are only data until all bytes match the reviewed Git commit.
const names = [
  'private-forward-workspace.mjs',
  'prepare-forward-subset.mjs',
  'private-forward-workspace.ps1',
];
const fail = () => {
  throw new Error('Private forward runtime authentication failed');
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function regular(file) {
  for (let current = file; ; current = path.dirname(current)) {
    if (fs.lstatSync(current).isSymbolicLink()) fail();
    if (path.dirname(current) === current) break;
  }
  if (!fs.lstatSync(file).isFile()) fail();
  return fs.readFileSync(file);
}
async function run(operation, options) {
  const { workspace, commit, gitExecutable, expectedGitSha256 } = options;
  if (
    ![workspace, gitExecutable].every(
      (v) => typeof v === 'string' && path.isAbsolute(v)
    ) ||
    !/^[a-f0-9]{40}$/.test(commit ?? '') ||
    !/^[a-f0-9]{64}$/.test(expectedGitSha256 ?? '') ||
    hash(regular(gitExecutable)) !== expectedGitSha256
  )
    fail();
  const runtimeDirectory =
    options.runtimeDirectory ?? path.dirname(fileURLToPath(import.meta.url));
  if (
    typeof runtimeDirectory !== 'string' ||
    !path.isAbsolute(runtimeDirectory)
  )
    fail();
  const env = {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_NO_LAZY_FETCH: '1',
    GIT_ALLOW_PROTOCOL: '',
  };
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'])
    if (process.env[key]) env[key] = process.env[key];
  const authenticated = new Map();
  for (const name of names) {
    const bytes = regular(path.join(runtimeDirectory, name));
    const result = spawnSync(
      gitExecutable,
      [
        '--no-replace-objects',
        '--no-optional-locks',
        '-c',
        'core.fsmonitor=false',
        '-C',
        workspace,
        'show',
        `${commit}:src/lib/release/${name}`,
      ],
      { env, windowsHide: true, timeout: 15000, maxBuffer: 16 * 1024 * 1024 }
    );
    if (
      result.error ||
      result.status !== 0 ||
      !Buffer.isBuffer(result.stdout) ||
      !bytes.equals(result.stdout)
    )
      fail();
    authenticated.set(name, bytes);
  }
  // Import the authenticated snapshots, not paths which could change after checking.
  const load = (name) =>
    import(
      `data:text/javascript;base64,${authenticated.get(name).toString('base64')}`
    );
  const preparer = await load('prepare-forward-subset.mjs');
  const coordinator = await load('private-forward-workspace.mjs');
  const runtime = coordinator.createPrivateForwardWorkspaceRuntime({
    inspectForwardSource: preparer.inspectForwardSource,
    authenticatedPowerShell: authenticated.get('private-forward-workspace.ps1'),
  });
  return runtime[operation](options);
}
async function redacted(operation, options) {
  try {
    return await run(operation, options);
  } catch (error) {
    if (
      /^Private forward workspace verification failed \([a-z_]+\)$/.test(
        error?.message ?? ''
      )
    )
      throw new Error(error.message);
    fail();
  }
}
export const preparePrivateForwardWorkspace = (options) =>
  redacted('preparePrivateForwardWorkspace', options);
export const verifyPrivateForwardWorkspace = (options) =>
  redacted('verifyPrivateForwardWorkspace', options);
