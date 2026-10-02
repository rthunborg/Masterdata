import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { verifyIsolationRuntimeImportClosure } from './production-isolation-runtime-import-closure.mjs';
import { inspectForwardSource } from './prepare-forward-subset.mjs';

export const PROTECTED_PRODUCTION_ISOLATION_PACKAGE_KIND = 'offline-protected-production-isolation-package';
export const PROTECTED_PRODUCTION_ISOLATION_SOURCE_FILES = Object.freeze([
  'src/lib/release/production-isolation-host.ps1',
  'src/lib/release/install-protected-production-isolation.ps1',
  'src/lib/release/prepare-protected-production-isolation-package.mjs',
  'src/lib/release/production-isolation-runtime-import-closure.mjs',
  'src/lib/release/production-isolation.md',
  'src/lib/release/protected-production-isolation-host.cs',
  'src/lib/release/protected-production-isolation-core.cs',
  'src/lib/release/protected-file-lease.cs',
  'src/lib/release/protected-production-inputs.cs',
  'src/lib/release/production-isolation-private-runtime.cs',
  'src/lib/release/protected-production-isolation-seal-worker.ps1',
  'src/lib/release/protected-production-isolation-worker.mjs',
  'src/lib/release/production-isolation-module-register.mjs',
  'src/lib/release/production-isolation-module-loader.mjs',
  'src/lib/release/production-isolation-live-adapter.mjs',
  'src/lib/release/production-isolation-prior-state-seal.ps1',
  'src/lib/release/production-isolation-controls.mjs',
  'src/lib/release/production-isolation-probes.mjs',
  'src/lib/release/collect-production-isolation-database.mjs',
  'src/lib/release/production-platform-config.mjs',
  'src/lib/release/production-isolation-gate.mjs',
  'src/lib/release/production-managed-writer-profiles.mjs',
  'src/lib/release/production-collector-source-binding.mjs',
  'src/lib/release/production-observed-profile.mjs',
  'src/lib/release/prepare-forward-subset.mjs',
  'src/lib/release/production-isolation-statement-trigger-inventory.sql',
  'src/lib/release/production-isolation-database-drain.sql',
  'src/lib/release/run-production-isolation-live.mjs',
  'supabase/verify/verify-production-baseline-catalog.mjs',
  'supabase/verify/verify-target-binding.mjs',
  'supabase/verify/production-baseline-catalog.sql',
  'supabase/verify/production-permission-profile.sql',
  'supabase/verify/production-saved-filter-cleanup-prerequisite.sql',
  'supabase/verify/run-reviewed-supabase-cli.mjs',
  'supabase/migration-baseline-manifest.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'src/lib/vendor-patches/exceljs@4.4.0.patch',
]);
export const PROTECTED_PRODUCTION_ISOLATION_RUNTIME_PACKAGES = Object.freeze([
  '@supabase/auth-js', '@supabase/functions-js', '@supabase/postgrest-js',
  '@supabase/realtime-js', '@supabase/storage-js', '@supabase/supabase-js', 'iceberg-js', 'papaparse', 'tslib', 'ws',
]);
const RUNTIME_PACKAGE_VERSIONS = Object.freeze({
  '@supabase/auth-js': '2.93.2', '@supabase/functions-js': '2.93.2', '@supabase/postgrest-js': '2.93.2',
  '@supabase/realtime-js': '2.93.2', '@supabase/storage-js': '2.93.2', '@supabase/supabase-js': '2.93.2',
  'iceberg-js': '0.8.1', papaparse: '5.5.3', tslib: '2.8.1', ws: '8.21.0',
});
const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_RUNTIME_FILES = 512;
const fail = () => { throw new Error('Protected production isolation package preparation failed'); };
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function regular(pathname) {
  const stat = lstatSync(pathname);
  if (!stat.isFile() || stat.isSymbolicLink()) fail();
  return readFileSync(pathname);
}
function noReparseAncestors(pathname) {
  for (let current = path.resolve(pathname);;) {
    if (lstatSync(current).isSymbolicLink()) fail();
    const parent = path.dirname(current); if (parent === current) return; current = parent;
  }
}
function walk(directory, root, files, packageName) {
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(directory) !== directory) fail();
  for (const name of requireDirectoryEntries(directory)) {
    const child = path.join(directory, name); const childStat = lstatSync(child);
    if (childStat.isSymbolicLink()) fail();
    if (childStat.isDirectory()) walk(child, root, files, packageName);
    else if (childStat.isFile()) { const bytes = readFileSync(child); files.push({ path: path.relative(root, child).split(path.sep).join('/'), sha256: hash(bytes) }); }
    else fail();
    if (files.length > MAX_RUNTIME_FILES) fail();
  }
}
function requireDirectoryEntries(directory) {
  // `readdirSync` is reached through the fixed fs namespace rather than a
  // caller callback, so a lease cannot alter traversal semantics.
  return readdirSync(directory).sort();
}

