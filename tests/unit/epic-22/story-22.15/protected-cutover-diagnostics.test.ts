import { generateKeyPairSync } from 'node:crypto';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createProtectedCutoverDiagnosticSink,
  readProtectedCutoverDiagnosticContext,
  recoverProtectedCutoverDiagnostics,
} from '../../../../src/lib/release/protected-cutover-diagnostics.mjs';

const roots: string[] = [];
const require = createRequire(import.meta.url);
const context = () => ({
  sourceSha: 'a'.repeat(40),
  sourceTree: 'b'.repeat(40),
  sourceManifestSha256: 'c'.repeat(64),
  targetBindingSha256: 'd'.repeat(64),
  nonce: 'e'.repeat(64),
  operation: 'apply-forward-13',
});
const result = (overrides = {}) => ({
  stdout: Buffer.from([0, 0xff, 0x41, 0x0a]),
  stderr: Buffer.from('partial apply stderr \u00e5', 'utf8'),
  status: 1,
  signal: null,
  errorCode: null,
  durationMs: 90_000,
  ...overrides,
});

function workspace() {
  const root = mkdtempSync(path.join(tmpdir(), 'hr-cutover-diagnostics-'));
  roots.push(root);
  return root;
}

function removeOwnedWorkspace(root: string) {
  const temporaryRoot = path.resolve(tmpdir());
  const resolved = path.resolve(root);
  const relative = path.relative(temporaryRoot, resolved);
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    relative.includes(path.sep) ||
    !relative.startsWith('hr-cutover-diagnostics-')
  ) throw new Error('fixture cleanup target refused');
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('fixture cleanup target refused');
  rmSync(resolved, { recursive: true, force: true });
}

function keys() {
  return generateKeyPairSync('rsa', { modulusLength: 2048 });
}

function file(root: string, phase: 'dry-run' | 'apply') {
  return path.join(root, 'cutover-diagnostics.v1', `${phase}.enc`);
}

afterEach(() => {
  vi.restoreAllMocks();
  roots.splice(0).forEach(removeOwnedWorkspace);
});

