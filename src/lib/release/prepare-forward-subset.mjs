import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MANIFEST = 'supabase/migration-baseline-manifest.json';
const MIGRATIONS = 'supabase/migrations';
const SHA = /^[a-f0-9]{40}$/u;
const FILE = /^(\d{14})_[a-z0-9_]+\.sql$/u;
const fail = () => {
  throw new Error('Forward subset integrity check failed');
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function createGitReader({ gitExecutable, expectedGitSha256 }) {
  if (
    typeof gitExecutable !== 'string' ||
    !path.isAbsolute(gitExecutable) ||
    !/^[a-f0-9]{64}$/u.test(expectedGitSha256 ?? '')
  )
    fail();
  const executable = realpathSync(gitExecutable);
  if (hash(regularFile(executable)) !== expectedGitSha256) fail();
  return (workspace, args) => {
    // No credential or ambient Git configuration overrides reach the read-only child.
    const env = {
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
      GIT_TERMINAL_PROMPT: '0',
    };
    for (const key of [
      'PATH',
      'Path',
      'SYSTEMROOT',
      'SystemRoot',
      'WINDIR',
      'TEMP',
      'TMP',
      'HOME',
      'USERPROFILE',
    ]) {
      if (process.env[key]) env[key] = process.env[key];
    }
    const result = spawnSync(
      executable,
      [
        '--no-optional-locks',
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.excludesFile=' +
          (process.platform === 'win32' ? 'NUL' : '/dev/null'),
        '-C',
        workspace,
        ...args,
      ],
      {
        env,
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 16 * 1024 * 1024,
      }
    );
    if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout))
      fail();
    return result.stdout;
  };
}

function regularFile(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail();
  return readFileSync(file);
}

function directory(dir) {
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail();
}

function cleanSource(workspace, commit, git) {
  if (!path.isAbsolute(workspace) || !SHA.test(commit)) fail();
  const root = realpathSync(workspace);
  // Git status may invoke repository-local clean filters while examining dirt.
  // Reject those before status; global/system drivers are already disabled.
  const localConfigKeys = git(root, [
    'config',
    '--local',
    '--includes',
    '--name-only',
    '--list',
  ])
    .toString()
    .split(/\r?\n/u);
  if (localConfigKeys.some((key) => key.toLowerCase().startsWith('filter.')))
    fail();
  if (
    realpathSync(
      git(root, ['rev-parse', '--show-toplevel']).toString().trim()
    ) !== root ||
    git(root, ['rev-parse', 'HEAD']).toString().trim() !== commit ||
    git(root, ['status', '--porcelain=v1', '--untracked-files=all']).length
  )
    fail();
  const indexEntries = git(root, ['ls-files', '-v', '-z'])
    .toString()
    .split('\0')
    .filter(Boolean);
  if (indexEntries.some((entry) => entry[0] !== 'H')) fail();
  return root;
}

function planArray(manifest, value) {
  if (value === 'classifications.execute')
    return manifest.classifications.execute;
  if (value === 'classifications.repair-after-catalog-proof')
    return manifest.classifications['repair-after-catalog-proof'];
  return value;
}

export function inspectForwardSource({
  workspace,
  commit,
  gitExecutable,
  expectedGitSha256,
}) {
  const git = createGitReader({ gitExecutable, expectedGitSha256 });
  const root = cleanSource(workspace, commit, git);
  const manifestBytes = git(root, ['show', commit + ':' + MANIFEST]);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    fail();
  }
  const plan = manifest.environmentPlans?.production;
  if (
    manifest.schemaVersion !== 1 ||
    manifest.reviewedSupabaseCliVersion !== '2.115.0' ||
    !plan
  )
    fail();
  const execute = planArray(manifest, plan.execute);
  const repair = planArray(manifest, plan['repair-after-catalog-proof']);
  if (
    ![execute, repair].every(
      (versions) =>
        Array.isArray(versions) &&
        versions.every((v) => typeof v === 'string' && /^\d{14}$/u.test(v))
    ) ||
    execute.length === 0 ||
    !same(execute, [...execute].sort()) ||
    new Set([...execute, ...repair]).size !== execute.length + repair.length ||
    !same(execute, manifest.classifications.execute) ||
    !same(repair, manifest.classifications['repair-after-catalog-proof'])
  )
    fail();
  for (const entry of manifest.orderedPrerequisites ?? []) {
    if (
      !execute.includes(entry.version) ||
      !execute.includes(entry.beforeVersion) ||
      execute.indexOf(entry.version) >= execute.indexOf(entry.beforeVersion)
    )
      fail();
  }
  const entries = git(root, ['ls-tree', '-z', commit, MIGRATIONS + '/'])
    .toString()
    .split('\0')
    .filter(Boolean);
  const files = entries.map((entry) => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/u.exec(entry);
    if (!match || !match[3].startsWith(MIGRATIONS + '/')) fail();
    const name = match[3].slice(MIGRATIONS.length + 1);
    if (!FILE.test(name)) fail();
    return { name, blob: match[2], version: FILE.exec(name)[1] };
  });
  if (
    files.length !== manifest.repositoryMigrationCount ||
    !same(files.map((f) => f.version).sort(), [...execute, ...repair].sort())
  )
    fail();
  directory(path.join(root, 'supabase'));
  directory(path.join(root, MIGRATIONS));
  if (
    !same(
      readdirSync(path.join(root, MIGRATIONS)).sort(),
      files.map((f) => f.name).sort()
    )
  )
    fail();
  // Check every immutable migration, including the excluded unsafe history.
  const contents = new Map();
  for (const file of files) {
    const bytes = git(root, ['cat-file', 'blob', file.blob]);
    if (!regularFile(path.join(root, MIGRATIONS, file.name)).equals(bytes))
      fail();
    contents.set(file.version, bytes);
  }
  const subset = execute.map((version) => {
    const file = files.find((f) => f.version === version);
    return {
      version,
      file: file.name,
      gitBlob: file.blob,
      sha256: hash(contents.get(version)),
    };
  });
  const receipt = {
    schemaVersion: 1,
    kind: 'offline-forward-subset',
    executable: false,
    privateMaterialAllowed: false,
    approvalAttested: false,
    gitExecutableSha256: expectedGitSha256,
    sourceCommit: commit,
    sourceTree: git(root, ['rev-parse', commit + '^{tree}'])
      .toString()
      .trim(),
    sourceManifestSha256: hash(manifestBytes),
    reviewedSupabaseCliVersion: '2.115.0',
    migrations: subset,
  };
  cleanSource(root, commit, git);
  return { receipt, contents, root, git };
}

