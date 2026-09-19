import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prepareForwardSubset,
  verifyForwardSubset,
} from '../../../../src/lib/release/prepare-forward-subset.mjs';

const gitExecutable =
  process.platform === 'win32'
    ? 'C:/Program Files/Git/cmd/git.exe'
    : '/usr/bin/git';
const expectedGitSha256 = createHash('sha256')
  .update(readFileSync(gitExecutable))
  .digest('hex');
afterEach(() => vi.unstubAllEnvs());
let root: string, workspace: string, destination: string, commit: string;
const versions = ['20260314000001', '20260314000002'];
const names = versions.map((v) => v + '_forward.sql');
function git(...args: string[]) {
  const result = spawnSync(gitExecutable, ['-C', workspace, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('fixture git failed');
  return result.stdout.trim();
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
  return { workspace, commit, destination, gitExecutable, expectedGitSha256 };
}
function manifestChange(
  change: (m: {
    repositoryMigrationCount: number;
    reviewedSupabaseCliVersion: string;
    classifications: { execute: string[] };
    orderedPrerequisites: { beforeVersion: string }[];
  }) => void
) {
  const file = path.join(
    workspace,
    'supabase/migration-baseline-manifest.json'
  );
  const value = JSON.parse(readFileSync(file, 'utf8'));
  change(value);
  writeFileSync(file, JSON.stringify(value));
  record();
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'hr-forward-subset-test-'));
  workspace = path.join(root, 'source');
  destination = path.join(root, 'subset');
  mkdirSync(path.join(workspace, 'supabase/migrations'), { recursive: true });
  git('init', '-q');
  git('config', 'core.autocrlf', 'false');
  writeFileSync(
    path.join(workspace, '.gitignore'),
    'node_modules/\nignored.sql\n'
  );
  writeFileSync(
    path.join(workspace, 'supabase/migrations/20250113000000_unsafe.sql'),
    '-- must never enter subset\n'
  );
  names.forEach((name, i) =>
    writeFileSync(
      path.join(workspace, 'supabase/migrations', name),
      '-- unchanged source\nSELECT ' + i + ';\n'
    )
  );
  writeFileSync(
    path.join(workspace, 'supabase/migration-baseline-manifest.json'),
    JSON.stringify({
      schemaVersion: 1,
      repositoryMigrationCount: 3,
      reviewedSupabaseCliVersion: '2.115.0',
      classifications: {
        'repair-after-catalog-proof': ['20250113000000'],
        execute: versions,
      },
      environmentPlans: {
        production: {
          'repair-after-catalog-proof':
            'classifications.repair-after-catalog-proof',
          execute: 'classifications.execute',
        },
      },
      orderedPrerequisites: [
        { version: versions[0], beforeVersion: versions[1] },
      ],
    })
  );
  record();
});