/** Reads the full package directories needed by the reviewed Supabase SDK import closure. */
export function inspectProtectedProductionIsolationRuntimeLease({ runtimeRoot, sourceCommit, sourceTree, sourceManifestSha256, nodeExecutable, expectedNodeSha256 } = {}) {
  try {
  if (!SHA40.test(sourceCommit ?? '') || !SHA40.test(sourceTree ?? '') || !SHA256.test(sourceManifestSha256 ?? '') ||
    typeof runtimeRoot !== 'string' || !path.isAbsolute(runtimeRoot) || typeof nodeExecutable !== 'string' || !path.isAbsolute(nodeExecutable) || !SHA256.test(expectedNodeSha256 ?? '')) fail();
  const root = path.resolve(runtimeRoot); noReparseAncestors(root);
  const node = regular(nodeExecutable); if (hash(node) !== expectedNodeSha256 || realpathSync(nodeExecutable) !== path.resolve(nodeExecutable)) fail();
  const dependencyPackages = []; const files = [];
  for (const name of PROTECTED_PRODUCTION_ISOLATION_RUNTIME_PACKAGES) {
    const packageRoot = path.join(root, 'node_modules', ...name.split('/'));
    noReparseAncestors(packageRoot);
    const packageJson = regular(path.join(packageRoot, 'package.json'));
    const manifest = JSON.parse(packageJson.toString('utf8'));
    if (manifest?.name !== name || manifest.version !== RUNTIME_PACKAGE_VERSIONS[name]) fail();
    const entryPath = typeof manifest.module === 'string' ? manifest.module : manifest.main;
    if (typeof entryPath !== 'string' || entryPath.startsWith('/') || entryPath.includes('..')) fail();
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      if (!PROTECTED_PRODUCTION_ISOLATION_RUNTIME_PACKAGES.includes(dependency) && !dependency.startsWith('@types/')) fail();
    }
    regular(path.join(packageRoot, entryPath));
    dependencyPackages.push({ name, version: manifest.version, packagePath: `node_modules/${name}/package.json`, entryPath: `node_modules/${name}/${entryPath}` });
    walk(packageRoot, root, files, name);
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(files.map((file) => file.path)).size !== files.length || files.length === 0 || files.length > MAX_RUNTIME_FILES) fail();
  verifyIsolationRuntimeImportClosure(root, dependencyPackages, files);
  return Object.freeze({ schemaVersion: 1, kind: 'protected-production-isolation-runtime-lease-inventory', sourceCommit, sourceTree, sourceManifestSha256,
    nodeExecutableSha256: expectedNodeSha256, packageManager: 'pnpm-hoisted-clean-checkout', dependencyPackages: Object.freeze(dependencyPackages.map(Object.freeze)), files: Object.freeze(files.map(Object.freeze)) });
  } catch { fail(); }
}

