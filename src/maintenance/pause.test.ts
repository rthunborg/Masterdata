import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import config from './output-config.json';
import { assertNextBuildAllowed, readPausedLock } from './production-pause-next-build-policy.mjs';
import { buildPauseArtifact, relativePathSegments } from './build.mjs';

const root = process.cwd();
const source = resolve(root, 'src/maintenance');
const output = resolve(root, 'output/production-pause-vitest');
const defaultOutput = resolve(root, 'output/production-pause');

type PauseRequest = { method: string; pathname: string; filesystem?: 'hit' | 'miss' };

/**
 * A deliberately local contract evaluator for the checked-in Build Output routes.
 * It is not an HTTP-server or Vercel-runtime substitute; hosted response checks
 * remain a separate deployment gate.
 */
function evaluateConfiguredPauseRoute({ method, pathname, filesystem = 'miss' }: PauseRequest) {
  for (const route of config.routes) {
    if ('handle' in route) {
      if (route.handle === 'filesystem' && filesystem === 'hit') {
        return { status: 200, body: 'static-file' };
      }
      continue;
    }

    if (!new RegExp(`^${route.src}$`).test(pathname)) continue;
    if (route.methods && !route.methods.includes(method.toUpperCase())) continue;
    if (route.continue) continue;

    return { status: route.status ?? 200, body: route.dest ?? 'route' };
  }

  throw new Error(`No configured route matched ${method} ${pathname}`);
}

afterEach(() => {
  rmSync(output, { recursive: true, force: true });
  rmSync(defaultOutput, { recursive: true, force: true });
});