describe('protected cutover encrypted diagnostics', () => {
  it('reserves both write-once journals before an attempt and recovers exact raw result bytes only in memory', () => {
    const root = workspace();
    const { publicKey, privateKey } = keys();
    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });

    expect(existsSync(file(root, 'dry-run'))).toBe(true);
    expect(existsSync(file(root, 'apply'))).toBe(true);
    expect(readFileSync(file(root, 'dry-run'))).toHaveLength(0);
    expect(readFileSync(file(root, 'apply'))).toHaveLength(0);
    expect(readProtectedCutoverDiagnosticContext({ workspace: root })).toEqual(context());

    sink.start('dry-run');
    sink.complete('dry-run', result({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: 0, durationMs: 7 }));
    sink.start('apply');
    sink.complete('apply', result());
    sink.close();
    sink.close();

    const disk = Buffer.concat([readFileSync(file(root, 'dry-run')), readFileSync(file(root, 'apply'))]).toString('utf8');
    expect(disk).not.toContain('partial apply stderr');
    expect(disk).not.toContain(context().sourceSha);

    const recovered = recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() });
    expect(recovered.outcome).toBe('outcome_unknown');
    expect(recovered.authorizesRetry).toBe(false);
    expect(recovered.diagnosticRecords.map((entry) => [entry.phase, entry.kind])).toEqual([
      ['dry-run', 'started'], ['dry-run', 'completed'], ['apply', 'started'], ['apply', 'completed'],
    ]);
    const apply = recovered.diagnosticRecords[3];
    expect(recovered.diagnosticRecords[1]).toMatchObject({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: 0 });
    expect(apply.stdout).toEqual(result().stdout);
    expect(apply.stderr).toEqual(result().stderr);
    expect(apply).toMatchObject({ status: 1, signal: null, errorCode: null, durationMs: 90_000 });
  });

  it('retains an authenticated start with a truncated terminal record as explicitly unknown', () => {
    const root = workspace();
    const { publicKey, privateKey } = keys();
    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });
    sink.start('dry-run');
    sink.close();
    appendFileSync(file(root, 'dry-run'), '{"partial":');

    const recovered = recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() });
    expect(recovered.outcome).toBe('outcome_unknown');
    expect(recovered.diagnosticRecords).toHaveLength(1);
    expect(recovered.diagnosticRecords[0]).toMatchObject({ phase: 'dry-run', kind: 'started' });
  });

  it('classifies empty journals, a completed dry run, and abnormal terminals conservatively', () => {
    const root = workspace();
    const { publicKey, privateKey } = keys();
    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });

    expect(recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() }).outcome)
      .toBe('no_recorded_attempt');

    sink.start('dry-run');
    sink.complete('dry-run', result({ status: 0 }));
    expect(recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() }).outcome)
      .toBe('dry_run_only');

    sink.start('apply');
    sink.complete('apply', result({ status: null, signal: 'SIGTERM', errorCode: 'ETIMEDOUT' }));
    expect(recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() }).outcome)
      .toBe('outcome_unknown');
    sink.close();
  });

  it('reports complete journals only for a successful zero-status apply with empty streams', () => {
    const root = workspace();
    const { publicKey, privateKey } = keys();
    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });
    sink.start('dry-run');
    sink.complete('dry-run', result({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: 0, durationMs: 1 }));
    sink.start('apply');
    sink.complete('apply', result({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: 0, durationMs: 2 }));
    sink.close();

    const recovered = recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() });
    expect(recovered.outcome).toBe('terminal_records_complete');
    expect(recovered.authorizesRetry).toBe(false);
    expect(recovered.diagnosticRecords[3]).toMatchObject({ stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: 0 });
  });

  it('rejects tampering, replayed records, mismatched context, and oversize journals without exposing details', () => {
    const root = workspace();
    const { publicKey, privateKey } = keys();
    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });
    sink.start('dry-run');
    sink.complete('dry-run', result({ status: 0 }));
    sink.close();
    const original = readFileSync(file(root, 'dry-run'), 'utf8');
    const [start, completion] = original.trimEnd().split('\n');
    const tampered = JSON.parse(completion);
    tampered.tag = `${tampered.tag.startsWith('A') ? 'B' : 'A'}${tampered.tag.slice(1)}`;
    writeFileSync(file(root, 'dry-run'), `${start}\n${JSON.stringify(tampered)}\n`);
    expect(() => recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() })).toThrow('Protected cutover diagnostic refused');

    writeFileSync(file(root, 'dry-run'), `${start}\n${start}\n`);
    expect(() => recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() })).toThrow('Protected cutover diagnostic refused');

    writeFileSync(file(root, 'dry-run'), original);
    expect(() => recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: { ...context(), nonce: 'f'.repeat(64) } })).toThrow('Protected cutover diagnostic refused');
    writeFileSync(file(root, 'dry-run'), Buffer.alloc(8 * 1024 * 1024 + 1));
    expect(() => recoverProtectedCutoverDiagnostics({ workspace: root, privateKey, context: context() })).toThrow('Protected cutover diagnostic refused');
  });

  it('refuses collisions, symlinks, malformed order, and cryptographic failure before any plaintext journal exists', () => {
    const root = workspace();
    const { publicKey } = keys();
    const directory = path.join(root, 'cutover-diagnostics.v1');
    writeFileSync(directory, 'occupied');
    expect(() => createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() })).toThrow('Protected cutover diagnostic refused');

    rmSync(directory);
    const target = path.join(root, 'junction-target');
    fs.mkdirSync(target);
    symlinkSync(target, directory, 'junction');
    expect(() => createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() })).toThrow('Protected cutover diagnostic refused');
    rmSync(directory);

    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });
    expect(() => sink.start('apply')).toThrow('Protected cutover diagnostic refused');
    expect(() => sink.complete('dry-run', result())).toThrow('Protected cutover diagnostic refused');
    sink.close();
    expect(readFileSync(file(root, 'dry-run')).toString('utf8')).not.toContain('private filesystem detail');
  });

  it('returns only the stable error when an encrypted journal flush fails', () => {
    const root = workspace();
    const { publicKey } = keys();
    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });
    const mutableFs = require('node:fs') as typeof fs;
    const original = mutableFs.fsyncSync;
    try {
      mutableFs.fsyncSync = () => { throw new Error('private filesystem detail'); };
      syncBuiltinESMExports();
      expect(() => sink.start('dry-run')).toThrow('Protected cutover diagnostic refused');
    } finally {
      mutableFs.fsyncSync = original;
      syncBuiltinESMExports();
    }
  });

  it('returns only the stable error and leaves no plaintext when RSA envelope encryption fails', () => {
    const root = workspace();
    const { publicKey } = keys();
    const sink = createProtectedCutoverDiagnosticSink({ workspace: root, publicKey, context: context() });
    const mutableCrypto = require('node:crypto') as typeof import('node:crypto');
    const original = mutableCrypto.publicEncrypt;
    try {
      mutableCrypto.publicEncrypt = () => { throw new Error('private crypto detail'); };
      syncBuiltinESMExports();
      expect(() => sink.start('dry-run')).toThrow('Protected cutover diagnostic refused');
      expect(readFileSync(file(root, 'dry-run')).toString('utf8')).not.toContain('private crypto detail');
    } finally {
      mutableCrypto.publicEncrypt = original;
      syncBuiltinESMExports();
    }
  });
});
