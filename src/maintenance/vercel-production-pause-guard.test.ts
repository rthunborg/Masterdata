import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const script = 'src/maintenance/vercel-production-pause-guard.mjs';

function run(environment: Record<string, string | undefined>) {
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: { PATH: process.env.PATH, ...environment },
    encoding: 'utf8',
  });
}

describe('Vercel production-pause ignore command', () => {
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
