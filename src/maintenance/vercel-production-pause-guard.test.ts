import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertNextBuildAllowed } from './production-pause-next-build-policy.mjs';

const script = resolve(process.cwd(), 'src/maintenance/vercel-production-pause-guard.mjs');

function run(environment: Record<string, string | undefined>, cwd = process.cwd()) {
  return spawnSync(process.execPath, [script], {
    cwd,
    env: { PATH: process.env.PATH, ...environment },
    encoding: 'utf8',
  });
}

describe('Vercel production-pause ignore command', () => {
  it('rejects blank reopening records through both build entrypoints', () => {
    const root = resolve(process.cwd(), 'output/production-pause-blank-decision-test');
    const directory = resolve(root, 'src/maintenance');
    const env = { VERCEL: '1', VERCEL_ENV: 'production' };
    try {
      mkdirSync(directory, { recursive: true });
      for (const reopeningDecision of ['', ' ', '\t', '\u00a0', ' \t\u00a0 ']) {
        writeFileSync(resolve(directory, 'production-pause-lock.json'), JSON.stringify({
          version: 1, state: 'reopening-authorized', purpose: 'owner approval required', reopeningDecision,
        }));
        expect(run(env, root).status, JSON.stringify(reopeningDecision)).toBe(0);
        expect(() => assertNextBuildAllowed(env, root)).toThrow(/authorization record/i);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows named custom previews through both the ignore command and active Next config', () => {
    for (const target of ['staging', 'qa-preview']) {
      const env = { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: target };
      expect(run(env).status, target).toBe(1);
      expect(() => assertNextBuildAllowed(env), target).not.toThrow();
      const config = spawnSync(process.execPath, ['--input-type=module', '--eval', "import './next.config.mjs'"], {
        cwd: process.cwd(), env: { PATH: process.env.PATH, ...env }, encoding: 'utf8',
      });
      expect(config.status, `${target}: ${config.stderr}`).toBe(0);
    }
  });

  it('keeps production, incomplete markers and conflicting built-in targets closed', () => {
    for (const [deployment, target] of [
      ['production', 'staging'], ['preview', 'production'],
      ['preview', 'development'], ['development', 'staging'],
      [undefined, 'staging'], [undefined, 'preview'], ['staging', 'staging'],
      ['preview', ''], ['preview', 'production '], ['preview', 'Production'],
    ]) {
      const env = { VERCEL: '1', VERCEL_ENV: deployment, VERCEL_TARGET_ENV: target };
      const label = `${deployment}/${target}`;
      expect(run(env).status, label).toBe(0);
      expect(() => assertNextBuildAllowed(env), label).toThrow();
    }
  });

  it('ignores paused production builds but continues preview builds', () => {
    expect(run({ VERCEL: '1', VERCEL_ENV: 'production' }).status).toBe(0);
    expect(run({ VERCEL: '1', VERCEL_ENV: 'preview' }).status).toBe(1);
    expect(run({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'production' }).status).toBe(0);
  });

  it('fails closed by ignoring missing and ambiguous Vercel target markers', () => {
    expect(run({ VERCEL: '1' }).status).toBe(0);
    expect(run({ VERCEL_ENV: 'preview' }).status).toBe(0);
    expect(run({ VERCEL: '0', VERCEL_ENV: 'preview' }).status).toBe(0);
    expect(run({ VERCEL: '1', VERCEL_ENV: 'production ' }).status).toBe(0);
    expect(run({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_URL: 'untrusted' }).status).toBe(0);
  });
});

describe('active Next.js config production guard', () => {
  it('rejects a direct production app build before Next.js can compile', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', "import './next.config.mjs'"], {
      cwd: process.cwd(),
      env: { PATH: process.env.PATH, VERCEL: '1', VERCEL_ENV: 'production' },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain('Production application build refused');
  });
});
