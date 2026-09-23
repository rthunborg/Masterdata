import { createHash } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { inspectForwardSource } from './prepare-forward-subset.mjs';
import {
  assertReviewedModuleImports,
  inspectProtectedRunnerInventory,
} from './protected-runner-inventory.mjs';

const SHA256 = /^[a-f0-9]{64}$/u;
const PACKAGE_KIND = 'offline-protected-dry-run-package';
export const PROTECTED_DRY_RUN_PACKAGE_SOURCE_FILES = Object.freeze([
  'src/lib/release/protected-file-lease.cs',
  'src/lib/release/protected-dry-run-host.cs',
  'src/lib/release/protected-dry-run-worker.mjs',
  'src/lib/release/protected-production-inputs.cs',
  'src/lib/release/production-bootstrap-admission.mjs',
  'supabase/verify/run-reviewed-supabase-cli.mjs',
  'supabase/verify/verify-production-baseline-catalog.mjs',
  'supabase/verify/verify-target-binding.mjs',
  'node_modules/papaparse/package.json',
  'node_modules/papaparse/papaparse.js',
  'supabase/migration-baseline-manifest.json',
]);
export const PROTECTED_DRY_RUN_PACKAGE_FIXED_FILE_PATHS = Object.freeze([
  'runtime/node.exe',
  'runtime/supabase.exe',
  ...PROTECTED_DRY_RUN_PACKAGE_SOURCE_FILES,
]);
const RECEIPT_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'executable',
  'privateMaterialAllowed',
  'approvalAttested',
  'sourceCommit',
  'sourceTree',
  'sourceManifestSha256',
  'plan',
  'files',
]);
const DRY_RUN_WORKER_STATIC_IMPORTS = Object.freeze([
  'node:crypto',
  'node:fs',
  'node:child_process',
  'node:path',
  'node:url',
]);
const DRY_RUN_WORKER_DYNAMIC_IMPORTS = Object.freeze([
  './production-bootstrap-admission.mjs',
  '../../../supabase/verify/run-reviewed-supabase-cli.mjs',
]);
const ADMISSION_STATIC_IMPORTS = Object.freeze(['node:crypto']);

const fail = () => {
  throw new Error('Protected dry-run package preparation failed');
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * Binds bytes retained for materialization to the exact dependency receipt
 * captured before they were read. A later receipt cannot prove that a
 * transient replacement was not retained.
 */
export function assertCapturedProtectedDryRunPapaBytes({
  dependency,
  packageJsonBytes,
  umdBytes,
} = {}) {
  if (
    !dependency ||
    typeof dependency !== 'object' ||
    dependency.name !== 'papaparse' ||
    dependency.version !== '5.5.3' ||
    dependency.packagePath !== 'node_modules/papaparse/package.json' ||
    dependency.entryPath !== 'node_modules/papaparse/papaparse.js' ||
    !SHA256.test(dependency.packageJsonSha256 ?? '') ||
    !SHA256.test(dependency.entrySha256 ?? '') ||
    !Buffer.isBuffer(packageJsonBytes) ||
    !Buffer.isBuffer(umdBytes) ||
    sha256(packageJsonBytes) !== dependency.packageJsonSha256 ||
    sha256(umdBytes) !== dependency.entrySha256
  ) {
    fail();
  }
  return true;
}

function regularFile(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail();
  return readFileSync(file);
}

function assertAbsoluteRegularFile(file, expectedHash) {
  if (
    typeof file !== 'string' ||
    !path.isAbsolute(file) ||
    typeof expectedHash !== 'string' ||
    !SHA256.test(expectedHash)
  ) {
    fail();
  }
  const resolved = realpathSync(file);
  if (resolved !== path.resolve(file)) fail();
  const bytes = regularFile(resolved);
  if (sha256(bytes) !== expectedHash) fail();
  return bytes;
}

function assertNoReparseAncestors(file) {
  let current = path.resolve(file);
  while (true) {
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) fail();
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function assertOutputDirectory(outputDirectory) {
  if (typeof outputDirectory !== 'string' || !path.isAbsolute(outputDirectory)) {
    fail();
  }
  const output = path.resolve(outputDirectory);
  if (path.basename(output) === '.' || path.basename(output) === path.parse(output).root) {
    fail();
  }
  try {
    lstatSync(output);
    fail();
  } catch (error) {
    if (!(error && error.code === 'ENOENT')) fail();
  }
  const parent = path.dirname(output);
  assertNoReparseAncestors(parent);
  const parentStat = lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) fail();
  if (realpathSync(parent) !== parent) fail();
  return output;
}

function sourceBytes({ root, git, receipt }, relative) {
  if (!PROTECTED_DRY_RUN_PACKAGE_SOURCE_FILES.includes(relative)) fail();
  // PapaParse is an installed, hash-pinned dependency rather than a Git blob.
  // inspectProtectedRunnerInventory validates its exact installed bytes before
  // this read and again during the final source revalidation.
  if (relative.startsWith('node_modules/papaparse/')) {
    return regularFile(path.join(root, relative));
  }
  const bytes = git(root, ['show', `${receipt.sourceCommit}:${relative}`]);
  if (!regularFile(path.join(root, relative)).equals(bytes)) fail();
  return bytes;
}

function assertExactModuleReferences(bytes, staticImports, dynamicImports) {
  let source;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail();
  }
  // Reuse the existing reviewed lexer: it rejects computed imports,
  // side-effect imports outside the fixed list, and comment/template-hidden
  // re-exports instead of treating a regular-expression match as proof.
  assertReviewedModuleImports(source, { staticImports, dynamicImports });
}

