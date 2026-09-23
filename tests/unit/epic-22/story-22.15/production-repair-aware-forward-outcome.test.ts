import { describe, expect, it } from 'vitest';

import {
  classifyProductionRepairAwareForwardOutcome,
  PRODUCTION_COMPLETE_HISTORY_VERSIONS,
  PRODUCTION_REPAIRED_FORWARD_VERSIONS,
  PRODUCTION_REPAIRED_HISTORY_VERSIONS,
} from '../../../../src/lib/release/production-repair-aware-forward-outcome.mjs';

const sourceSha = 'a'.repeat(40);
const targetBindingSha256 = 'b'.repeat(64);
const attemptId = '11111111-2222-4333-8444-555555555555';
const now = new Date('2026-09-23T12:00:00.000Z');

function attempt(child = { kind: 'exit', code: 0 }) {
  return {
    attemptId,
    sourceSha,
    targetBindingSha256,
    startedAtUtc: '2026-09-23T11:55:00.000Z',
    finishedAtUtc: '2026-09-23T11:56:00.000Z',
    child,
  };
}

function history(versions: string[] | null, physicalState: 'present' | 'absent' = 'present') {
  return { physicalState, versions };
}

function before(versions = [...PRODUCTION_REPAIRED_HISTORY_VERSIONS]) {
  return {
    sourceSha,
    targetBindingSha256,
    attemptId,
    observedAtUtc: '2026-09-23T11:54:00.000Z',
    history: history(versions),
  };
}

function after(versions = [...PRODUCTION_COMPLETE_HISTORY_VERSIONS]) {
  return {
    sourceSha,
    targetBindingSha256,
    attemptId,
    observedAtUtc: '2026-09-23T11:56:01.000Z',
    history: history(versions),
    physicalResult: { state: 'complete', effects: 'known_recorded' },
  };
}

function strictPost() {
  return {
    sourceSha,
    targetBindingSha256,
    attemptId,
    observedAtUtc: '2026-09-23T11:56:02.000Z',
    checkCount: 16,
    failedCheckCount: 0,
    allExpectedVersionsObserved: true,
    preservationProof: { kind: 'explicit_preservation_proof', matched: true },
  };
}

const assess = (value = {}) => classifyProductionRepairAwareForwardOutcome({
  attempt: attempt(), before: before(), after: after(), strictPost: strictPost(), ...value,
}, { now });

