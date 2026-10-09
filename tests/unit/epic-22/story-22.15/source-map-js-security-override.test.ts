import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve('next/package.json'));
const postcssRequire = createRequire(
  nextRequire.resolve('postcss/package.json')
);
const { SourceMapConsumer } = postcssRequire('source-map-js') as {
  SourceMapConsumer: new (sourceMap: object) => {
    eachMapping(callback: (mapping: Record<string, unknown>) => void): void;
  };
};
const workspacePolicy = readFileSync('pnpm-workspace.yaml', 'utf8');
const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');

function indexedSourceMap(offsetLine: number) {
  return {
    version: 3,
    sections: [
      {
        offset: { line: offsetLine, column: 0 },
        map: {
          version: 3,
          sources: ['source.ts'],
          names: [],
          mappings: 'AAAA',
        },
      },
    ],
  };
}

describe('source-map-js security override', () => {
  it('pins every compatible transitive request to the fixed upstream release', () => {
    expect(workspacePolicy).toMatch(
      /^  source-map-js@<1\.2\.2: 1\.2\.2\r?$/m
    );
    expect(lockfile).toMatch(
      /^  source-map-js@<1\.2\.2: 1\.2\.2\r?$/m
    );
    expect(lockfile).toContain('source-map-js@1.2.2:');
    expect(lockfile).not.toContain('source-map-js@1.2.1:');
    expect(lockfile).not.toContain('source-map-js: 1.2.1');
  });

  it('resolves Next through PostCSS to the fixed source-map-js package', () => {
    const manifest = postcssRequire('source-map-js/package.json') as {
      name: string;
      version: string;
    };

    expect(manifest).toMatchObject({
      name: 'source-map-js',
      version: '1.2.2',
    });
  });

  it('preserves ordinary indexed source-map mapping behavior', () => {
    const mappings: Array<Record<string, unknown>> = [];
    new SourceMapConsumer(indexedSourceMap(4)).eachMapping((mapping) => {
      mappings.push(mapping);
    });

    expect(mappings).toEqual([
      {
        source: 'source.ts',
        generatedLine: 5,
        generatedColumn: 0,
        originalLine: 1,
        originalColumn: 0,
        name: null,
      },
    ]);
  });

  it('rejects an oversized indexed offset in a bounded child process', () => {
    const sourceMap = JSON.stringify(indexedSourceMap(10_000_001));
    const child = spawnSync(
      process.execPath,
      [
        '-e',
        `const { createRequire } = require('node:module');
const nextRequire = createRequire(require.resolve('next/package.json'));
const postcssRequire = createRequire(nextRequire.resolve('postcss/package.json'));
const { SourceMapConsumer } = postcssRequire('source-map-js');
try {
  new SourceMapConsumer(${sourceMap});
  process.exitCode = 1;
} catch (error) {
  if (!/Section offset line must not exceed 10000000\\./.test(String(error.message))) {
    throw error;
  }
}`,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 2_000,
        windowsHide: true,
      }
    );

    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
  });

  it('rejects non-integer indexed offsets before accepting the map', () => {
    expect(() => new SourceMapConsumer(indexedSourceMap(0.5))).toThrow(
      'Section offset line and column must be non-negative integers.'
    );
  });
});