function assertDryRunModuleClosure(bytesByPath) {
  assertExactModuleReferences(
    bytesByPath.get('src/lib/release/protected-dry-run-worker.mjs'),
    DRY_RUN_WORKER_STATIC_IMPORTS,
    DRY_RUN_WORKER_DYNAMIC_IMPORTS
  );
  assertExactModuleReferences(
    bytesByPath.get('src/lib/release/production-bootstrap-admission.mjs'),
    ADMISSION_STATIC_IMPORTS,
    []
  );
}

function assertInventoryMatchesSource(inventory, source) {
  if (
    inventory.sourceCommit !== source.receipt.sourceCommit ||
    inventory.sourceTree !== source.receipt.sourceTree ||
    inventory.sourceManifestSha256 !== source.receipt.sourceManifestSha256
  ) {
    fail();
  }
  const expectedModules = [
    'src/lib/release/protected-bootstrap-worker.mjs',
    'supabase/verify/run-reviewed-supabase-cli.mjs',
    'supabase/verify/verify-production-baseline-catalog.mjs',
    'supabase/verify/verify-target-binding.mjs',
  ];
  if (
    !same(
      inventory.modules.map((entry) => entry.path),
      expectedModules
    ) ||
    inventory.dependency.packagePath !== 'node_modules/papaparse/package.json' ||
    inventory.dependency.entryPath !== 'node_modules/papaparse/papaparse.js'
  ) {
    fail();
  }
}

function planFrom(source) {
  const plan = source.receipt.migrations.map((entry) => ({ ...entry }));
  if (plan.length !== 13 || new Set(plan.map((entry) => entry.version)).size !== 13) {
    fail();
  }
  return plan;
}

function makeReceipt(source, plan, files) {
  const receipt = {
    schemaVersion: 1,
    kind: PACKAGE_KIND,
    executable: false,
    privateMaterialAllowed: false,
    approvalAttested: false,
    sourceCommit: source.receipt.sourceCommit,
    sourceTree: source.receipt.sourceTree,
    sourceManifestSha256: source.receipt.sourceManifestSha256,
    plan,
    files: files.map(({ path: file, sha256: hash }) => ({ path: file, sha256: hash })),
  };
  if (!same(Object.keys(receipt).sort(), [...RECEIPT_KEYS].sort())) fail();
  return receipt;
}

function createDirectories(output) {
  for (const relative of [
    'runtime',
    'src',
    'src/lib',
    'src/lib/release',
    'supabase',
    'supabase/verify',
    'supabase/migrations',
    'node_modules',
    'node_modules/papaparse',
  ]) {
    const directory = path.join(output, relative);
    mkdirSync(directory);
    const stat = lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail();
  }
}

