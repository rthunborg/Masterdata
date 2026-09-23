import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assessProductionHistoryRepairProofBatch,
  PRODUCTION_HISTORY_REPAIR_BASELINE,
  PRODUCTION_HISTORY_REPAIR_VERSIONS,
} from '../../../../src/lib/release/production-history-repair-proof.mjs';

const now = new Date('2026-09-23T12:00:00.000Z');
const sourceCommit = 'a'.repeat(40);
const sourceTree = 'b'.repeat(40);
const sourceManifestSha256 = 'c'.repeat(64);
const targetBindingSha256 = 'd'.repeat(64);

const source = () => ({
  sourceCommit,
  sourceTree,
  sourceManifestSha256,
  manifestRepairVersions: [...PRODUCTION_HISTORY_REPAIR_VERSIONS],
  migrations: PRODUCTION_HISTORY_REPAIR_BASELINE.map((entry) => ({ ...entry })),
});

const proof = (predicateId: string, file: string, index: number) => ({
  predicateId,
  evidenceId: (index + 1).toString(16).repeat(64).slice(0, 64),
  actual: {
    subject: file,
    observations: [
      { field: 'redacted_contract_fact', actual: 'represented', expected: 'represented' },
      { field: 'redacted_contract_count', actual: 1, expected: 1 },
    ],
  },
});

const row = (entry: (typeof PRODUCTION_HISTORY_REPAIR_BASELINE)[number], index: number) => ({
  ...entry,
  sourceCommit,
  sourceTree,
  sourceManifestSha256,
  targetBindingSha256,
  observedAtUtc: '2026-09-23T11:59:00.000Z',
  proofs: [
    proof(`source_effect:${entry.version}`, entry.file, index * 3),
    proof(`current_or_successor:${entry.version}`, entry.file, index * 3 + 1),
    proof(`preservation_or_disposition:${entry.version}`, entry.file, index * 3 + 2),
  ],
});

const batch = () => ({
  schemaVersion: 1,
  kind: 'production-history-repair-proof-batch',
  sourceCommit,
  sourceTree,
  sourceManifestSha256,
  targetBindingSha256,
  capturedAtUtc: '2026-09-23T11:59:30.000Z',
  rows: PRODUCTION_HISTORY_REPAIR_BASELINE.map(row),
});

const assess = (value: Record<string, unknown> = {}) =>
  assessProductionHistoryRepairProofBatch(
    { source: source(), batch: batch(), ...value },
    { now }
  );

