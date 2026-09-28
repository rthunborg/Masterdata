import { afterEach, describe, expect, it, vi } from 'vitest';

const { spawnSyncMock } = vi.hoisted(() => ({ spawnSyncMock: vi.fn() }));
vi.mock('node:child_process', () => ({
  default: { spawnSync: spawnSyncMock },
  spawnSync: spawnSyncMock,
}));
vi.mock('../../../../supabase/verify/run-reviewed-supabase-cli.mjs', () => ({
  verifyApprovedSupabaseCliExecutable: vi.fn(),
}));
vi.mock('../../../../supabase/verify/verify-production-baseline-catalog.mjs', () => ({
  verifyApprovedPsqlExecutable: vi.fn(() => 'synthetic-psql'),
  verifyApprovedSslRootCertificate: vi.fn(() => 'synthetic-ca'),
}));
vi.mock('../../../../supabase/verify/verify-target-binding.mjs', () => ({
  verifyConfiguredSupabaseTarget: vi.fn(async () => {}),
}));

import { KNOWN_PLATFORM_ROLES, KNOWN_REPLICATION_PLUGINS } from '../../../../src/lib/release/production-database-writer-classification.mjs';
import { productionTargetBindingSha256 } from '../../../../src/lib/release/production-observed-profile.mjs';
import {
  completedProductionManagedWriterBinding,
  collectProductionManagedWriters,
  parseProductionManagedWriterOutputs,
} from '../../../../src/lib/release/collect-production-managed-writers.mjs';

const md5Empty = 'd41d8cd98f00b204e9800998ecf8427e';
const binding = {
  sourceSha: 'a'.repeat(40), sourceTree: 'b'.repeat(40),
  sourceManifestSha256: 'c'.repeat(64), targetBindingSha256: 'd'.repeat(64),
  capturedAtUtc: '2026-09-28T12:00:00.000Z',
};

function output({
  loginHash = '1'.repeat(32), backendHash = '2'.repeat(32),
  rawLoginHash = loginHash, rawBackendHash = backendHash,
} = {}) {
  const knownRole = {
    present: false, canLogin: false, superuser: false, bypassRls: false, ownsPublicSchema: false,
    directMembershipCount: 0, membershipProfileMd5: md5Empty, ownedPublicObjectCount: 0,
    effectiveDatabaseConnect: false, effectivePublicUsage: false, effectivePublicCreate: false,
    effectivePublicInsertRelationCount: 0, effectivePublicUpdateRelationCount: 0,
    effectivePublicDeleteRelationCount: 0, effectivePublicTruncateRelationCount: 0,
    effectivePublicExecuteRoutineCount: 0,
  };
  const inventory = {
    schemaVersion: 1, kind: 'production-database-writer-classification',
    knownRoles: Object.fromEntries(KNOWN_PLATFORM_ROLES.map((role) => [role, { ...knownRole }])),
    unknownLoginRoles: { count: 1, profileMd5: rawLoginHash },
    sessions: {
      totalClientBackendCount: 0,
      knownRoleClientBackendCounts: Object.fromEntries(KNOWN_PLATFORM_ROLES.map((role) => [role, 0])),
      unknownRoleClientBackendCount: 0, unknownRoleClientBackendProfileMd5: md5Empty,
      knownNonclientBackendCount: 0, unknownBackendCount: 2, unknownBackendProfileMd5: rawBackendHash,
    },
    subscriptions: { totalCount: 0, enabledCount: 0 },
    replicationSlots: {
      totalSlotCount: 0, activeSlotCount: 0,
      knownPluginSlotCounts: Object.fromEntries(KNOWN_REPLICATION_PLUGINS.map((plugin) => [plugin, 0])),
      unknownPluginSlotCount: 0, unknownPluginProfileMd5: md5Empty,
    },
    authCustomHooks: {
      authSchemaPresent: false, authTriggerScopeOnlyAuthSchema: true, namedHookCandidateSearchIsNameBounded: true,
      fullAuthConfigurationCoverage: false, customTriggerCount: 0, customTriggerProfileMd5: md5Empty,
      namedHookCandidateCount: 0, namedHookCandidateProfileMd5: md5Empty,
      unrecognizedHookPatternCount: 0, unrecognizedHookPatternProfileMd5: md5Empty,
    },
    publicWebhookTriggers: {
      patternCoverageOnly: true, fullOutboundWriterCoverage: false,
      identifiableTriggerCount: 0, profileMd5: md5Empty,
    },
  };
  const cli = {
    schemaVersion: 1, kind: 'cli-membership-privileges', cliPresentCount: 1,
    cliAttributes: { canLogin: true, superuser: false, inheritRoleAttribute: false, createRole: false, createDb: false, replication: false, bypassRls: false, passwordExpirySpecified: false, passwordExpired: false },
    memberships: { directMembershipCount: 1, directPostgresMembershipCount: 1, otherDirectMembershipCount: 0, postgresDirectAdmin: false, postgresDirectInherit: false, postgresDirectSet: true, postgresMember: true, postgresUsage: false, postgresSet: true, postgresAdmin: false },
    currentDatabase: { connect: true, create: false, temporary: true },
    nonSystemSchemas: { schemaCount: 9, usageCount: 1, createCount: 0, ownedSchemaCount: 0 },
    nonSystemObjects: { ownedRelationCount: 0, ownedRoutineCount: 0, ownedTypeCount: 0, insertCount: 0, updateCount: 0, deleteCount: 0, truncateCount: 0, sequenceUsageCount: 0, sequenceUpdateCount: 0, executeRoutineCount: 102 },
    activeSessionCount: 0, completeNonSecretRoleGraphSha256: 'e'.repeat(64), managedLoginProfileMd5: loginHash,
  };
  const workers = {
    cronLauncherCount: 1, netWorkerCount: 1, otherCandidateBackendCount: 0,
    cronPreloaded: true, netPreloaded: true, cronDatabaseMatchesConnected: true,
    netDatabaseMatchesConnected: true, cronLaunchActiveJobs: true,
    pgCronExtensionCount: 0, pgNetExtensionCount: 0, cronJobTablePresent: false,
    netRequestQueueTablePresent: false, netResponseTablePresent: false, managedBackendProfileMd5: backendHash,
  };
  return [cli, workers, inventory].map((value) => JSON.stringify(value)).join('\n');
}

