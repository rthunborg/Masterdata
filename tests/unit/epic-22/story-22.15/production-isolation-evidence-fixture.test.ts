import { describe, expect, it } from 'vitest';

import { assessProductionMaintenanceIsolation } from '../../../../src/lib/release/production-isolation-gate.mjs';
import {
  createValidIsolationEvidenceFixture,
  createValidManagedIsolationEvidenceFixture,
  ISOLATION_EVIDENCE_FIXTURE_BINDING,
  rebindManagedIsolationEvidenceFixture,
} from '../../../support/production-isolation-evidence-fixture.mjs';

describe('synthetic complete isolation evidence fixture', () => {
  it('is accepted as a fresh bound full receipt set for packet-consumer tests', () => {
    const { isolationContext, isolationReceipts } = createValidIsolationEvidenceFixture();
    expect(isolationContext).toMatchObject(ISOLATION_EVIDENCE_FIXTURE_BINDING);
    expect(assessProductionMaintenanceIsolation(isolationReceipts, {
      expectedContext: isolationContext,
      now: new Date('2026-09-23T14:10:00.000Z'),
    })).toMatchObject({ disposition: 'isolation_proved_not_execution_authority' });
  });

  it.each(['sourceSha', 'targetBindingSha256'] as const)('stops a swapped %s receipt', (field) => {
    const { isolationContext, isolationReceipts } = createValidIsolationEvidenceFixture();
    isolationReceipts.pause[field] = '0'.repeat(field === 'sourceSha' ? 40 : 64);
    expect(assessProductionMaintenanceIsolation(isolationReceipts, {
      expectedContext: isolationContext,
      now: new Date('2026-09-23T14:10:00.000Z'),
    })).toMatchObject({ disposition: 'blocked_insufficient_isolation_proof' });
  });

  it('stops stale evidence', () => {
    const { isolationContext, isolationReceipts } = createValidIsolationEvidenceFixture();
    isolationReceipts.drain.capturedAtUtc = '2026-09-23T13:44:00.000Z';
    expect(assessProductionMaintenanceIsolation(isolationReceipts, {
      expectedContext: isolationContext,
      now: new Date('2026-09-23T14:10:00.000Z'),
    })).toMatchObject({ disposition: 'blocked_insufficient_isolation_proof' });
  });

  it('provides a complete known managed profile for protected consumers and rebinds its nested identity', () => {
    const fixture = createValidManagedIsolationEvidenceFixture();
    const rebound = {
      sourceSha: '9'.repeat(40),
      sourceTree: '8'.repeat(40),
      sourceManifestSha256: '7'.repeat(64),
      targetBindingSha256: '6'.repeat(64),
    };
    rebindManagedIsolationEvidenceFixture(fixture, rebound);

    expect(fixture.isolationReceipts.database).toMatchObject({
      unknownLoginRoleCount: 1,
      unknownBackendCount: 2,
      managedWriterObservation: {
        ...rebound,
        collectionStartedAtUtc: '2026-09-23T13:59:59.000Z',
        capturedAtUtc: '2026-09-23T14:00:00.000Z',
        cli: { presentCount: 1 },
        workers: { cronLauncherCount: 1, netWorkerCount: 1 },
      },
    });
    expect(fixture.isolationContext).toMatchObject(rebound);
  });
});
