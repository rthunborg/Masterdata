import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  inspectProtectedRunnerInventory,
  validateProtectedRunnerInventory,
} from '../../../../src/lib/release/protected-runner-inventory.mjs';

const gitExecutable =
  process.platform === 'win32'
    ? 'C:/Program Files/Git/cmd/git.exe'
    : '/usr/bin/git';
const expectedGitSha256 = createHash('sha256')
  .update(readFileSync(gitExecutable))
  .digest('hex');
const papaRoot = path.resolve('node_modules/papaparse');
const repositoryRoot = path.resolve('.');
const integrity =
  'sha512-5QvjGxYVjxO59MGU2lHVYpRWBBtKHnlIAcSe1uNFCkkptUh63NFRj0FJQm7nR67puEruUci/ZkjmEFrjCAyP4A==';

let root: string;
let workspace: string;
let commit: string;

function git(...args: string[]) {
  const result = spawnSync(gitExecutable, ['-C', workspace, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('fixture git failed');
  return result.stdout.trim();
}

function write(relative: string, value: string) {
  const target = path.join(workspace, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, value);
}

function record() {
  git('add', '.');
  git(
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
  commit = git('rev-parse', 'HEAD');
}

function options() {
  return { workspace, commit, gitExecutable, expectedGitSha256 };
}

function worker(dynamic = '../../../supabase/verify/run-reviewed-supabase-cli.mjs') {
  return `import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export async function runAfterHandshake(handshake) {
  if (handshake !== 'accepted') throw new Error('handshake required');
  return [randomBytes, fileURLToPath, import('${dynamic}')];
}
`;
}

function wrapper() {
  return `import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyApprovedSslRootCertificate } from './verify-production-baseline-catalog.mjs';
import { verifyConfiguredSupabaseTarget } from './verify-target-binding.mjs';
export const wrapper = [spawnSync, createHash, readFileSync, realpathSync, path, pathToFileURL, verifyApprovedSslRootCertificate, verifyConfiguredSupabaseTarget];
`;
}

function catalog(extra = '') {
  return `import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Papa from 'papaparse';
import { verifyConfiguredSupabaseTarget } from './verify-target-binding.mjs';
${extra}
export const catalog = [spawnSync, createHash, readFileSync, realpathSync, path, pathToFileURL, Papa, verifyConfiguredSupabaseTarget];
`;
}

function target() {
  return `import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export const target = [readFile, path, pathToFileURL];
`;
}

function installActualClosureSource() {
  const actualManifest = path.join(
    repositoryRoot,
    'supabase/migration-baseline-manifest.json'
  );
  const actualMigrations = path.join(repositoryRoot, 'supabase/migrations');
  copyFileSync(
    actualManifest,
    path.join(workspace, 'supabase/migration-baseline-manifest.json')
  );
  rmSync(path.join(workspace, 'supabase/migrations'), {
    recursive: true,
    force: true,
  });
  mkdirSync(path.join(workspace, 'supabase/migrations'), { recursive: true });
  for (const name of readdirSync(actualMigrations)) {
    write(path.join('supabase/migrations', name), '-- fixture migration\n');
  }
  for (const relative of [
    'src/lib/release/protected-bootstrap-worker.mjs',
    'supabase/verify/run-reviewed-supabase-cli.mjs',
    'supabase/verify/verify-production-baseline-catalog.mjs',
    'supabase/verify/verify-target-binding.mjs',
    'pnpm-lock.yaml',
  ]) {
    copyFileSync(
      path.join(repositoryRoot, relative),
      path.join(workspace, relative)
    );
  }
  record();
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'hr-protected-runner-inventory-'));
  workspace = path.join(root, 'source');
  mkdirSync(workspace, { recursive: true });
  git('init', '-q');
  git('config', 'core.autocrlf', 'false');
  write('.gitignore', 'node_modules/\n');
  write('supabase/migrations/20250113000000_unsafe.sql', '-- unsafe\n');
  write('supabase/migrations/20260314000001_forward.sql', '-- first\n');
  write('supabase/migrations/20260314000002_forward.sql', '-- second\n');
  write(
    'supabase/migration-baseline-manifest.json',
    JSON.stringify({
      schemaVersion: 1,
      repositoryMigrationCount: 3,
      reviewedSupabaseCliVersion: '2.115.0',
      classifications: {
        'repair-after-catalog-proof': ['20250113000000'],
        execute: ['20260314000001', '20260314000002'],
      },
      environmentPlans: {
        production: {
          'repair-after-catalog-proof':
            'classifications.repair-after-catalog-proof',
          execute: 'classifications.execute',
        },
      },
      orderedPrerequisites: [
        { version: '20260314000001', beforeVersion: '20260314000002' },
      ],
    })
  );
  write(
    'pnpm-lock.yaml',
    `lockfileVersion: '9.0'\n\npackages:\n\n  papaparse@5.5.3:\n    resolution: {integrity: ${integrity}}\n`
  );
  write('src/lib/release/protected-bootstrap-worker.mjs', worker());
  write('supabase/verify/run-reviewed-supabase-cli.mjs', wrapper());
  write('supabase/verify/verify-production-baseline-catalog.mjs', catalog());
  write('supabase/verify/verify-target-binding.mjs', target());
  mkdirSync(path.join(workspace, 'node_modules/papaparse'), { recursive: true });
  copyFileSync(
    path.join(papaRoot, 'package.json'),
    path.join(workspace, 'node_modules/papaparse/package.json')
  );
  copyFileSync(
    path.join(papaRoot, 'papaparse.js'),
    path.join(workspace, 'node_modules/papaparse/papaparse.js')
  );
  record();
});

