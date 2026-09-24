import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import {
  PROTECTED_DRY_RUN_PACKAGE_FIXED_FILE_PATHS,
  assertCapturedProtectedDryRunPapaBytes,
  prepareProtectedDryRunPackage,
} from '../../../../src/lib/release/prepare-protected-dry-run-package.mjs';
import { assertReviewedModuleImports } from '../../../../src/lib/release/protected-runner-inventory.mjs';
import { PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS } from '../../../../src/lib/release/production-bootstrap-admission.mjs';

const gitExecutable =
  process.platform === 'win32'
    ? 'C:/Program Files/Git/cmd/git.exe'
    : '/usr/bin/git';
const sha256 = (bytes: Buffer | string) =>
  createHash('sha256').update(bytes).digest('hex');
const expectedGitSha256 = sha256(readFileSync(gitExecutable));
const repositoryRoot = path.resolve('.');
const temporaryRoots: string[] = [];

function git(workspace: string, ...args: string[]) {
  const result = spawnSync(gitExecutable, ['-C', workspace, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('git fixture failed');
  return result.stdout.trim();
}

function copy(relative: string, destinationRoot: string) {
  const destination = path.join(destinationRoot, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  const bytes = readFileSync(path.join(repositoryRoot, relative));
  // The production package compares protected source files to their raw Git
  // blobs. This temporary fixture deliberately uses the repository's LF blob
  // representation; installed dependency bytes remain untouched.
  writeFileSync(
    destination,
    relative.startsWith('node_modules/')
      ? bytes
      : Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'), 'utf8')
  );
}

function cleanSource(root: string) {
  const workspace = path.join(root, 'source');
  mkdirSync(workspace);
  git(workspace, 'init', '-q');
  git(workspace, 'config', 'core.autocrlf', 'false');
  for (const relative of [
    'supabase/migration-baseline-manifest.json',
    'pnpm-lock.yaml',
    'node_modules/papaparse/package.json',
    'node_modules/papaparse/papaparse.js',
    // The old worker remains an inspected source dependency of the existing
    // inventory verifier, but is intentionally absent from this package.
    'src/lib/release/protected-bootstrap-worker.mjs',
    ...PROTECTED_DRY_RUN_PACKAGE_FIXED_FILE_PATHS.filter(
      (file) => !file.startsWith('runtime/')
    ),
  ]) {
    copy(relative, workspace);
  }
  for (const entry of readdirSync(path.join(repositoryRoot, 'supabase/migrations'))) {
    copy(path.posix.join('supabase/migrations', entry), workspace);
  }
  git(workspace, 'add', '-f', '.');
  git(
    workspace,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'core.hooksPath=NUL',
    'commit',
    '-qm',
    'fixture'
  );
  return { workspace, commit: git(workspace, 'rev-parse', 'HEAD') };
}

function commit(workspace: string) {
  git(workspace, 'add', '-f', '.');
  git(
    workspace,
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'core.hooksPath=NUL',
    'commit',
    '-qm',
    'changed fixture'
  );
  return git(workspace, 'rev-parse', 'HEAD');
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'hr-protected-dry-run-package-'));
  temporaryRoots.push(root);
  const source = cleanSource(root);
  const runtimes = path.join(root, 'runtimes');
  mkdirSync(runtimes);
  const syntheticNode = path.join(runtimes, 'synthetic-node.exe');
  const syntheticSupabase = path.join(runtimes, 'synthetic-supabase.exe');
  // This builder never starts executable bytes. Synthetic bytes keep the test
  // independent of a developer's local runtime installation.
  writeFileSync(syntheticNode, 'synthetic reviewed node runtime\n');
  writeFileSync(syntheticSupabase, 'synthetic reviewed supabase runtime\n');
  return {
    root,
    outputDirectory: path.join(root, 'package'),
    nodeExecutable: syntheticNode,
    expectedNodeSha256: sha256(readFileSync(syntheticNode)),
    supabaseExecutable: syntheticSupabase,
    expectedSupabaseSha256: sha256(readFileSync(syntheticSupabase)),
    ...source,
    gitExecutable,
    expectedGitSha256,
  };
}

function allFiles(root: string, relative = ''): string[] {
  const directory = path.join(root, relative);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.posix.join(relative.replaceAll('\\', '/'), entry.name);
    return entry.isDirectory() ? allFiles(root, child) : [child];
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Story 22.15 protected production dry-run package', { timeout: 90_000 }, () => {
  it('binds each captured PapaParse byte stream to the pre-read approved dependency receipt', () => {
    const packageJsonBytes = readFileSync(
      path.join(repositoryRoot, 'node_modules/papaparse/package.json')
    );
    const umdBytes = readFileSync(
      path.join(repositoryRoot, 'node_modules/papaparse/papaparse.js')
    );
    const dependency = {
      name: 'papaparse',
      version: '5.5.3',
      packagePath: 'node_modules/papaparse/package.json',
      packageJsonSha256: sha256(packageJsonBytes),
      entryPath: 'node_modules/papaparse/papaparse.js',
      entrySha256: sha256(umdBytes),
    };

    // The dependency can be restored before the final inventory inspection;
    // the bytes captured in the intervening window must still be rejected.
    expect(
      assertCapturedProtectedDryRunPapaBytes({
        dependency,
        packageJsonBytes,
        umdBytes,
      })
    ).toBe(true);
    expect(() =>
      assertCapturedProtectedDryRunPapaBytes({
        dependency,
        packageJsonBytes: Buffer.concat([packageJsonBytes, Buffer.from('swap')]),
        umdBytes,
      })
    ).toThrow('Protected dry-run package preparation failed');
    expect(() =>
      assertCapturedProtectedDryRunPapaBytes({
        dependency,
        packageJsonBytes,
        umdBytes: Buffer.concat([umdBytes, Buffer.from('swap')]),
      })
    ).toThrow('Protected dry-run package preparation failed');
  });

  it('materializes a deterministic, non-executable package from the current immutable source', () => {
    const options = fixture();
    const result = prepareProtectedDryRunPackage(options);
    const manifest = readFileSync(
      path.join(options.outputDirectory, 'toolchain-package.json')
    );

    expect(result.outputDirectory).toBe(options.outputDirectory);
    expect(result.packageSha256).toBe(sha256(manifest));
    expect(JSON.parse(manifest.toString('utf8'))).toEqual(result.receipt);
    expect(result.receipt).toMatchObject({
      schemaVersion: 1,
      kind: 'offline-protected-dry-run-package',
      executable: false,
      privateMaterialAllowed: false,
      approvalAttested: false,
      sourceCommit: options.commit,
    });
    expect(result.receipt.plan.map((entry) => entry.version)).toEqual(
      PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS
    );
    expect(result.receipt.files.map((entry) => entry.path)).toEqual([
      ...PROTECTED_DRY_RUN_PACKAGE_FIXED_FILE_PATHS,
      ...result.receipt.plan.map(
        (entry) => `supabase/migrations/${entry.file}`
      ),
    ]);
    expect(allFiles(options.outputDirectory).sort()).toEqual([
      ...PROTECTED_DRY_RUN_PACKAGE_FIXED_FILE_PATHS,
      ...result.receipt.plan.map(
        (entry) => `supabase/migrations/${entry.file}`
      ),
      'toolchain-package.json',
    ].sort());

    for (const file of result.receipt.files) {
      expect(
        sha256(readFileSync(path.join(options.outputDirectory, ...file.path.split('/'))))
      ).toBe(file.sha256);
    }
  }, 180_000);

  it('produces the same receipt and raw package digest for identical immutable inputs', () => {
    const first = fixture();
    const second = { ...first, outputDirectory: path.join(first.root, 'second') };

    const one = prepareProtectedDryRunPackage(first);
    const two = prepareProtectedDryRunPackage(second);

    expect(two.receipt).toEqual(one.receipt);
    expect(two.packageSha256).toBe(one.packageSha256);
  }, 180_000);

  it.each([
    ['the Node runtime hash', (options: ReturnType<typeof fixture>) => ({ ...options, expectedNodeSha256: '0'.repeat(64) })],
    ['the Supabase runtime hash', (options: ReturnType<typeof fixture>) => ({ ...options, expectedSupabaseSha256: '0'.repeat(64) })],
    ['a relative runtime path', (options: ReturnType<typeof fixture>) => ({ ...options, nodeExecutable: path.basename(options.nodeExecutable) })],
  ])('rejects %s before materializing the package', (_label, alter) => {
    const options = fixture();
    expect(() => prepareProtectedDryRunPackage(alter(options))).toThrow(
      'Protected dry-run package preparation failed'
    );
    expect(() => readdirSync(options.outputDirectory)).toThrow();
  });

  it('never overwrites an existing package directory', () => {
    const options = fixture();
    mkdirSync(options.outputDirectory);
    writeFileSync(path.join(options.outputDirectory, 'owner-file.txt'), 'retain');

    expect(() => prepareProtectedDryRunPackage(options)).toThrow(
      'Protected dry-run package preparation failed'
    );
    expect(readFileSync(path.join(options.outputDirectory, 'owner-file.txt'), 'utf8')).toBe(
      'retain'
    );
  });

  it('rejects a source identity that is not the checked-out clean commit', () => {
    const options = fixture();
    expect(() =>
      prepareProtectedDryRunPackage({
        ...options,
        commit: '0'.repeat(40),
      })
    ).toThrow('Protected dry-run package preparation failed');
    expect(() => readdirSync(options.outputDirectory)).toThrow();
  });

  it('rejects a committed dry-run worker with an unapproved dependency', () => {
    const options = fixture();
    const worker = path.join(
      options.workspace,
      'src/lib/release/protected-dry-run-worker.mjs'
    );
    writeFileSync(worker, readFileSync(worker, 'utf8') + "\nimport extra from 'unapproved-package';\n");
    options.commit = commit(options.workspace);

    expect(() => prepareProtectedDryRunPackage(options)).toThrow(
      'Protected dry-run package preparation failed'
    );
    expect(() => readdirSync(options.outputDirectory)).toThrow();
  });

  it.each([
    ["a computed import", "const hidden = import('./unapproved.mjs');"],
    ["a side-effect import", "import 'unapproved-package';"],
    ["a comment-hidden re-export", "export { /* } */ value } from './unapproved.mjs';"],
  ])('the reviewed import scanner refuses %s outside the package closure', (_label, source) => {
    expect(() =>
      assertReviewedModuleImports(source, {
        staticImports: [],
        dynamicImports: [],
      })
    ).toThrow();
  });
});
