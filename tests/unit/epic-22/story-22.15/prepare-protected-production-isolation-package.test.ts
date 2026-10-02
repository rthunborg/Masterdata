import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  inspectProtectedProductionIsolationRuntimeLease,
  PROTECTED_PRODUCTION_ISOLATION_RUNTIME_PACKAGES,
} from '../../../../src/lib/release/prepare-protected-production-isolation-package.mjs';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const source = { sourceCommit: 'a'.repeat(40), sourceTree: 'b'.repeat(40), sourceManifestSha256: 'c'.repeat(64) };

function syntheticRuntime(root: string) {
  for (const name of PROTECTED_PRODUCTION_ISOLATION_RUNTIME_PACKAGES) {
    const directory = path.join(root, 'node_modules', ...name.split('/'), 'dist');
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, 'index.mjs'), 'export const synthetic = true;\n');
    const versions: Record<string, string> = { '@supabase/auth-js': '2.93.2', '@supabase/functions-js': '2.93.2', '@supabase/postgrest-js': '2.93.2', '@supabase/realtime-js': '2.93.2', '@supabase/storage-js': '2.93.2', '@supabase/supabase-js': '2.93.2', 'iceberg-js': '0.8.1', papaparse: '5.5.3', tslib: '2.8.1', ws: '8.21.0' };
    writeFileSync(path.join(directory, '..', 'package.json'), JSON.stringify({ name, version: versions[name], main: 'dist/index.mjs' }));
  }
}

describe('protected production isolation runtime lease inventory', () => {
  it('inventories every full fixed package directory and rejects a package-entry-only lease', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-masterdata-isolation-runtime-'));
    try {
      syntheticRuntime(root);
      const nodeExecutable = realpathSync(process.execPath);
      const inventory = inspectProtectedProductionIsolationRuntimeLease({ runtimeRoot: root, nodeExecutable,
        expectedNodeSha256: sha256(readFileSync(nodeExecutable)), ...source });
      expect(inventory).toMatchObject({ kind: 'protected-production-isolation-runtime-lease-inventory', packageManager: 'pnpm-hoisted-clean-checkout' });
      expect(inventory.dependencyPackages.map((entry) => entry.name)).toEqual([...PROTECTED_PRODUCTION_ISOLATION_RUNTIME_PACKAGES]);
      expect(inventory.files).toHaveLength(PROTECTED_PRODUCTION_ISOLATION_RUNTIME_PACKAGES.length * 2);
      rmSync(path.join(root, 'node_modules', '@supabase', 'realtime-js', 'dist', 'index.mjs'));
      expect(() => inspectProtectedProductionIsolationRuntimeLease({ runtimeRoot: root, nodeExecutable,
        expectedNodeSha256: sha256(readFileSync(nodeExecutable)), ...source })).toThrow('Protected production isolation package preparation failed');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('rejects noncanonical identities and a lease larger than its bounded inventory', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-masterdata-isolation-runtime-'));
    try {
      syntheticRuntime(root);
      const nodeExecutable = realpathSync(process.execPath);
      const options = { runtimeRoot: root, nodeExecutable,
        expectedNodeSha256: sha256(readFileSync(nodeExecutable)), ...source };
      expect(() => inspectProtectedProductionIsolationRuntimeLease({ ...options, sourceCommit: 'bad' })).toThrow();
      const oversized = path.join(root, 'node_modules', 'papaparse', 'extra'); mkdirSync(oversized);
      for (let index = 0; index <= 512; index += 1) writeFileSync(path.join(oversized, `${index}.js`), 'x');
      expect(() => inspectProtectedProductionIsolationRuntimeLease(options)).toThrow();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('refuses an unknown bare runtime import even when its package directory exists', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-masterdata-isolation-runtime-'));
    try {
      syntheticRuntime(root);
      writeFileSync(path.join(root, 'node_modules', '@supabase', 'realtime-js', 'dist', 'index.mjs'), "import 'unreviewed-runtime';\n");
      const nodeExecutable = realpathSync(process.execPath);
      expect(() => inspectProtectedProductionIsolationRuntimeLease({ runtimeRoot: root, nodeExecutable,
        expectedNodeSha256: sha256(readFileSync(nodeExecutable)), ...source })).toThrow('Protected production isolation package preparation failed');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it.each(['computed', 'relative-escape', 'shadow-package'] as const)('rejects %s in the executable runtime graph', variant => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-isolation-import-graph-'));
    try {
      syntheticRuntime(root);
      const entry = path.join(root, 'node_modules', '@supabase', 'auth-js', 'dist', 'index.mjs');
      if (variant === 'computed') writeFileSync(entry, 'const target = "node:fs"; import(target);');
      if (variant === 'relative-escape') {
        writeFileSync(path.join(root, 'unleased.mjs'), 'export const value = true;');
        writeFileSync(entry, "import '../../../../unleased.mjs';");
      }
      if (variant === 'shadow-package') {
        const shadow = path.join(root, 'node_modules', '@supabase', 'auth-js', 'node_modules', 'ws');
        mkdirSync(shadow, { recursive: true });
        writeFileSync(path.join(shadow, 'package.json'), JSON.stringify({ name: 'ws', version: '8.21.0', main: 'index.js' }));
        writeFileSync(path.join(shadow, 'index.js'), 'module.exports = true;');
        writeFileSync(entry, "import 'ws';");
      }
      const nodeExecutable = realpathSync(process.execPath);
      expect(() => inspectProtectedProductionIsolationRuntimeLease({ runtimeRoot: root, nodeExecutable,
        expectedNodeSha256: sha256(readFileSync(nodeExecutable)), ...source })).toThrow();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('leases shipped tests without treating comments or non-entry test imports as executable roots', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hr-isolation-non-runtime-'));
    try {
      syntheticRuntime(root);
      writeFileSync(path.join(root, 'node_modules', 'papaparse', 'shipped-test.js'), "import 'test-only-framework';");
      writeFileSync(path.join(root, 'node_modules', '@supabase', 'auth-js', 'dist', 'index.mjs'),
        "// require('comment-only');\nexport const example = \"require('string-only')\";\n");
      const nodeExecutable = realpathSync(process.execPath);
      const inventory = inspectProtectedProductionIsolationRuntimeLease({ runtimeRoot: root, nodeExecutable,
        expectedNodeSha256: sha256(readFileSync(nodeExecutable)), ...source });
      expect(inventory.files.some(file => file.path.endsWith('/shipped-test.js'))).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
