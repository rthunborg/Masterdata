import { describe, expect, it } from 'vitest';

import {
  assessProductionObservedProfile,
  PRODUCTION_OBSERVED_PROFILE_BASELINE,
  PRODUCTION_OBSERVED_PROFILE_MAX_AGE_MS,
  PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA,
} from '../../../../src/lib/release/production-observed-profile.mjs';

const targetBindingSha256 = 'a'.repeat(64);
const finalSourceSha = 'b'.repeat(40);
const capturedAtUtc = '2026-09-23T12:48:12.473Z';
const now = new Date('2026-09-23T12:58:12.473Z');

function observation() {
  return {
    schemaVersion: 1,
    kind: 'production-observed-profile',
    profilePhase: 'pre_cleanup',
    capturedAtUtc,
    sourceSha: finalSourceSha,
    baselineSourceSha: PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA,
    targetBindingSha256,
    ...structuredClone(PRODUCTION_OBSERVED_PROFILE_BASELINE),
  };
}

function assess(value = observation(), context = {
  sourceSha: finalSourceSha,
  targetBindingSha256,
}) {
  return assessProductionObservedProfile({
    observation: value,
    expectedContext: context,
    now,
  });
}

describe('Story 22.15 production observed profile', () => {
  it('accepts only the exact redacted baseline and remains non-admitting', () => {
    expect(assess()).toEqual({
      schemaVersion: 1,
      kind: 'production-observed-profile-assessment',
      disposition: 'profile_match_not_admission',
      sourceSha: finalSourceSha,
      observedAtUtc: capturedAtUtc,
      targetBindingSha256,
      blockers: [
        'historical_effect_not_proven',
        'semantic_equivalence_not_proven',
        'production_apply_not_authorized',
      ],
    });
  });

  it('keeps the reviewed baseline deeply frozen and accepts the distinct zero-filter phase', () => {
    expect(() => {
      PRODUCTION_OBSERVED_PROFILE_BASELINE.schemaGroups.functions.sha256 = '0'.repeat(64);
    }).toThrow(TypeError);

    const postCleanup = observation();
    postCleanup.profilePhase = 'post_cleanup';
    postCleanup.aggregate.saved_filter_data.total_count = 0;
    postCleanup.aggregate.saved_filter_data.orphan_auth_reference_count = 0;
    postCleanup.aggregate.saved_filter_data.row_identity_sha256 =
      '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
    expect(assess(postCleanup).disposition).toBe('profile_match_not_admission');
  });

  it.each([
    ['a changed full-metadata fingerprint', (value: ReturnType<typeof observation>) => {
      value.schemaGroups.functions.sha256 = '0'.repeat(64);
    }],
    ['a changed pre-cleanup orphan count', (value: ReturnType<typeof observation>) => {
      value.aggregate.saved_filter_data.orphan_auth_reference_count = 47;
    }],
    ['a changed all-61 permission fingerprint', (value: ReturnType<typeof observation>) => {
      value.aggregate.permission_baseline.rows_sha256 = '0'.repeat(64);
    }],
    ['a changed audit preservation hash', (value: ReturnType<typeof observation>) => {
      value.aggregate.audit_preservation.stable_fields_sha256 = '0'.repeat(64);
    }],
    ['a changed strict-catalog group', (value: ReturnType<typeof observation>) => {
      value.strictCatalog.failedChecks.pop();
    }],
  ])('rejects %s', (_label, mutate) => {
    const value = observation();
    mutate(value);
    expect(() => assess(value)).toThrow('production_observed_profile_baseline_mismatch');
  });

  it.each([
    ['missing aggregate field', 'production_observed_profile_baseline_mismatch', (value: Record<string, unknown>) => {
      delete (value.aggregate as Record<string, unknown>).staffing_data;
    }],
    ['unknown caller boolean', 'production_observed_profile_shape_invalid', (value: Record<string, unknown>) => {
      value.profileMatches = true;
    }],
    ['unknown nested field', 'production_observed_profile_baseline_mismatch', (value: Record<string, unknown>) => {
      (value.aggregate as Record<string, unknown>).unreviewed = undefined;
    }],
  ])('rejects %s', (_label, failure, mutate) => {
    const value = observation() as unknown as Record<string, unknown>;
    mutate(value);
    expect(() => assess(value as ReturnType<typeof observation>)).toThrow(
      failure
    );
  });

  it('rejects undefined keys, getters, and toJSON without invoking them', () => {
    const undefinedKey = observation() as unknown as Record<string, unknown>;
    undefinedKey.unreviewed = undefined;
    expect(() => assess(undefinedKey as ReturnType<typeof observation>)).toThrow(
      'production_observed_profile_shape_invalid'
    );

    const getter = observation();
    Object.defineProperty(getter.aggregate, 'staffing_data', {
      enumerable: true,
      get() {
        throw new Error('getter must not execute');
      },
    });
    expect(() => assess(getter)).toThrow('production_observed_profile_baseline_mismatch');

    const toJson = observation() as unknown as Record<string, unknown>;
    toJson.toJSON = () => {
      throw new Error('toJSON must not execute');
    };
    expect(() => assess(toJson as ReturnType<typeof observation>)).toThrow(
      'production_observed_profile_shape_invalid'
    );
  });

  it('rejects stale and future receipts under the fixed fifteen-minute maximum', () => {
    const stale = observation();
    stale.capturedAtUtc = '2026-09-23T12:43:12.472Z';
    expect(() => assess(stale)).toThrow('production_observed_profile_stale_or_future');

    const future = observation();
    future.capturedAtUtc = '2026-09-23T12:58:12.474Z';
    expect(() => assess(future)).toThrow('production_observed_profile_stale_or_future');
    expect(() => assessProductionObservedProfile({
      observation: observation(),
      expectedContext: {
        sourceSha: finalSourceSha,
        targetBindingSha256,
      },
      now,
      maxEvidenceAgeMs: PRODUCTION_OBSERVED_PROFILE_MAX_AGE_MS + 1,
    })).toThrow('production_observed_profile_age_policy_invalid');
  });

  it('rejects mixed source and target contexts and does not trust caller booleans', () => {
    const value = observation();
    expect(() => assess(value, {
      sourceSha: finalSourceSha,
      targetBindingSha256: 'b'.repeat(64),
    })).toThrow('production_observed_profile_context_mismatch');

    expect(() => assessProductionObservedProfile({
      observation: value,
      expectedContext: {
        sourceSha: finalSourceSha,
        targetBindingSha256,
        productionWriteApproved: true,
      } as unknown as { sourceSha: string; targetBindingSha256: string },
      now,
    })).toThrow('production_observed_profile_context_invalid');
  });
});
