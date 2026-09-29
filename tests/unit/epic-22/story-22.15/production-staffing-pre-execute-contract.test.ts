import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assessProductionStaffingPreExecuteProof,
  PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES,
  PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS,
  PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS,
  PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE,
  PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE,
} from '../../../../src/lib/release/production-staffing-pre-execute-contract.mjs';

const sourceSha = 'a'.repeat(40);
const sourceTree = 'b'.repeat(40);
const sourceManifestSha256 = 'c'.repeat(64);
const targetBindingSha256 = 'd'.repeat(64);
const now = new Date('2026-09-28T12:00:00.000Z');

function receipt() {
  return {
    schemaVersion: 1,
    kind: 'production-staffing-pre-execute-observation',
    environment: 'production',
    sourceSha,
    sourceTree,
    sourceManifestSha256,
    targetBindingSha256,
    collectionStartedAtUtc: '2026-09-28T11:54:59.000Z',
    capturedAtUtc: '2026-09-28T11:55:00.000Z',
    routine: {
      signature: PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE,
      exactOverloadCount: 1,
      owner: 'postgres',
      language: 'plpgsql',
      kind: 'function',
      securityDefiner: false,
      config: null,
      nonOwnerExecuteGrantees: [...PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES],
      nonOwnerExecuteGrantOptions: false,
      nonExecuteAclPrivileges: false,
      returnShape: PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE,
      inputArguments: PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS.map((entry) => ({ ...entry })),
      outputArguments: PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS.map((entry) => ({ ...entry })),
      volatility: 'volatile',
      parallel: 'unsafe',
      strict: false,
      leakproof: false,
    },
    dependencies: {
      staffingNeedsColumns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        { name: 'location', type: 'text', nullable: false, default: null },
        { name: 'headcount_need', type: 'integer', nullable: false, default: '0' },
        { name: 'updated_at', type: 'timestamp with time zone', nullable: false, default: 'now()' },
        { name: 'updated_by', type: 'uuid', nullable: true, default: null },
      ],
      staffingChangelogColumns: [
        { name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        { name: 'location', type: 'text', nullable: false, default: null },
        { name: 'old_value', type: 'integer', nullable: false, default: null },
        { name: 'new_value', type: 'integer', nullable: false, default: null },
        { name: 'changed_by', type: 'uuid', nullable: false, default: null },
        { name: 'changed_at', type: 'timestamp with time zone', nullable: false, default: 'now()' },
      ],
      staffingNeedsPrimaryKey: true,
      staffingNeedsLocationUnique: true,
      staffingNeedsLocationCheck: true,
      staffingNeedsHeadcountCheck: true,
      staffingNeedsUpdatedByUsersForeignKey: true,
      staffingChangelogPrimaryKey: true,
      staffingChangelogChangedByUsersForeignKey: true,
      bothTablesRlsEnabled: true,
      outOfRangeHeadcountCount: 0,
    },
    bodyProvenance: { kind: 'non_admitted_sha256', sha256: '0'.repeat(64) },
  };
}

const assess = (value = receipt()) => assessProductionStaffingPreExecuteProof(value, {
  sourceSha,
  sourceTree,
  sourceManifestSha256,
  targetBindingSha256,
  now,
});

