import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  KNOWN_PLATFORM_ROLES,
  KNOWN_REPLICATION_PLUGINS,
  assertDatabaseWriterClassificationSql,
  classifyWriterIsolation,
  parseDatabaseWriterClassification,
} from '../../../../src/lib/release/production-database-writer-classification.mjs';

const md5 = 'a'.repeat(32);
const sqlPath = resolve(
  process.cwd(),
  'src/lib/release/production-database-writer-classification.sql'
);

function receipt() {
  const knownRole = (role: string) => ({
    present: role !== 'supabase_functions_admin',
    canLogin: role === 'postgres',
    superuser: false,
    bypassRls: role === 'service_role',
    ownsPublicSchema: role === 'postgres',
    directMembershipCount: 0,
    membershipProfileMd5: md5,
    ownedPublicObjectCount: role === 'postgres' ? 12 : 0,
    effectiveDatabaseConnect: role !== 'supabase_functions_admin',
    effectivePublicUsage: role !== 'supabase_functions_admin',
    effectivePublicCreate: role === 'postgres',
    effectivePublicInsertRelationCount: role === 'postgres' ? 3 : 0,
    effectivePublicUpdateRelationCount: role === 'postgres' ? 3 : 0,
    effectivePublicDeleteRelationCount: role === 'postgres' ? 3 : 0,
    effectivePublicTruncateRelationCount: role === 'postgres' ? 3 : 0,
    effectivePublicExecuteRoutineCount: role === 'postgres' ? 7 : 0,
  });
  return {
    schemaVersion: 1,
    kind: 'production-database-writer-classification',
    knownRoles: Object.fromEntries(
      KNOWN_PLATFORM_ROLES.map((role) => [role, knownRole(role)])
    ),
    // Current captured unknown surfaces remain unresolved and therefore block proof.
    unknownLoginRoles: { count: 5, profileMd5: md5 },
    sessions: {
      totalClientBackendCount: 5,
      knownRoleClientBackendCounts: Object.fromEntries(
        KNOWN_PLATFORM_ROLES.map((role) => [
          role,
          role === 'postgres'
            ? 1
            : role === 'authenticator'
              ? 1
              : role === 'supabase_admin'
                ? 2
                : 0,
        ])
      ),
      unknownRoleClientBackendCount: 1,
      unknownRoleClientBackendProfileMd5: md5,
      knownNonclientBackendCount: 0,
      unknownBackendCount: 2,
      unknownBackendProfileMd5: md5,
    },
    subscriptions: { totalCount: 0, enabledCount: 0 },
    replicationSlots: {
      totalSlotCount: 1,
      activeSlotCount: 1,
      knownPluginSlotCounts: Object.fromEntries(
        KNOWN_REPLICATION_PLUGINS.map((plugin) => [
          plugin,
          plugin === 'pgoutput' ? 1 : 0,
        ])
      ),
      unknownPluginSlotCount: 0,
      unknownPluginProfileMd5: md5,
    },
    authCustomHooks: {
      authSchemaPresent: true,
      authTriggerScopeOnlyAuthSchema: true,
      namedHookCandidateSearchIsNameBounded: true,
      fullAuthConfigurationCoverage: false,
      customTriggerCount: 0,
      customTriggerProfileMd5: md5,
      namedHookCandidateCount: 0,
      namedHookCandidateProfileMd5: md5,
      unrecognizedHookPatternCount: 0,
      unrecognizedHookPatternProfileMd5: md5,
    },
    publicWebhookTriggers: {
      patternCoverageOnly: true,
      fullOutboundWriterCoverage: false,
      identifiableTriggerCount: 0,
      profileMd5: md5,
    },
  };
}

const parse = (value: unknown) =>
  parseDatabaseWriterClassification(`${JSON.stringify(value)}\n`);