/**
 * Materializes a non-executable, source-bound package for the later protected
 * production dry-run bootstrap. The package contains no target material or
 * private inputs, and its digest is an external review input rather than an
 * approval claim.
 */
function prepareProtectedDryRunPackageInternal({
  outputDirectory,
  nodeExecutable,
  expectedNodeSha256,
  supabaseExecutable,
  expectedSupabaseSha256,
  ...sourceOptions
} = {}) {
  const output = assertOutputDirectory(outputDirectory);
  // Reject caller-controlled runtime identity failures without touching the
  // source checkout or creating a package directory.
  const nodeBytes = assertAbsoluteRegularFile(nodeExecutable, expectedNodeSha256);
  const supabaseBytes = assertAbsoluteRegularFile(
    supabaseExecutable,
    expectedSupabaseSha256
  );
  const source = inspectForwardSource(sourceOptions);
  const inventory = inspectProtectedRunnerInventory(sourceOptions);
  assertInventoryMatchesSource(inventory, source);
  const plan = planFrom(source);

  const bytesByPath = new Map([
    ['runtime/node.exe', nodeBytes],
    ['runtime/supabase.exe', supabaseBytes],
  ]);
  for (const relative of PROTECTED_DRY_RUN_PACKAGE_SOURCE_FILES) {
    bytesByPath.set(relative, sourceBytes(source, relative));
  }
  assertCapturedProtectedDryRunPapaBytes({
    dependency: inventory.dependency,
    packageJsonBytes: bytesByPath.get(
      'node_modules/papaparse/package.json'
    ),
    umdBytes: bytesByPath.get('node_modules/papaparse/papaparse.js'),
  });
  for (const entry of plan) {
    const bytes = source.contents.get(entry.version);
    if (!Buffer.isBuffer(bytes) || sha256(bytes) !== entry.sha256) fail();
    bytesByPath.set(path.posix.join('supabase/migrations', entry.file), bytes);
  }
  assertDryRunModuleClosure(bytesByPath);

  const files = [...bytesByPath].map(([file, bytes]) => ({
    path: file,
    sha256: sha256(bytes),
  }));
  const receipt = makeReceipt(source, plan, files);
  const manifestBytes = Buffer.from(`${JSON.stringify(receipt)}\n`, 'utf8');
  const packageSha256 = sha256(manifestBytes);

  // A second clean, source-bound inspection closes the read/materialize race.
  const finalSource = inspectForwardSource(sourceOptions);
  const finalInventory = inspectProtectedRunnerInventory(sourceOptions);
  assertInventoryMatchesSource(finalInventory, finalSource);
  if (
    finalSource.receipt.sourceCommit !== receipt.sourceCommit ||
    finalSource.receipt.sourceTree !== receipt.sourceTree ||
    finalSource.receipt.sourceManifestSha256 !== receipt.sourceManifestSha256 ||
    !same(planFrom(finalSource), plan)
  ) {
    fail();
  }

  mkdirSync(output);
  createDirectories(output);
  for (const entry of files) {
    const bytes = bytesByPath.get(entry.path);
    if (!Buffer.isBuffer(bytes) || sha256(bytes) !== entry.sha256) fail();
    const destination = path.join(output, ...entry.path.split('/'));
    writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
  }
  // Write the self-description last; a partial package is never complete.
  writeFileSync(path.join(output, 'toolchain-package.json'), manifestBytes, {
    flag: 'wx',
    mode: 0o600,
  });

  return Object.freeze({
    receipt: Object.freeze({
      ...receipt,
      plan: Object.freeze(receipt.plan.map((entry) => Object.freeze({ ...entry }))),
      files: Object.freeze(receipt.files.map((entry) => Object.freeze({ ...entry }))),
    }),
    packageSha256,
    outputDirectory: output,
  });
}

export function prepareProtectedDryRunPackage(options = {}) {
  try {
    return prepareProtectedDryRunPackageInternal(options);
  } catch {
    // Source, filesystem and executable diagnostics can include local paths;
    // callers receive only the stable fail-closed package outcome.
    fail();
  }
}
