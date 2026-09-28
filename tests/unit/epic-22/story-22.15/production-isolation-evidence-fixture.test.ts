import { describe, expect, it } from 'vitest';

import { assessProductionMaintenanceIsolation } from '../../../../src/lib/release/production-isolation-gate.mjs';
import {
  createValidIsolationEvidenceFixture,
  ISOLATION_EVIDENCE_FIXTURE_BINDING,
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
});