describe('standalone production pause', () => {
  it('shows the notice and contact details without executable application content', () => {
    const document = new DOMParser().parseFromString(readFileSync(resolve(source, 'index.html'), 'utf8'), 'text/html');
    expect(document.title).toBe('Stena Season');
    expect(document.querySelector('h1')?.textContent).toMatch(/Taking a break\s*until further notice\./);
    expect(document.querySelector('footer')?.textContent).toContain('Enhancior AB');
    expect(document.querySelector('.email')?.getAttribute('href')).toBe('mailto:rasmus.thunborg@enhancior.se');
    expect(document.querySelectorAll('script, form, iframe')).toHaveLength(0);
  });

  it('blocks all APIs before static files and blocks mutation requests everywhere', () => {
    const api = config.routes[1];
    expect(new RegExp(`^${api.src}$`).test('/api/cron/omc-masterdata-reminder')).toBe(true);
    expect(new RegExp(`^${api.src}$`).test('/api/cron/pe3-deadline-notifications')).toBe(true);
    expect(api.status).toBe(503);
    expect(api.dest).toBe('/unavailable.json');
    expect(config.crons).toEqual([]);
    expect(config.routes[2].methods).toEqual(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    expect(config.routes.at(-1)?.dest).toBe('/index.html');
    expect(config.routes[0].headers?.['Cache-Control']).toBe('no-store');
    const rootConfig = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
    expect(rootConfig.crons).toEqual([]);
    expect(rootConfig.ignoreCommand).toContain('vercel-production-pause-guard.mjs');
  });

  it('builds a fresh exact static tree with no functions or Vercel linkage metadata', () => {
    mkdirSync(resolve(output, '.vercel/output/functions'), { recursive: true });
    writeFileSync(resolve(output, '.vercel/output/functions/stale.func'), 'stale');
    writeFileSync(resolve(output, '.vercel/project.json'), 'stale');

    expect(buildPauseArtifact('output/production-pause-vitest')).toBe(output);
    expect(existsSync(resolve(output, '.vercel/output/functions'))).toBe(false);
    expect(existsSync(resolve(output, '.vercel/project.json'))).toBe(false);
    expect(JSON.parse(readFileSync(resolve(output, '.vercel/output/config.json'), 'utf8')).crons).toEqual([]);
    expect(JSON.parse(readFileSync(resolve(output, 'vercel.json'), 'utf8')).crons).toEqual([]);
    expect(existsSync(resolve(output, 'deployment-state.json'))).toBe(false);
  });

  it('builds successfully to the Windows default output directory', () => {
    expect(buildPauseArtifact()).toBe(defaultOutput);
    expect(existsSync(resolve(defaultOutput, '.vercel/output/static/index.html'))).toBe(true);
  });

  it('preserves path-segment casing for filesystem ancestor checks', () => {
    expect(relativePathSegments('Output/production-pause')).toEqual(['Output', 'production-pause']);

    if (process.platform !== 'win32') {
      expect(() => buildPauseArtifact('Output/production-pause')).toThrow(/must stay in this checkout/i);
    }
  });

  it('ignores every allowed generated production-pause artifact variant', () => {
    for (const path of [
      'output/production-pause/vercel.json',
      'output/production-pause/.vercel/output/config.json',
      'output/production-pause-reviewbot/vercel.json',
      'output/production-pause-reviewbot/.vercel/output/static/index.html',
    ]) {
      const result = spawnSync('git', ['check-ignore', '-q', '--', path], { cwd: root });
      expect(result.status, `${path} must be ignored`).toBe(0);
    }
  });

  it('refuses generated output outside this checkout production-pause directory', () => {
    expect(() => buildPauseArtifact('output/not-pause')).toThrow(/must stay in this checkout/i);
  });

  it.each([
    ['GET', '/api'],
    ['GET', '/api/cron/omc-masterdata-reminder'],
    ['OPTIONS', '/api/auth/login'],
    ['POST', '/dashboard'],
    ['PUT', '/dashboard'],
    ['PATCH', '/dashboard'],
    ['DELETE', '/dashboard'],
    ['OPTIONS', '/dashboard'],
  ] as const)('routes %s %s to the static 503 response before filesystem handling', (method, pathname) => {
    expect(evaluateConfiguredPauseRoute({ method, pathname })).toEqual({ status: 503, body: '/unavailable.json' });
  });

  it('routes page GET and HEAD requests after a filesystem miss to the pause page', () => {
    expect(evaluateConfiguredPauseRoute({ method: 'GET', pathname: '/an-old-bookmark' })).toEqual({ status: 200, body: '/index.html' });
    expect(evaluateConfiguredPauseRoute({ method: 'HEAD', pathname: '/nested/previous-bookmark' })).toEqual({ status: 200, body: '/index.html' });
  });

  it('allows only an existing static file through the filesystem phase', () => {
    expect(evaluateConfiguredPauseRoute({ method: 'GET', pathname: '/assets/pause.css', filesystem: 'hit' })).toEqual({ status: 200, body: 'static-file' });
  });
});

describe('production pause build policy', () => {
  it('uses a complete committed paused lock', () => {
    expect(readPausedLock(root).state).toBe('paused');
    expect(() => readPausedLock(resolve(root, 'missing-lock-root'))).toThrow(/missing or invalid/i);

    const malformedRoot = resolve(root, 'output/production-pause-lock-test');
    try {
      const directory = resolve(malformedRoot, 'src/maintenance');
      mkdirSync(directory, { recursive: true });
      writeFileSync(resolve(directory, 'production-pause-lock.json'), '{"version":1,"state":"reopening-authorized","purpose":"owner approval required"}');
      expect(() => readPausedLock(malformedRoot)).toThrow(/authorization record/i);
    } finally {
      rmSync(malformedRoot, { recursive: true, force: true });
    }
  });

  it('allows local and Vercel preview builds while rejecting production and ambiguous targets', () => {
    expect(() => assertNextBuildAllowed({})).not.toThrow();
    expect(() => assertNextBuildAllowed({ VERCEL: '1', VERCEL_ENV: 'preview' })).not.toThrow();
    expect(() => assertNextBuildAllowed({ VERCEL: '1', VERCEL_ENV: 'production' })).toThrow(/pause is active/i);
    expect(() => assertNextBuildAllowed({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'production' })).toThrow(/pause is active/i);
    expect(() => assertNextBuildAllowed({ VERCEL_ENV: 'preview' })).toThrow(/runtime marker/i);
    expect(() => assertNextBuildAllowed({ VERCEL: '1' })).toThrow(/target/i);
    expect(() => assertNextBuildAllowed({ VERCEL: '1', VERCEL_ENV: 'production ', CI: 'attacker-value' })).toThrow(/target/i);
    expect(() => assertNextBuildAllowed({ VERCEL: '0', VERCEL_ENV: 'preview' })).toThrow(/runtime marker/i);
  });

  it('allows only the reviewed future reopening state to enable a production build', () => {
    const reopeningRoot = resolve(root, 'output/production-pause-reopen-lock-test');
    try {
      const directory = resolve(reopeningRoot, 'src/maintenance');
      mkdirSync(directory, { recursive: true });
      writeFileSync(resolve(directory, 'production-pause-lock.json'), '{"version":1,"state":"reopening-authorized","purpose":"owner approval required","reopeningDecision":"explicit owner authorization recorded for this release"}');
      expect(() => assertNextBuildAllowed({ VERCEL: '1', VERCEL_ENV: 'production' }, reopeningRoot)).not.toThrow();
    } finally {
      rmSync(reopeningRoot, { recursive: true, force: true });
    }
  });
});