describe('Story 22.15 database writer classification', () => {
  it('contains the fixed platform role and current-database reader-only SQL profile', () => {
    const sql = readFileSync(sqlPath, 'utf8');
    expect(assertDatabaseWriterClassificationSql(sql)).toBe(true);
    expect(sql).toMatch(/pg_auth_members/);
    expect(sql).toMatch(/subdbid\s*=\s*\(SELECT database_row\.oid/);
    expect(sql).toMatch(/pg_replication_slots/);
    expect((sql.match(/WHERE role_row\.oid IS NOT NULL/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(sql).toMatch(/ROLLBACK;\s*$/);
  });

  it('classifies the current five-login, one-client, two-backend unresolved receipt without writer authority', () => {
    const result = classifyWriterIsolation(`${JSON.stringify(receipt())}\n`);
    expect(result).toEqual({
      classificationOnly: true,
      exactIsolationProved: false,
      unknownPrincipalOrBackendPresent: true,
      activeSubscriptionPresent: false,
      requiresOwnerDecision: true,
      completeAuthConfigurationCoverage: false,
      completeOutboundWriterCoverage: false,
    });
  });

  it('requires an owner decision for an enabled subscription even without unknown principals or backends', () => {
    const value = receipt();
    value.unknownLoginRoles.count = 0;
    value.sessions.totalClientBackendCount = 4;
    value.sessions.unknownRoleClientBackendCount = 0;
    value.sessions.unknownBackendCount = 0;
    value.subscriptions.totalCount = 1;
    value.subscriptions.enabledCount = 1;

    expect(classifyWriterIsolation(`${JSON.stringify(value)}\n`)).toMatchObject({
      unknownPrincipalOrBackendPresent: false,
      activeSubscriptionPresent: true,
      requiresOwnerDecision: true,
      exactIsolationProved: false,
    });
  });

  it('rejects an absent known role that reports effective writer privileges', () => {
    const value = receipt();
    value.knownRoles.supabase_functions_admin.effectivePublicInsertRelationCount = 1;
    expect(() => parse(value)).toThrow(/writer_classification_known_roles_invalid/);
  });

  it.each([
    ['malformed JSON', '{not-json}'],
    ['a raw unknown-session field', { ...receipt(), sessions: { ...receipt().sessions, clientIp: '203.0.113.1' } }],
    ['a negative unknown login count', { ...receipt(), unknownLoginRoles: { count: -1, profileMd5: md5 } }],
    ['a null unknown backend count', { ...receipt(), sessions: { ...receipt().sessions, unknownBackendCount: null } }],
  ])('rejects %s before a classification is accepted', (_label, value) => {
    if (typeof value === 'string') {
      expect(() => parseDatabaseWriterClassification(value)).toThrow(/writer_classification_output_invalid/);
    } else {
      expect(() => parse(value)).toThrow(/writer_classification_/);
    }
  });

  it.each([
    ['auth scope represented as complete', (value: ReturnType<typeof receipt>) => { value.authCustomHooks.fullAuthConfigurationCoverage = true; }],
    ['outbound webhook scope represented as complete', (value: ReturnType<typeof receipt>) => { value.publicWebhookTriggers.fullOutboundWriterCoverage = true; }],
    ['unknown plugin total that no longer reconciles', (value: ReturnType<typeof receipt>) => { value.replicationSlots.unknownPluginSlotCount = 1; }],
  ])('rejects unsafe coverage or unknown-count claims: %s', (_label, mutate) => {
    const value = receipt();
    mutate(value);
    expect(() => parse(value)).toThrow(/writer_classification_(auth_hooks|webhooks|replication)_invalid/);
  });

  it('rejects mutation, psql meta commands, and session termination in candidate SQL', () => {
    expect(() => assertDatabaseWriterClassificationSql(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; DELETE FROM public.users; ROLLBACK;'
    )).toThrow(/writer_classification_sql_not_readonly/);
    expect(() => assertDatabaseWriterClassificationSql(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;\\dt\nROLLBACK;'
    )).toThrow(/writer_classification_sql_not_readonly/);
    expect(() => assertDatabaseWriterClassificationSql(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_terminate_backend(1); ROLLBACK;'
    )).toThrow(/writer_classification_sql_not_readonly/);
  });
});