describe('Story 22.15 production history-repair proof batch', () => {
  it('pins exactly 55 ordered repair rows with immutable source identity', () => {
    expect(PRODUCTION_HISTORY_REPAIR_BASELINE).toHaveLength(55);
    expect(PRODUCTION_HISTORY_REPAIR_VERSIONS).toHaveLength(55);
    expect(new Set(PRODUCTION_HISTORY_REPAIR_VERSIONS).size).toBe(55);
    expect(PRODUCTION_HISTORY_REPAIR_BASELINE[0]).toMatchObject({
      version: '20250113000000',
      gitBlob: '02c23b974ba681663dec487d69bd9733986f1cee',
    });
    expect(PRODUCTION_HISTORY_REPAIR_BASELINE.at(-1)).toMatchObject({
      version: '20260607193000',
      sha256: '9302cfceab0e3941472581cba890022bce02f61d6e60e91f9795fab83ff73665',
    });
  });

  it('matches every manifest repair version and every raw-byte ledger blob hash', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'supabase/migration-baseline-manifest.json'), 'utf8')
    );
    const ledger = readFileSync(
      join(
        process.cwd(),
        'docs/commercial-readiness/evidence/production-repair-proof-ledger-2026-09-16.md'
      ),
      'utf8'
    );
    const entries = ledger
      .split(/\r?\n/u)
      .filter((line: string) => /^\| 20\d{12} \|/u.test(line))
      .map((line: string) => {
        const [, version, rawFile, rawBlob, rawSha] = line.split('|');
        const unwrap = (value: string) => value.trim().replace(/^`|`$/gu, '');
        return {
          version: version.trim(),
          file: unwrap(rawFile),
          gitBlob: unwrap(rawBlob),
          sha256: unwrap(rawSha),
        };
      });

    expect(manifest.classifications['repair-after-catalog-proof']).toEqual(
      PRODUCTION_HISTORY_REPAIR_VERSIONS
    );
    expect(entries).toEqual(PRODUCTION_HISTORY_REPAIR_BASELINE);
  });

  it('produces a reviewable allowlist only after every row has fresh material-effect records', () => {
    const result = assess();
    expect(result).toMatchObject({
      disposition: 'reviewable_complete_batch',
      repairAuthority: 'none',
      completeRowCount: 55,
      unprovedRowCount: 0,
    });
    expect(result.reviewableAllowlist).toEqual(PRODUCTION_HISTORY_REPAIR_VERSIONS);
    expect(result.rows.every((value) => value.state === 'READY_FOR_HUMAN_DISPOSITION')).toBe(true);
  });

  it('keeps the complete batch UNPROVED when one required material effect is absent, ambiguous, or stale', () => {
    const missing = batch();
    missing.rows[0].proofs.pop();
    const missingResult = assess({ batch: missing });
    expect(missingResult).toMatchObject({ disposition: 'UNPROVED', completeRowCount: 54, unprovedRowCount: 1 });
    expect(missingResult.reviewableAllowlist).toEqual([]);

    const ambiguous = batch();
    ambiguous.rows[1].proofs[0].actual.observations[0].actual = 0;
    expect(assess({ batch: ambiguous }).rows[1]).toMatchObject({ state: 'UNPROVED', reason: 'ambiguous_or_invalid_material_effect_proof' });

    const stale = batch();
    stale.rows[2].observedAtUtc = '2026-09-23T11:44:59.999Z';
    expect(assess({ batch: stale }).rows[2]).toMatchObject({ state: 'UNPROVED', reason: 'stale_or_invalid_observation' });
  });

  it('rejects a caller-supplied approval, signature, digest-only proof, or wrong immutable entry', () => {
    const approved = batch() as Record<string, unknown>;
    approved.ownerApproved = true;
    expect(assess({ batch: approved }).disposition).toBe('blocked_invalid_evidence');

    const signed = batch();
    Object.assign(signed.rows[0], { reviewerSignature: 'claimed' });
    expect(assess({ batch: signed }).disposition).toBe('UNPROVED');

    const digestOnly = batch();
    digestOnly.rows[0].proofs[0] = {
      predicateId: `source_effect:${digestOnly.rows[0].version}`,
      evidenceId: 'f'.repeat(64),
    } as never;
    expect(assess({ batch: digestOnly }).rows[0]).toMatchObject({ state: 'UNPROVED' });

    const booleansOnly = batch();
    booleansOnly.rows[0].proofs[0].actual.observations = [
      { field: 'claimed_effect', actual: true, expected: true },
      { field: 'claimed_preservation', actual: true, expected: true },
    ];
    expect(assess({ batch: booleansOnly }).rows[0]).toMatchObject({ state: 'UNPROVED' });

    const wrongEntry = source();
    wrongEntry.migrations[4].sha256 = '0'.repeat(64);
    expect(assess({ source: wrongEntry }).disposition).toBe('blocked_invalid_evidence');
  });

  it('requires the exact manifest repair ordering and a single bound target', () => {
    const wrongPlan = source();
    wrongPlan.manifestRepairVersions.reverse();
    expect(assess({ source: wrongPlan }).disposition).toBe('blocked_invalid_evidence');

    const mixedTarget = batch();
    mixedTarget.rows[10].targetBindingSha256 = 'e'.repeat(64);
    expect(assess({ batch: mixedTarget }).rows[10]).toMatchObject({ state: 'UNPROVED', reason: 'source_or_entry_mismatch' });

    const duplicate = batch();
    duplicate.rows[5] = duplicate.rows[4];
    expect(assess({ batch: duplicate }).rows[5]).toMatchObject({ state: 'UNPROVED', reason: 'source_or_entry_mismatch' });
  });
});