function detachedDestination(destination, sourceRoot) {
  if (!path.isAbsolute(destination)) fail();
  const resolved = path.resolve(destination);
  const parent = realpathSync(path.dirname(resolved));
  if (path.dirname(resolved) !== parent) fail();
  const relative = path.relative(sourceRoot, resolved);
  if (
    !relative ||
    (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))
  )
    fail();
  return resolved;
}

export function prepareForwardSubset(options) {
  const { commit, destination } = options;
  const { receipt, contents, root, git } = inspectForwardSource(options);
  const output = detachedDestination(destination, root);
  // Non-secret source only. POSIX modes are not a Windows DACL attestation.
  // Exclusive creation: never overwrite or remove a prior attempt.
  mkdirSync(output, { mode: 0o700 });
  mkdirSync(path.join(output, 'supabase'), { mode: 0o700 });
  mkdirSync(path.join(output, MIGRATIONS), { mode: 0o700 });
  for (const entry of receipt.migrations) {
    writeFileSync(
      path.join(output, MIGRATIONS, entry.file),
      contents.get(entry.version),
      { flag: 'wx', mode: 0o600 }
    );
  }
  cleanSource(root, commit, git);
  // Written last; incomplete attempts are never valid artifacts.
  writeFileSync(
    path.join(output, 'forward-subset.json'),
    JSON.stringify(receipt, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 }
  );
  return verifyForwardSubset(options);
}

export function verifyForwardSubset(options) {
  const { destination } = options;
  const { receipt, root } = inspectForwardSource(options);
  const output = detachedDestination(destination, root);
  directory(output);
  directory(path.join(output, 'supabase'));
  directory(path.join(output, MIGRATIONS));
  if (
    !same(readdirSync(output).sort(), ['forward-subset.json', 'supabase']) ||
    !same(readdirSync(path.join(output, 'supabase')), ['migrations']) ||
    !same(
      readdirSync(path.join(output, MIGRATIONS)).sort(),
      receipt.migrations.map((m) => m.file).sort()
    )
  )
    fail();
  const recorded = JSON.parse(
    regularFile(path.join(output, 'forward-subset.json')).toString()
  );
  if (!same(recorded, receipt)) fail();
  for (const entry of receipt.migrations) {
    if (
      hash(regularFile(path.join(output, MIGRATIONS, entry.file))) !==
      entry.sha256
    )
      fail();
  }
  return receipt;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const [
      mode,
      workspace,
      commit,
      destination,
      gitExecutable,
      expectedGitSha256,
      ...extra
    ] = process.argv.slice(2);
    if (
      extra.length ||
      !['prepare', 'verify'].includes(mode) ||
      !workspace ||
      !commit ||
      !destination
    )
      fail();
    const operation =
      mode === 'prepare' ? prepareForwardSubset : verifyForwardSubset;
    const receipt = operation({
      workspace,
      commit,
      destination,
      gitExecutable,
      expectedGitSha256,
    });
    process.stdout.write(JSON.stringify(receipt) + '\n');
  } catch {
    // Supplied paths and Git/filesystem diagnostics may contain private data.
    process.stderr.write(
      'Offline forward subset preparation/verification failed; no hosted operation was attempted.\n'
    );
    process.exitCode = 1;
  }
}
