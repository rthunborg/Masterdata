import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_BASELINE_ADOPTION_LEDGER,
  PRODUCTION_BASELINE_ADOPTION_VERSIONS,
  prepareProductionBaselineAdoptionReview,
  validateProductionBaselineAdoptionLedger,
} from '../../../../src/lib/release/production-baseline-adoption.mjs';
import { PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS } from '../../../../src/lib/release/production-bootstrap-admission.mjs';

const sourceCommit = '88cf3efcf7fdb8cdbfd00d850da6082b0f6fdd65';
const targetBindingSha256 = 'a'.repeat(64);
const receipt = (kind: string, sha256 = 'b'.repeat(64)) => ({
  schemaVersion: 1,
  kind,
  sha256,
  sourceCommit,
  targetBindingSha256,
  capturedAtUtc: '2026-09-28T10:00:00.000Z',
});
const validPacket = () => ({
  sourceCommit,
  targetBindingSha256,
  forwardHistory: {
    ...receipt('independent-production-post-forward-history', 'f'.repeat(64)),
    versions: [...PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS],
  },
  strictPost: {
    ...receipt('independent-production-strict-catalog'),
    checkCount: 16,
    failedCheckCount: 0,
    checkNames: [
      'verifier_phase', 'story_22_15_phase_contracts', 'room_assignment_function_signatures',
      'repayment_boolean_columns', 'repayment_indexes_and_config', 'staffing_objects',
      'staffing_columns', 'staffing_constraints_and_rls', 'dietary_columns_and_permissions',
      'user_filters_objects', 'user_filters_trigger_function_contract', 'represented_trigger_contracts',
      'represented_column_contracts', 'represented_function_contracts',
      'staffing_crewing_done_permission_state', 'represented_policy_contracts',
    ],
  },
  canonicalFingerprint: {
    ...receipt('independent-production-canonical-schema-fingerprint', 'c'.repeat(64)),
    coverage: 'complete-canonical-68-source-migrations',
  },
  preservationFingerprint: {
    ...receipt('independent-production-preservation-fingerprint', 'd'.repeat(64)),
    scope: 'all-ledger-data-effects-and-seed-states',
  },
  now: new Date('2026-09-28T10:05:00.000Z'),
});