describe('managed writer raw-inventory correlation parser', () => {
  afterEach(() => {
    spawnSyncMock.mockReset();
    vi.useRealTimers();
  });
  it('binds a long collection to its completion time, never its earlier start', () => {
    const startedAt = new Date('2026-09-28T12:00:00.000Z');
    const completedAt = new Date('2026-09-28T12:00:45.000Z');
    const completed = completedProductionManagedWriterBinding({
      sourceSha: binding.sourceSha,
      sourceTree: binding.sourceTree,
      sourceManifestSha256: binding.sourceManifestSha256,
      targetBindingSha256: binding.targetBindingSha256,
    }, completedAt);
    expect(completed.capturedAtUtc).toBe(completedAt.toISOString());
    expect(Date.parse(completed.capturedAtUtc)).toBeGreaterThan(Date.parse(startedAt.toISOString()));
  });

  it('takes the completion timestamp only after the actual bounded psql child returns', async () => {
    const startedAt = new Date('2026-09-28T12:00:00.000Z');
    const completedAt = new Date('2026-09-28T12:00:45.000Z');
    let returned = false;
    vi.useFakeTimers({ now: startedAt });
    spawnSyncMock.mockImplementation(() => {
      expect(returned).toBe(false);
      returned = true;
      vi.setSystemTime(completedAt);
      return { status: 0, stdout: output() };
    });
    const originalEnvironment = {
      EXPECTED_SUPABASE_ENVIRONMENT: process.env.EXPECTED_SUPABASE_ENVIRONMENT,
      EXPECTED_SUPABASE_PROJECT_REF: process.env.EXPECTED_SUPABASE_PROJECT_REF,
      SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
    };
    Object.assign(process.env, {
      EXPECTED_SUPABASE_ENVIRONMENT: 'production',
      EXPECTED_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
      SUPABASE_DB_URL: 'postgresql://synthetic:synthetic@synthetic.example:5432/postgres',
    });
    try {
      const receipt = await collectProductionManagedWriters({
        workspace: process.cwd(),
        binding: {
          sourceSha: binding.sourceSha, sourceTree: binding.sourceTree,
          sourceManifestSha256: binding.sourceManifestSha256,
          targetBindingSha256: productionTargetBindingSha256('abcdefghijklmnopqrst'),
        },
      });
      expect(returned).toBe(true);
      expect(receipt.capturedAtUtc).toBe(completedAt.toISOString());
      expect(Date.parse(receipt.capturedAtUtc)).toBeGreaterThan(Date.parse(startedAt.toISOString()));
    } finally {
      for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('retains raw unknown counts only after both same-snapshot subset hashes bind', () => {
    const receipt = parseProductionManagedWriterOutputs(output(), binding);
    expect(receipt).toMatchObject({
      rawUnknownLoginRoleCount: 1, rawUnknownBackendCount: 2,
      otherUnknownLoginRoleCount: 0, otherUnknownBackendCount: 0,
      correlation: { cliLoginProfileMd5: '1'.repeat(32), managedBackendProfileMd5: '2'.repeat(32) },
    });
  });

  it.each([
    ['login subset', output({ rawLoginHash: '0'.repeat(32) })],
    ['backend subset', output({ rawBackendHash: '0'.repeat(32) })],
  ])('rejects a mismatched %s profile hash before count subtraction', (_label, value) => {
    expect(() => parseProductionManagedWriterOutputs(value, binding)).toThrow('details suppressed');
  });
});
