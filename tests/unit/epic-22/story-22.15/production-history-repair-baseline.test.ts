import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as baseline from '../../../../src/lib/release/production-history-repair-baseline.mjs';

const { PRODUCTION_HISTORY_REPAIR_BASELINE, PRODUCTION_HISTORY_REPAIR_VERSIONS } = baseline;

describe('Story 22.15 production history-repair baseline', () => {
  it('pins exactly the 55 unsigned repair-ledger rows and manifest versions', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'supabase/migration-baseline-manifest.json'), 'utf8')
    );
    const ledger = readFileSync(
      join(process.cwd(), 'docs/commercial-readiness/evidence/production-repair-proof-ledger-2026-09-16.md'),
      'utf8'
    );
    const rows = ledger
      .split(/\r?\n/u)
      .filter((line) => /^\| 20\d{12} \|/u.test(line))
      .map((line) => {
        const [, version, rawFile, rawBlob, rawSha] = line.split('|');
        const unwrap = (value: string) => value.trim().replace(/^`|`$/gu, '');
        return {
          version: version.trim(),
          file: unwrap(rawFile),
          gitBlob: unwrap(rawBlob),
          sha256: unwrap(rawSha),
        };
      });

    expect(PRODUCTION_HISTORY_REPAIR_BASELINE).toHaveLength(55);
    expect(new Set(PRODUCTION_HISTORY_REPAIR_VERSIONS).size).toBe(55);
    expect(PRODUCTION_HISTORY_REPAIR_VERSIONS).toEqual(manifest.classifications['repair-after-catalog-proof']);
    expect(PRODUCTION_HISTORY_REPAIR_BASELINE).toEqual(rows);
    expect(Object.isFrozen(PRODUCTION_HISTORY_REPAIR_BASELINE)).toBe(true);
    expect(PRODUCTION_HISTORY_REPAIR_BASELINE.every(Object.isFrozen)).toBe(true);
  });

  it('binds each ledger entry to the raw migration bytes and Git blob', () => {
    for (const entry of PRODUCTION_HISTORY_REPAIR_BASELINE) {
      const bytes = readFileSync(join(process.cwd(), 'supabase/migrations', entry.file));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      expect(execFileSync('git', ['hash-object', '--stdin'], { input: bytes, encoding: 'utf8' }).trim())
        .toBe(entry.gitBlob);
    }
  });

  it('cannot classify any row as materially proved or authorize a history repair', () => {
    expect(Object.keys(baseline).sort()).toEqual([
      'PRODUCTION_HISTORY_REPAIR_BASELINE',
      'PRODUCTION_HISTORY_REPAIR_VERSIONS',
    ]);
  });
});