describe('Story 22.15 protected runner inventory', { timeout: 60_000 }, () => {
  it('derives exactly four immutable public modules and one pinned UMD dependency', () => {
    const receipt = inspectProtectedRunnerInventory(options());

    expect(receipt.kind).toBe('offline-protected-runner-inventory');
    expect(receipt.executable).toBe(false);
    expect(receipt.privateMaterialAllowed).toBe(false);
    expect(receipt.approvalAttested).toBe(false);
    expect(receipt.modules.map((entry) => entry.path)).toEqual([
      'src/lib/release/protected-bootstrap-worker.mjs',
      'supabase/verify/run-reviewed-supabase-cli.mjs',
      'supabase/verify/verify-production-baseline-catalog.mjs',
      'supabase/verify/verify-target-binding.mjs',
    ]);
    expect(receipt.modules[0].dynamicImports).toEqual([
      '../../../supabase/verify/run-reviewed-supabase-cli.mjs',
    ]);
    expect(receipt.dependency).toEqual({
      name: 'papaparse',
      version: '5.5.3',
      packagePath: 'node_modules/papaparse/package.json',
      packageJsonSha256:
        '33ffa1b7b9c33ceda14e25fb7d7080098fd258f80b6dea4b37e3de34029b75fd',
      entryPath: 'node_modules/papaparse/papaparse.js',
      entrySha256:
        '10778b8bb3e20177c52febb99e18ec53fd97ce447f4716ca10e00bae18a98594',
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.modules)).toBe(true);
    expect(Object.isFrozen(receipt.modules[0])).toBe(true);
  });

  it('accepts the real four-module graph with the current 68-migration manifest', () => {
    installActualClosureSource();

    const receipt = inspectProtectedRunnerInventory(options());
    expect(receipt.modules).toHaveLength(4);
    expect(receipt.modules[1].staticImports).toContain(
      './verify-production-baseline-catalog.mjs'
    );
  });

  it.each([
    ['a committed missing worker', () => unlinkSync(path.join(workspace, 'src/lib/release/protected-bootstrap-worker.mjs')), true],
    ['uncommitted changed runtime bytes', () => write('supabase/verify/verify-target-binding.mjs', target() + '\n// changed\n'), false],
    ['a committed lockfile with a wrong integrity record', () => write('pnpm-lock.yaml', "lockfileVersion: '9.0'\n"), true],
  ])('rejects %s', (_label, change, commitChange) => {
    change();
    if (commitChange) record();
    expect(() => inspectProtectedRunnerInventory(options())).toThrow();
  });

  it.each([
    ['an unapproved static package', () => write('supabase/verify/verify-production-baseline-catalog.mjs', catalog("import other from 'other';"))],
    ['an unapproved dynamic import', () => write('src/lib/release/protected-bootstrap-worker.mjs', worker('./other.mjs'))],
    ['a CommonJS load', () => write('supabase/verify/verify-target-binding.mjs', target() + "\nrequire('node:fs');\n")],
  ])('rejects a committed module with %s', (_label, change) => {
    change();
    record();
    expect(() => inspectProtectedRunnerInventory(options())).toThrow(
      'Protected runner inventory verification failed'
    );
  });

  it.each([
    ["await import('./unlisted.mjs')"],
    ["await \\u0069mport('./unlisted.mjs')"],
  ])('rejects a dynamic import hidden in template substitution %s', (hidden) => {
    write(
      'src/lib/release/protected-bootstrap-worker.mjs',
      worker() + 'const hidden = `${' + hidden + '}`;\n'
    );
    record();
    expect(() => inspectProtectedRunnerInventory(options())).toThrow(
      'Protected runner inventory verification failed'
    );
  });

  it('rejects modified installed package metadata or UMD bytes despite the matching lockfile', () => {
    writeFileSync(
      path.join(workspace, 'node_modules/papaparse/package.json'),
      '{"name":"papaparse","version":"5.5.3","main":"papaparse.js"}\n'
    );
    expect(() => inspectProtectedRunnerInventory(options())).toThrow(
      'Protected runner inventory verification failed'
    );

    copyFileSync(
      path.join(papaRoot, 'package.json'),
      path.join(workspace, 'node_modules/papaparse/package.json')
    );
    writeFileSync(
      path.join(workspace, 'node_modules/papaparse/papaparse.js'),
      'modified UMD bytes\n'
    );
    expect(() => inspectProtectedRunnerInventory(options())).toThrow(
      'Protected runner inventory verification failed'
    );
  });

  it('rejects caller-supplied receipt modules, authority claims, and extra fields', () => {
    const receipt = JSON.parse(
      JSON.stringify(inspectProtectedRunnerInventory(options()))
    );
    receipt.modules.push({ ...receipt.modules[0] });
    expect(() => validateProtectedRunnerInventory(receipt)).toThrow(
      'Protected runner inventory verification failed'
    );

    const claimed = JSON.parse(
      JSON.stringify(inspectProtectedRunnerInventory(options()))
    );
    claimed.approvalAttested = true;
    expect(() => validateProtectedRunnerInventory(claimed)).toThrow(
      'Protected runner inventory verification failed'
    );

    const expanded = JSON.parse(
      JSON.stringify(inspectProtectedRunnerInventory(options()))
    );
    expanded.targetBound = true;
    expect(() => validateProtectedRunnerInventory(expanded)).toThrow(
      'Protected runner inventory verification failed'
    );
  });
});