describe('Story 22.15 production staffing pre-execute contract', () => {
  it('pins the replacement compatibility contract to the first forward migration', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260314000001_add_update_staffing_need_rpc.sql'), 'utf8');
    expect(sql).toContain('p_location text');
    expect(sql).toContain('p_new_value integer');
    expect(sql).toContain('p_user_id uuid');
    expect(sql).toContain('RETURNS TABLE(old_value integer, new_value integer)');
    expect(sql).toContain('SECURITY DEFINER');
  });

  it('proves only the replacement compatibility and retained ACL contract', () => {
    const result = assess();
    expect(result).toMatchObject({
      disposition: 'staffing_pre_execute_proved_not_execution_authority',
      reason: 'fresh_replacement_compatibility_and_acl_contract_proven',
      bodyProvenanceSha256: '0'.repeat(64),
    });
    expect(Object.keys(result)).not.toContain('bodySemanticsProven');
  });

  it.each([
    ['an unexpected overload', (value: ReturnType<typeof receipt>) => (value.routine.exactOverloadCount = 2)],
    ['definer pre-state', (value: ReturnType<typeof receipt>) => (value.routine.securityDefiner = true)],
    ['a persistent search path', (value: ReturnType<typeof receipt>) => (value.routine.config = ['search_path=public'])],
    ['a missing PUBLIC grant', (value: ReturnType<typeof receipt>) => (value.routine.nonOwnerExecuteGrantees = ['anon', 'authenticated', 'service_role'])],
    ['a grant option', (value: ReturnType<typeof receipt>) => (value.routine.nonOwnerExecuteGrantOptions = true)],
    ['another ACL privilege', (value: ReturnType<typeof receipt>) => (value.routine.nonExecuteAclPrivileges = true)],
    ['an out-of-range headcount', (value: ReturnType<typeof receipt>) => (value.dependencies.outOfRangeHeadcountCount = 1)],
    ['renamed input argument', (value: ReturnType<typeof receipt>) => (value.routine.inputArguments[0].name = 'location')],
    ['missing staffing RLS', (value: ReturnType<typeof receipt>) => (value.dependencies.bothTablesRlsEnabled = false)],
  ])('rejects %s', (_label, mutate) => {
    const value = receipt();
    mutate(value);
    expect(assess(value)).toMatchObject({
      disposition: 'blocked_insufficient_staffing_pre_execute_proof',
    });
  });

  it('refuses to turn an opaque body digest into an acceptance criterion', () => {
    const first = receipt();
    first.bodyProvenance.sha256 = '1'.repeat(64);
    const second = receipt();
    second.bodyProvenance.sha256 = '2'.repeat(64);

    expect(assess(first).disposition).toBe(
      'staffing_pre_execute_proved_not_execution_authority'
    );
    expect(assess(second).disposition).toBe(
      'staffing_pre_execute_proved_not_execution_authority'
    );
  });

  it.each([
    ['a missing collection start', (value: ReturnType<typeof receipt>) => delete (value as Partial<ReturnType<typeof receipt>>).collectionStartedAtUtc, 'source_or_target_mismatch'],
    ['a noncanonical collection start', (value: ReturnType<typeof receipt>) => (value.collectionStartedAtUtc = '2026-09-28 11:54:59Z'), 'evidence_time_invalid'],
    ['a reversed collection interval', (value: ReturnType<typeof receipt>) => (value.collectionStartedAtUtc = '2026-09-28T11:55:00.001Z'), 'evidence_time_invalid'],
    ['a future collection start', (value: ReturnType<typeof receipt>) => (value.collectionStartedAtUtc = '2026-09-28T12:00:00.001Z'), 'evidence_time_invalid'],
    ['a stale start with fresh completion', (value: ReturnType<typeof receipt>) => (value.collectionStartedAtUtc = '2026-09-28T11:44:59.999Z'), 'evidence_time_invalid'],
    ['a stale receipt', (value: ReturnType<typeof receipt>) => (value.capturedAtUtc = '2026-09-28T11:44:59.999Z'), 'evidence_time_invalid'],
    ['a target mismatch', (value: ReturnType<typeof receipt>) => (value.targetBindingSha256 = '9'.repeat(64)), 'source_or_target_mismatch'],
    ['an unreviewed receipt field', (value: ReturnType<typeof receipt>) => Object.assign(value, { bodySemanticsProven: true }), 'source_or_target_mismatch'],
    ['a malformed provenance kind', (value: ReturnType<typeof receipt>) => (value.bodyProvenance.kind = 'semantic_proof'), 'body_provenance_invalid'],
  ])('stops %s', (_label, mutate, reason) => {
    const value = receipt();
    mutate(value);
    expect(assess(value)).toMatchObject({ reason });
  });
});
