import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createValidManagedIsolationEvidenceFixture,
  rebindManagedIsolationEvidenceFixture,
} from '../../../support/production-isolation-evidence-fixture.mjs';

import {
  verifyProtectedCutoverPacket,
} from '../../../../src/lib/release/protected-production-cutover-worker.mjs';
import {
  createProtectedProductionCutoverExecutor,
} from '../../../../supabase/verify/run-reviewed-supabase-cli.mjs';
import { PRODUCTION_OBSERVED_PROFILE_BASELINE, PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA, productionTargetBindingSha256 } from '../../../../src/lib/release/production-observed-profile.mjs';
import {
  PRODUCTION_STAFFING_PRE_EXECUTE_GRANTEES,
  PRODUCTION_STAFFING_PRE_EXECUTE_INPUT_ARGUMENTS,
  PRODUCTION_STAFFING_PRE_EXECUTE_OUTPUT_ARGUMENTS,
  PRODUCTION_STAFFING_PRE_EXECUTE_RETURN_SHAPE,
  PRODUCTION_STAFFING_PRE_EXECUTE_SIGNATURE,
} from '../../../../src/lib/release/production-staffing-pre-execute-contract.mjs';

const nonce = '0'.repeat(64);
const sourceSha = 'a'.repeat(40);
const sourceTree = 'b'.repeat(40);
const sourceManifestSha256 = 'c'.repeat(64);
const targetBindingSha256 = productionTargetBindingSha256('abcdefghijklmnopqrst');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-09-23T14:10:00.000Z') }));
afterEach(() => vi.useRealTimers());

function request() {
  const fixture = createValidManagedIsolationEvidenceFixture();
  const { isolationReceipts, isolationContext } = fixture;
  rebindManagedIsolationEvidenceFixture(fixture, {
    sourceSha,
    sourceTree,
    sourceManifestSha256,
    targetBindingSha256,
  });
  Object.assign(isolationReceipts.database.managedWriterObservation, {
    collectionStartedAtUtc: '2026-09-23T14:05:10.000Z',
    capturedAtUtc: '2026-09-23T14:05:30.000Z',
  });
  isolationReceipts.database.collectionStartedAtUtc = '2026-09-23T14:06:00.000Z';
  isolationReceipts.database.capturedAtUtc = '2026-09-23T14:06:01.000Z';
  isolationReceipts.drain.collectionStartedAtUtc = '2026-09-23T14:07:00.000Z';
  isolationReceipts.drain.capturedAtUtc = '2026-09-23T14:07:01.000Z';
  const preForwardObservation = {
    schemaVersion: 1, kind: 'production-observed-profile', profilePhase: 'post_cleanup',
    collectionStartedAtUtc: '2026-09-23T14:04:45.000Z',
    capturedAtUtc: '2026-09-23T14:05:00.000Z', sourceSha,
    baselineSourceSha: PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA, targetBindingSha256,
    ...structuredClone(PRODUCTION_OBSERVED_PROFILE_BASELINE),
  };
  preForwardObservation.aggregate.saved_filter_data.total_count = 0;
  preForwardObservation.aggregate.saved_filter_data.orphan_auth_reference_count = 0;
  preForwardObservation.aggregate.saved_filter_data.row_identity_sha256 =
    '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
  return {
    schemaVersion: 1,
    operation: 'apply-forward-14',
    nonce,
    workspace: process.cwd(),
    environment: {
      EXPECTED_SUPABASE_ENVIRONMENT: 'production',
      EXPECTED_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
      SUPABASE_DB_CONNECTION_MODE: 'session-pooler',
      EXPECTED_SUPABASE_POOLER_HOST: 'redacted',
      SUPABASE_DB_URL: 'postgresql:///postgres',
      SUPABASE_SSL_ROOT_CERT: 'redacted',
      EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256: 'e'.repeat(64),
      SUPABASE_CLI_EXECUTABLE: 'C:\\reviewed\\supabase.exe',
      EXPECTED_SUPABASE_CLI_SHA256: 'f'.repeat(64),
      SystemRoot: 'C:\\Windows',
      WINDIR: 'C:\\Windows',
      PATH: 'C:\\Windows\\System32',
    },
    sourceSha,
    sourceTree,
    sourceManifestSha256,
    targetBindingSha256,
    preForwardObservation,
    reviewRecords: {
      backupRecordSha256: '3'.repeat(64), cleanupRecordSha256: '4'.repeat(64),
      cleanupStartedAtUtc: '2026-09-23T14:04:00.000Z',
      cleanupCompletedAtUtc: '2026-09-23T14:04:00.000Z',
    },
    staffingReceipt: {
      schemaVersion: 1,
      kind: 'production-staffing-pre-execute-observation',
      environment: 'production',
      sourceSha,
      sourceTree,
      sourceManifestSha256,
      targetBindingSha256,
      reconciliationExecuteVersion: '20260930091123',
      collectionStartedAtUtc: '2026-09-23T14:04:45.000Z',
      capturedAtUtc: '2026-09-23T14:05:00.000Z',
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
        staffingNeedsUpdatedByUsersForeignKeyProfile: {
          foreignKeyCount: 1,
          name: 'staffing_needs_updated_by_fkey',
          sourceColumn: 'updated_by',
          referencedSchema: 'public',
          referencedTable: 'users',
          referencedColumn: 'id',
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
          matchType: 'SIMPLE',
          validated: true,
          deferrable: false,
          initiallyDeferred: false,
        },
        staffingChangelogPrimaryKey: true,
        staffingChangelogChangedByUsersForeignKey: true,
        bothTablesRlsEnabled: true,
        outOfRangeHeadcountCount: 0,
        nonNullUpdatedByCount: 0,
        orphanPublicUsersCount: 0,
        orphanAuthUsersCount: 0,
      },
      bodyProvenance: { kind: 'non_admitted_sha256', sha256: '1'.repeat(64) },
    },
    isolationReceipts,
    isolationContext,
  };
}