describe('offline immutable forward subset', () => {
  it('rejects a relative Git path or mismatched Git pin before creating output', () => {
    expect(() =>
      prepareForwardSubset({ ...options(), gitExecutable: 'git' })
    ).toThrow();
    expect(() =>
      prepareForwardSubset({ ...options(), expectedGitSha256: '0'.repeat(64) })
    ).toThrow();
    expect(readdirSync(root)).toEqual(['source']);
  });
  it('ignores a hostile PATH and global ignore configuration', () => {
    const fake = path.join(root, 'fake');
    mkdirSync(fake);
    writeFileSync(path.join(fake, 'git'), '#!/bin/sh\nexit 91\n', {
      mode: 0o755,
    });
    writeFileSync(path.join(fake, 'git.cmd'), '@exit /b 91\r\n');
    vi.stubEnv('PATH', fake);
    vi.stubEnv('Path', fake);
    vi.stubEnv('GIT_CONFIG_GLOBAL', path.join(root, 'hostile-config'));
    writeFileSync(
      path.join(root, 'hostile-config'),
      '[core]\n excludesFile = ' +
        path.join(root, 'ignore').replaceAll('\\', '/') +
        '\n'
    );
    writeFileSync(path.join(root, 'ignore'), 'hidden.txt\n');
    expect(prepareForwardSubset(options()).migrations).toHaveLength(2);
    writeFileSync(path.join(workspace, 'hidden.txt'), 'must detect');
    expect(() => verifyForwardSubset(options())).toThrow();
  });
  it.each(['direct', 'included'])(
    'rejects %s repository-local filter drivers before inspecting source dirt',
    (kind) => {
      if (kind === 'included') {
        const config = path.join(workspace, '.git', 'filter-config');
        writeFileSync(
          config,
          '[filter "untrusted"]\nclean = untrusted-clean-filter\n'
        );
        git('config', 'include.path', config);
      } else {
        git('config', 'filter.untrusted.clean', 'untrusted-clean-filter');
      }
      expect(() => prepareForwardSubset(options())).toThrow();
      expect(readdirSync(root)).toEqual(['source']);
    }
  );
  it('ignores replacement commits and rejects their substituted checkout bytes', () => {
    const original = commit;
    writeFileSync(
      path.join(workspace, 'supabase/migrations', names[0]),
      '-- replacement content\n'
    );
    record();
    const replacement = commit;
    git('replace', original, replacement);
    git('reset', '--hard', original);
    commit = original;
    expect(() => prepareForwardSubset(options())).toThrow();
    expect(readdirSync(root)).toEqual(['source']);
    git('--no-replace-objects', 'reset', '--hard', original);
    const receipt = prepareForwardSubset(options());
    expect(receipt.sourceCommit).toBe(original);
    expect(receipt.sourceTree).toBe(
      git('--no-replace-objects', 'rev-parse', original + '^{tree}')
    );
    expect(
      readFileSync(
        path.join(destination, 'supabase/migrations', names[0]),
        'utf8'
      )
    ).toBe('-- unchanged source\nSELECT 0;\n');
  });
  it('forbids private CLI links and environment files in a source-only artifact', () => {
    const receipt = prepareForwardSubset(options());
    expect(receipt.privateMaterialAllowed).toBe(false);
    mkdirSync(path.join(destination, 'supabase/.temp'));
    writeFileSync(
      path.join(destination, 'supabase/.temp/project-ref'),
      'synthetic-private'
    );
    expect(() => verifyForwardSubset(options())).toThrow();
  });
  it('copies only execute Git bytes with independent source/tree/blob/digest evidence', () => {
    const receipt = prepareForwardSubset(options());
    expect(receipt.executable).toBe(false);
    expect(receipt.approvalAttested).toBe(false);
    expect(receipt.gitExecutableSha256).toBe(expectedGitSha256);
    expect(receipt.sourceCommit).toBe(commit);
    expect(receipt.sourceTree).toBe(git('rev-parse', 'HEAD^{tree}'));
    expect(
      receipt.migrations.map((m: { version: string }) => m.version)
    ).toEqual(versions);
    expect(
      readdirSync(path.join(destination, 'supabase/migrations')).sort()
    ).toEqual(names);
    for (const entry of receipt.migrations) {
      expect(entry.gitBlob).toBe(
        git('rev-parse', commit + ':supabase/migrations/' + entry.file)
      );
      expect(
        readFileSync(path.join(destination, 'supabase/migrations', entry.file))
      ).toEqual(
        readFileSync(path.join(workspace, 'supabase/migrations', entry.file))
      );
    }
    expect(verifyForwardSubset(options())).toEqual(receipt);
    expect(git('status', '--porcelain')).toBe('');
  });
  it.each(['HEAD', 'main', '0'.repeat(40), '--help'])(
    'rejects unpinned or wrong source identity %s',
    (value) => {
      expect(() =>
        prepareForwardSubset({ ...options(), commit: value })
      ).toThrow();
      expect(readdirSync(root)).toEqual(['source']);
    }
  );
  it.each(['tracked', 'untracked', 'staged'])(
    'rejects %s source changes before output creation',
    (kind) => {
      const file =
        kind === 'untracked'
          ? 'unexpected.txt'
          : 'supabase/migrations/' + names[0];
      writeFileSync(path.join(workspace, file), 'changed');
      if (kind === 'staged') git('add', '.');
      expect(() => prepareForwardSubset(options())).toThrow();
      expect(readdirSync(root)).toEqual(['source']);
    }
  );
  it('rejects ignored extra migration files', () => {
    writeFileSync(
      path.join(workspace, 'supabase/migrations/ignored.sql'),
      'SELECT 42;'
    );
    expect(() => prepareForwardSubset(options())).toThrow();
  });
  it('rejects missing checkout bytes even with skip-worktree', () => {
    git('update-index', '--skip-worktree', 'supabase/migrations/' + names[0]);
    unlinkSync(path.join(workspace, 'supabase/migrations', names[0]));
    expect(() => prepareForwardSubset(options())).toThrow();
  });
  it('rejects byte changes hidden by assume-unchanged', () => {
    git(
      'update-index',
      '--assume-unchanged',
      'supabase/migrations/' + names[0]
    );
    writeFileSync(
      path.join(workspace, 'supabase/migrations', names[0]),
      'SELECT 123;'
    );
    expect(() => prepareForwardSubset(options())).toThrow();
  });
  it.each(['overlap', 'order', 'count', 'version', 'prerequisite'])(
    'rejects invalid %s in committed classification',
    (kind) => {
      manifestChange((m) => {
        if (kind === 'overlap')
          m.classifications.execute.push('20250113000000');
        if (kind === 'order') m.classifications.execute.reverse();
        if (kind === 'count') m.repositoryMigrationCount++;
        if (kind === 'version') m.reviewedSupabaseCliVersion = 'latest';
        if (kind === 'prerequisite')
          m.orderedPrerequisites[0].beforeVersion = '20990101000000';
      });
      expect(() => prepareForwardSubset(options())).toThrow();
    }
  );
  it('does not overwrite an existing output', () => {
    mkdirSync(destination);
    writeFileSync(path.join(destination, 'sentinel'), 'preserve');
    expect(() => prepareForwardSubset(options())).toThrow();
    expect(readFileSync(path.join(destination, 'sentinel'), 'utf8')).toBe(
      'preserve'
    );
  });
  it('rejects an output inside source', () => {
    expect(() =>
      prepareForwardSubset({
        ...options(),
        destination: path.join(workspace, 'output'),
      })
    ).toThrow();
  });
  it.each([
    'extra',
    'missing',
    'bytes',
    'reordered',
    'foreignSource',
    'enabled',
  ])('rejects altered artifact: %s', (kind) => {
    prepareForwardSubset(options());
    const file = path.join(destination, 'forward-subset.json');
    const receipt = JSON.parse(readFileSync(file, 'utf8'));
    if (kind === 'extra')
      writeFileSync(
        path.join(destination, 'supabase/config.toml'),
        "project_id='other'"
      );
    if (kind === 'missing')
      unlinkSync(path.join(destination, 'supabase/migrations', names[0]));
    if (kind === 'bytes')
      writeFileSync(
        path.join(destination, 'supabase/migrations', names[0]),
        'SELECT 999;'
      );
    if (kind === 'reordered') receipt.migrations.reverse();
    if (kind === 'foreignSource') receipt.sourceCommit = '0'.repeat(40);
    if (kind === 'enabled') receipt.executable = true;
    writeFileSync(file, JSON.stringify(receipt));
    expect(() => verifyForwardSubset(options())).toThrow();
  });
  it('rejects a junction masquerading as artifact root', () => {
    const target = path.join(root, 'real');
    mkdirSync(target);
    symlinkSync(
      target,
      destination,
      process.platform === 'win32' ? 'junction' : 'dir'
    );
    expect(() => verifyForwardSubset(options())).toThrow();
  });
});