describe('Story 22.15 production baseline adoption ledger', () => {
  it('maps exactly the pinned 55 sources, including data and seed effects', () => {
    const result = validateProductionBaselineAdoptionLedger();
    expect(PRODUCTION_BASELINE_ADOPTION_VERSIONS).toHaveLength(55);
    expect(result.versionCount).toBe(55);
    expect(result.effectCount).toBeGreaterThan(55);
    expect(PRODUCTION_BASELINE_ADOPTION_LEDGER.flatMap((entry) => entry.effects).some((effect) => effect.disposition === 'DATA_STATE_PRESERVED_NOT_RECONSTRUCTED')).toBe(true);
    expect(PRODUCTION_BASELINE_ADOPTION_LEDGER.flatMap((entry) => entry.effects).some((effect) => effect.disposition === 'SEED_STATE_ADOPTED')).toBe(true);
  });

  it('rejects missing, extra, reordered, or source-mutated ledger entries', () => {
    expect(() => validateProductionBaselineAdoptionLedger(PRODUCTION_BASELINE_ADOPTION_LEDGER.slice(1))).toThrow(/exactly 55/u);
    expect(() => validateProductionBaselineAdoptionLedger([...PRODUCTION_BASELINE_ADOPTION_LEDGER, PRODUCTION_BASELINE_ADOPTION_LEDGER[0]])).toThrow(/exactly 55/u);
    expect(() => validateProductionBaselineAdoptionLedger([...PRODUCTION_BASELINE_ADOPTION_LEDGER].reverse())).toThrow(/source identity/u);
    const mutated = PRODUCTION_BASELINE_ADOPTION_LEDGER.map((entry, index) => index === 0 ? { ...entry, gitBlob: 'f'.repeat(40) } : entry);
    expect(() => validateProductionBaselineAdoptionLedger(mutated)).toThrow(/source identity/u);
  });

  it('rejects an unknown superseder and cycles in reviewed source lineage', () => {
    const unknown = PRODUCTION_BASELINE_ADOPTION_LEDGER.map((entry, index) => index === 0 ? { ...entry, effects: [{ ...entry.effects[0], supersededBy: ['20990101000000'] }] } : entry);
    expect(() => validateProductionBaselineAdoptionLedger(unknown)).toThrow(/superseder is unknown/u);
    const cycle = PRODUCTION_BASELINE_ADOPTION_LEDGER.map((entry, index) => {
      if (index === 0) return { ...entry, effects: [{ ...entry.effects[0], supersededBy: [PRODUCTION_BASELINE_ADOPTION_LEDGER[1].version] }] };
      if (index === 1) return { ...entry, effects: [{ ...entry.effects[0], disposition: 'SUPERSEDED_BY_SOURCE', supersededBy: [PRODUCTION_BASELINE_ADOPTION_LEDGER[0].version] }] };
      return entry;
    });
    expect(() => validateProductionBaselineAdoptionLedger(cycle)).toThrow(/cycle/u);
  });

  it('does not permit callers to omit or weaken reviewed material-effect scope', () => {
    const weakened = PRODUCTION_BASELINE_ADOPTION_LEDGER.map((entry) => ({
      ...entry, effects: entry.effects.map((effect) => ({ ...effect })),
    }));
    const dataRow = weakened.find((entry) => entry.effects.some((effect) => effect.disposition === 'DATA_STATE_PRESERVED_NOT_RECONSTRUCTED'))!;
    dataRow.effects = dataRow.effects.filter((effect) => effect.disposition !== 'DATA_STATE_PRESERVED_NOT_RECONSTRUCTED');
    expect(() => validateProductionBaselineAdoptionLedger(weakened)).toThrow(/material effects/u);
    const changedScope = PRODUCTION_BASELINE_ADOPTION_LEDGER.map((entry, index) => index === 0 ? {
      ...entry, effects: entry.effects.map((effect) => ({ ...effect, scope: 'unreviewed aggregate-only scope' })),
    } : entry);
    expect(() => validateProductionBaselineAdoptionLedger(changedScope)).toThrow(/material effects/u);
  });

  it('requires exact forward history, fresh 16/16 strict proof, and bound independent fingerprints', () => {
    const readyForOwner = prepareProductionBaselineAdoptionReview(validPacket());
    expect(readyForOwner.status).toBe('UNPROVED');
    expect(readyForOwner.disposition).toBe('owner_adoption_required');
    expect(readyForOwner.missing).toEqual([]);
    expect(Object.keys(readyForOwner)).not.toContain('signature');
    expect(Object.keys(readyForOwner)).not.toContain('approved');
    expect(Object.keys(readyForOwner)).not.toContain('proved');

    const noForward = validPacket();
    noForward.forwardHistory.versions = PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS.slice(1);
    expect(prepareProductionBaselineAdoptionReview(noForward).missing).toContain('forward_history_not_exactly_13');
    const reorderedForward = validPacket();
    reorderedForward.forwardHistory.versions.reverse();
    expect(prepareProductionBaselineAdoptionReview(reorderedForward).missing).toContain('forward_history_not_exactly_13');
    const duplicateForward = validPacket();
    duplicateForward.forwardHistory.versions[1] = duplicateForward.forwardHistory.versions[0];
    expect(prepareProductionBaselineAdoptionReview(duplicateForward).missing).toContain('forward_history_not_exactly_13');
    const no16 = validPacket();
    no16.strictPost.checkCount = 15;
    expect(prepareProductionBaselineAdoptionReview(no16).missing).toContain('strict_post_apply_16_of_16_not_proven');
    const unorderedStrict = validPacket();
    unorderedStrict.strictPost.checkNames.reverse();
    expect(prepareProductionBaselineAdoptionReview(unorderedStrict).missing).toContain('strict_post_apply_16_of_16_not_proven');
    const duplicateStrict = validPacket();
    duplicateStrict.strictPost.checkNames[1] = duplicateStrict.strictPost.checkNames[0];
    expect(prepareProductionBaselineAdoptionReview(duplicateStrict).missing).toContain('strict_post_apply_16_of_16_not_proven');
    const stale = validPacket();
    stale.canonicalFingerprint.capturedAtUtc = '2026-09-28T09:00:00.000Z';
    expect(prepareProductionBaselineAdoptionReview(stale).missing).toContain('canonical_schema_fingerprint_stale');
    const mixedBinding = validPacket();
    mixedBinding.preservationFingerprint.targetBindingSha256 = 'e'.repeat(64);
    expect(prepareProductionBaselineAdoptionReview(mixedBinding).missing).toContain('preservation_fingerprint_binding_mismatch');
  });

  it('rejects omitted, future, or shape-mutated receipts instead of trusting caller booleans', () => {
    const omitted = validPacket();
    delete omitted.canonicalFingerprint;
    expect(prepareProductionBaselineAdoptionReview(omitted).missing).toContain('canonical_schema_fingerprint_missing');
    const future = validPacket();
    future.strictPost.capturedAtUtc = '2026-09-28T10:06:00.000Z';
    expect(prepareProductionBaselineAdoptionReview(future).missing).toContain('strict_post_apply_stale');
    const extraField = validPacket();
    (extraField.canonicalFingerprint as Record<string, unknown>).historicalProof = true;
    expect(prepareProductionBaselineAdoptionReview(extraField).missing).toContain('canonical_schema_fingerprint_invalid');
    const badScope = validPacket();
    badScope.preservationFingerprint.scope = 'aggregate-only';
    expect(prepareProductionBaselineAdoptionReview(badScope).missing).toContain('preservation_fingerprint_scope_incomplete');
    const badCoverage = validPacket();
    badCoverage.canonicalFingerprint.coverage = 'nine-of-sixteen';
    expect(prepareProductionBaselineAdoptionReview(badCoverage).missing).toContain('canonical_schema_fingerprint_not_complete_68_source_coverage');
    const sourceTargetSwap = validPacket();
    sourceTargetSwap.forwardHistory.sourceCommit = '1'.repeat(40);
    expect(prepareProductionBaselineAdoptionReview(sourceTargetSwap).missing).toContain('forward_history_binding_mismatch');
  });
});