function envelope(value = request()) {
  const payload = Buffer.from(JSON.stringify(value), 'utf8');
  return JSON.stringify({
    payload: payload.toString('base64'),
    signature: sign('RSA-SHA256', payload, privateKey).toString('base64'),
  });
}

describe('Story 22.15 protected production cutover worker packet', () => {
  it('does not expose a caller-importable capability without the installed origin-signed packet', () => {
    expect(() => createProtectedProductionCutoverExecutor({
      packet: JSON.stringify({ payload: '', signature: '' }),
      nonce,
      workspace: process.cwd(),
    })).toThrow('Protected production cutover capability is unavailable');
  });

  it('accepts a signed exact packet only with the complete fresh isolation receipt set', () => {
    expect(verifyProtectedCutoverPacket(envelope(), nonce, publicKey)).toMatchObject({
      operation: 'apply-forward-14', targetBindingSha256,
    });
  });

  it.each([
    ['a cleanup operation', (value: ReturnType<typeof request>) => (value.operation = 'cleanup-orphan-user-filters')],
    ['a repair operation', (value: ReturnType<typeof request>) => (value.operation = 'repair-history-55')],
    ['a caller approval flag', (value: ReturnType<typeof request>) => Object.assign(value, { ownerApproved: true })],
    ['an absent backup binding', (value: ReturnType<typeof request>) => Object.assign(value.reviewRecords, { backupRecordSha256: '' })],
    ['a missing cleanup start time', (value: ReturnType<typeof request>) => delete value.reviewRecords.cleanupStartedAtUtc],
    ['an initial isolation control completed when cleanup starts', (value: ReturnType<typeof request>) => (value.isolationReceipts.pause.capturedAtUtc = '2026-09-23T14:04:00.000Z')],
    ['a missing cleanup completion time', (value: ReturnType<typeof request>) => delete value.reviewRecords.cleanupCompletedAtUtc],
    ['a noncanonical cleanup completion time', (value: ReturnType<typeof request>) => (value.reviewRecords.cleanupCompletedAtUtc = '2026-09-23 14:04:00Z')],
    ['a future cleanup completion time', (value: ReturnType<typeof request>) => (value.reviewRecords.cleanupCompletedAtUtc = '2026-09-23T14:11:00.000Z')],
    ['a profile collected before cleanup completed', (value: ReturnType<typeof request>) => (value.preForwardObservation.capturedAtUtc = '2026-09-23T14:04:00.000Z')],
    ['a staffing receipt collected before cleanup completed', (value: ReturnType<typeof request>) => (value.staffingReceipt.capturedAtUtc = '2026-09-23T14:03:59.000Z')],
    ['a profile starting before cleanup and completing afterward', (value: ReturnType<typeof request>) => (value.preForwardObservation.collectionStartedAtUtc = '2026-09-23T14:03:59.999Z')],
    ['staffing starting before cleanup and completing afterward', (value: ReturnType<typeof request>) => (value.staffingReceipt.collectionStartedAtUtc = '2026-09-23T14:03:59.999Z')],
    ['a profile starting when cleanup completes', (value: ReturnType<typeof request>) => (value.preForwardObservation.collectionStartedAtUtc = '2026-09-23T14:04:00.000Z')],
    ['staffing starting when cleanup completes', (value: ReturnType<typeof request>) => (value.staffingReceipt.collectionStartedAtUtc = '2026-09-23T14:04:00.000Z')],
    ['a missing managed-writer classification', (value: ReturnType<typeof request>) => delete value.isolationReceipts.database.managedWriterObservation],
    ['a managed-writer collection begun before cleanup completed', (value: ReturnType<typeof request>) => (value.isolationReceipts.database.managedWriterObservation.collectionStartedAtUtc = '2026-09-23T14:04:00.000Z')],
    ['a managed-writer collection overlapping the final database collection', (value: ReturnType<typeof request>) => (value.isolationReceipts.database.managedWriterObservation.capturedAtUtc = '2026-09-23T14:06:00.000Z')],
    ['a final database collection started before the post-cleanup profile completed', (value: ReturnType<typeof request>) => (value.isolationReceipts.database.collectionStartedAtUtc = '2026-09-23T14:05:00.000Z')],
    ['a final database observation overlapping the drain', (value: ReturnType<typeof request>) => (value.isolationReceipts.drain.collectionStartedAtUtc = '2026-09-23T14:06:01.000Z')],
    ['a stale final database observation', (value: ReturnType<typeof request>) => (value.isolationReceipts.database.capturedAtUtc = '2026-09-23T13:00:00.000Z')],
    ['a stale drain observation', (value: ReturnType<typeof request>) => (value.isolationReceipts.drain.capturedAtUtc = '2026-09-23T13:00:00.000Z')],
    ['an uncleaned filter profile', (value: ReturnType<typeof request>) => { value.preForwardObservation.aggregate.saved_filter_data.total_count = 48; }],
    ['a stale full catalog profile', (value: ReturnType<typeof request>) => { value.preForwardObservation.capturedAtUtc = '2026-09-23T13:00:00.000Z'; }],
    ['a known-failure group omitted', (value: ReturnType<typeof request>) => { value.preForwardObservation.strictCatalog.failedChecks.pop(); }],
    ['an already bootstrapped history', (value: ReturnType<typeof request>) => { value.preForwardObservation.aggregate.history.table_exists = true; }],
    ['an omitted source-tree isolation binding', (value: ReturnType<typeof request>) => { Object.assign(value.isolationContext, { sourceTree: undefined }); }],
    ['a summary-only isolation claim', (value: ReturnType<typeof request>) => Object.assign(value, { isolationAssessment: { disposition: 'isolation_proved_not_execution_authority' } })],
    ['a stale isolation receipt', (value: ReturnType<typeof request>) => (value.isolationReceipts.pause.capturedAtUtc = '2026-09-23T13:00:00.000Z')],
    ['a target-swapped isolation receipt', (value: ReturnType<typeof request>) => (value.isolationReceipts.database.targetBindingSha256 = '9'.repeat(64))],
    ['a source-swapped isolation context', (value: ReturnType<typeof request>) => (value.isolationContext.sourceSha = '9'.repeat(40))],
    ['an entirely swapped isolation proof', (value: ReturnType<typeof request>) => {
      value.isolationContext.sourceSha = '9'.repeat(40);
      value.isolationContext.targetBindingSha256 = '8'.repeat(64);
      for (const receipt of Object.values(value.isolationReceipts)) {
        receipt.sourceSha = '9'.repeat(40);
        receipt.targetBindingSha256 = '8'.repeat(64);
      }
    }],
    ['a staffing body semantic assertion', (value: ReturnType<typeof request>) => Object.assign(value.staffingReceipt, { bodySemanticsProven: true })],
  ])('refuses %s before a CLI command can be selected', (_label, mutate) => {
    const value = request();
    mutate(value);
    expect(() => verifyProtectedCutoverPacket(envelope(value), nonce, publicKey)).toThrow(
      'Protected production cutover refused'
    );
  });

  it('refuses a packet signed by another origin', () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const payload = Buffer.from(JSON.stringify(request()), 'utf8');
    const forged = JSON.stringify({
      payload: payload.toString('base64'),
      signature: sign('RSA-SHA256', payload, other.privateKey).toString('base64'),
    });
    expect(() => verifyProtectedCutoverPacket(forged, nonce, publicKey)).toThrow(
      'Protected production cutover refused'
    );
  });
});