describe('Story 22.15 repair-aware production forward outcome', () => {
  it('accepts only the exact 55 repair history followed by the full 68-version result', () => {
    expect(PRODUCTION_REPAIRED_HISTORY_VERSIONS).toHaveLength(55);
    expect(PRODUCTION_REPAIRED_FORWARD_VERSIONS).toHaveLength(13);
    expect(PRODUCTION_COMPLETE_HISTORY_VERSIONS).toHaveLength(68);
    expect(assess()).toEqual({
      schemaVersion: 1,
      kind: 'production-repair-aware-forward-outcome',
      disposition: 'verified_complete_not_authority',
      reason: 'fresh_exact_55_repair_history_and_68_total_history_proven',
    });
  });

  it.each([
    ['a physically absent prehistory', history(null, 'absent')],
    ['a missing repair entry', history(PRODUCTION_REPAIRED_HISTORY_VERSIONS.slice(0, -1))],
    ['a forward version prematurely marked repaired', history([
      ...PRODUCTION_REPAIRED_HISTORY_VERSIONS,
      PRODUCTION_REPAIRED_FORWARD_VERSIONS[0],
    ])],
  ])('stops %s', (_label, repairHistory) => {
    const value = before() as ReturnType<typeof before>;
    value.history = repairHistory;
    expect(assess({ before: value })).toMatchObject({
      disposition: 'stopped_needs_diagnosis',
      reason: 'before_history_not_exact_55_repair_set',
    });
  });

  it.each([
    ['a partial forward history', [...PRODUCTION_REPAIRED_HISTORY_VERSIONS, ...PRODUCTION_REPAIRED_FORWARD_VERSIONS.slice(0, 2)].sort()],
    ['an unknown version', [...PRODUCTION_COMPLETE_HISTORY_VERSIONS, '20990101010101']],
    ['an out-of-order complete set', [
      PRODUCTION_COMPLETE_HISTORY_VERSIONS[1],
      PRODUCTION_COMPLETE_HISTORY_VERSIONS[0],
      ...PRODUCTION_COMPLETE_HISTORY_VERSIONS.slice(2),
    ]],
  ])('stops %s', (_label, versions) => {
    expect(assess({ after: after(versions) })).toMatchObject({
      disposition: 'stopped_needs_diagnosis',
      reason: 'after_history_not_exact_68_complete_set',
    });
  });

  it('stops a committed-but-unrecorded observation and never yields retry authority', () => {
    const value = after();
    value.physicalResult.effects = 'unknown_or_unrecorded';
    const result = assess({ after: value });
    expect(result).toEqual({
      schemaVersion: 1,
      kind: 'production-repair-aware-forward-outcome',
      disposition: 'stopped_needs_diagnosis',
      reason: 'physical_result_unknown_or_unrecorded',
    });
    expect(Object.keys(result)).toEqual(['schemaVersion', 'kind', 'disposition', 'reason']);
  });

  it.each([
    ['timeout', { kind: 'timeout', code: 0 }],
    ['spawn uncertainty', { kind: 'spawn_uncertain', code: 0 }],
    ['physical uncertainty', { kind: 'physical_unknown', code: 0 }],
  ])('stops a %s even with a complete after history', (_label, child) => {
    expect(assess({ attempt: attempt(child) })).toMatchObject({
      disposition: 'stopped_needs_diagnosis',
      reason: 'child_outcome_indeterminate',
    });
  });

  it('stops stale, future, and mixed-binding receipts', () => {
    const stale = after();
    stale.observedAtUtc = '2026-09-23T11:44:59.999Z';
    expect(assess({ after: stale })).toMatchObject({ reason: 'evidence_time_invalid' });

    const future = strictPost();
    future.observedAtUtc = '2026-09-23T12:00:00.001Z';
    expect(assess({ strictPost: future })).toMatchObject({ reason: 'evidence_time_invalid' });

    const mixed = strictPost();
    mixed.targetBindingSha256 = 'c'.repeat(64);
    expect(assess({ strictPost: mixed })).toMatchObject({
      reason: 'source_target_or_attempt_mismatch',
    });
  });

  it('stops malformed dense history arrays without executing getters', () => {
    const hole = [...PRODUCTION_COMPLETE_HISTORY_VERSIONS];
    delete hole[4];
    expect(assess({ after: after(hole) })).toMatchObject({ reason: 'invalid_evidence' });

    const getter = [...PRODUCTION_COMPLETE_HISTORY_VERSIONS];
    Object.defineProperty(getter, '4', {
      enumerable: true,
      get() {
        throw new Error('getter must not execute');
      },
    });
    expect(assess({ after: after(getter) })).toMatchObject({ reason: 'invalid_evidence' });

    const hidden = [...PRODUCTION_COMPLETE_HISTORY_VERSIONS];
    Object.defineProperty(hidden, 'unreviewed', { value: true });
    expect(assess({ after: after(hidden) })).toMatchObject({ reason: 'invalid_evidence' });
  });

  it('requires strict 16/16 post-apply preservation proof', () => {
    const failed = strictPost();
    failed.failedCheckCount = 1;
    expect(assess({ strictPost: failed })).toMatchObject({
      reason: 'strict_post_or_preservation_not_proven',
    });
    const unmatched = strictPost();
    unmatched.preservationProof.matched = false;
    expect(assess({ strictPost: unmatched })).toMatchObject({
      reason: 'strict_post_or_preservation_not_proven',
    });
  });
});