function inspectSource({ workspace, gitExecutable, expectedGitSha256, expectedSourceCommit }) {
  if (!SHA40.test(expectedSourceCommit ?? '')) fail();
  const inspected = inspectForwardSource({ workspace, commit: expectedSourceCommit, gitExecutable, expectedGitSha256 });
  const { root, git, receipt: forwardReceipt, contents } = inspected;
  const commit = forwardReceipt.sourceCommit;
  const sourceManifestSha256 = forwardReceipt.sourceManifestSha256;
  const sourceTree = forwardReceipt.sourceTree;
  const files = new Map();
  for (const relative of PROTECTED_PRODUCTION_ISOLATION_SOURCE_FILES) {
    const bytes = git(root, ['show', `${commit}:${relative}`]);
    if (!regular(path.join(root, relative)).equals(bytes)) fail();
    files.set(relative, bytes);
  }
  const migrations = git(root, ['ls-tree', '-z', commit, 'supabase/migrations/']).toString('utf8').split('\0').filter(Boolean)
    .map((entry) => /blob ([a-f0-9]{40})\tsupabase\/migrations\/(\d{14}_[a-z0-9_]+\.sql)$/u.exec(entry)).map((match) => {
      if (!match) fail(); const version = match[2].slice(0, 14); const bytes = contents.get(version); if (!Buffer.isBuffer(bytes)) fail(); return { path: `supabase/migrations/${match[2]}`, bytes };
    });
  if (migrations.length !== 69 || new Set(migrations.map((entry) => entry.path)).size !== 69) fail();
  for (const migration of migrations) files.set(migration.path, migration.bytes);
  return { root, sourceCommit: commit, sourceTree, sourceManifestSha256, files };
}

/** Copies approved Node bytes into the review artifact; never executes them or a collector. */
export function prepareProtectedProductionIsolationPackage({ outputDirectory, workspace, runtimeRoot, nodeExecutable, expectedNodeSha256, expectedSourceCommit, gitExecutable, expectedGitSha256 } = {}) {
  try {
    if (typeof outputDirectory !== 'string' || !path.isAbsolute(outputDirectory)) fail();
    const output = path.resolve(outputDirectory); const parent = path.dirname(output);
    noReparseAncestors(parent); if (lstatSync(parent).isSymbolicLink()) fail();
    try { lstatSync(output); fail(); } catch (error) { if (error?.code !== 'ENOENT') fail(); }
    const source = inspectSource({ workspace, gitExecutable, expectedGitSha256, expectedSourceCommit });
    const lease = inspectProtectedProductionIsolationRuntimeLease({ runtimeRoot, sourceCommit: source.sourceCommit, sourceTree: source.sourceTree, sourceManifestSha256: source.sourceManifestSha256, nodeExecutable, expectedNodeSha256 });
    const nodeBytes = regular(nodeExecutable); if (hash(nodeBytes) !== expectedNodeSha256) fail();
    source.files.set('runtime/node.exe', nodeBytes);
    const files = [...source.files].map(([file, bytes]) => ({ path: file, sha256: hash(bytes) }));
    const receipt = { schemaVersion: 1, kind: PROTECTED_PRODUCTION_ISOLATION_PACKAGE_KIND, sourceCommit: source.sourceCommit, sourceTree: source.sourceTree, sourceManifestSha256: source.sourceManifestSha256, files };
    if (!same(Object.keys(receipt).sort(), ['files', 'kind', 'schemaVersion', 'sourceCommit', 'sourceManifestSha256', 'sourceTree'])) fail();
    const manifestBytes = Buffer.from(`${JSON.stringify(receipt)}\n`, 'utf8'); const runtimeBytes = Buffer.from(`${JSON.stringify(lease)}\n`, 'utf8');
    const finalSource = inspectSource({ workspace, gitExecutable, expectedGitSha256, expectedSourceCommit });
    if (finalSource.sourceTree !== source.sourceTree || finalSource.sourceManifestSha256 !== source.sourceManifestSha256) fail();
    mkdirSync(output); for (const [file, bytes] of source.files) { const target = path.join(output, ...file.split('/')); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 }); }
    writeFileSync(path.join(output, 'runtime-lease-inventory.json'), runtimeBytes, { flag: 'wx', mode: 0o600 });
    writeFileSync(path.join(output, 'toolchain-package.json'), manifestBytes, { flag: 'wx', mode: 0o600 });
    return Object.freeze({ receipt: Object.freeze(receipt), packageSha256: hash(manifestBytes), runtimeLeaseInventory: lease, runtimeLeaseSha256: hash(runtimeBytes), outputDirectory: output });
  } catch { fail(); }
}
