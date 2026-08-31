/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as supabaseServer from '@/lib/supabase/server';
import {
  claimOmcMasterdataReminder,
  evaluateOmcMasterdataCompletion,
  releaseOmcMasterdataReminderClaims,
  sendOmcMasterdataReminderDigest,
} from '@/lib/services/omc-masterdata-reminder';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/omc-masterdata-reminder', () => ({
  claimOmcMasterdataReminder: vi.fn(),
  evaluateOmcMasterdataCompletion: vi.fn(),
  getStockholmCalendarDate: vi.fn(() => '2026-08-27'),
  omcReminderEmployeeSchema: { parse: vi.fn((value) => value) },
  releaseOmcMasterdataReminderClaims: vi.fn(),
  sendOmcMasterdataReminderDigest: vi.fn(),
}));

function employee(id: string) {
  return {
    id,
    first_name: 'Test',
    surname: 'Employee',
    omc_date: `omc-${id}`,
    is_terminated: false,
    is_archived: false,
    omc_masterdata_reminder_sent_at: null,
    one: false,
    talmundo: true,
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: null,
    c17: true,
    loneiva: 2,
  };
}

function employeePage(data: unknown[]) {
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gt = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn().mockResolvedValue({ data, error: null });
  return chain;
}

function mockEmployeeQuery(employees: unknown[]) {
  const from = vi
    .fn()
    .mockReturnValueOnce(employeePage(employees))
    .mockReturnValueOnce(employeePage([]));
  vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({ from } as any);
}

function authorizedRequest() {
  return new NextRequest('http://localhost/api/cron/omc-masterdata-reminder', {
    headers: { authorization: 'Bearer route-test-secret' },
  });
}

describe('Story 22.14 route claim and cleanup failures', () => {
  const previousCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'route-test-secret';
    vi.mocked(evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
  });

  afterEach(() => {
    if (previousCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousCronSecret;
    }
  });

  it('continues after a rejected claim and returns aggregate non-success', async () => {
    const employees = [employee('employee-1'), employee('employee-2')];
    mockEmployeeQuery(employees);
    vi.mocked(claimOmcMasterdataReminder)
      .mockRejectedValueOnce(new Error('claim failed'))
      .mockResolvedValueOnce({ status: 'claimed', claimTimestamp: '2026-08-27T07:00:00.000Z' });
    vi.mocked(sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 1,
      successfulRecipientDeliveries: 1,
      failedRecipientDeliveries: 0,
      outcome: 'success',
    });

    const { GET } = await import('@/app/api/cron/omc-masterdata-reminder/route');
    const response = await GET(authorizedRequest());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      success: false,
      stats: {
        totalEmployees: 2,
        evaluated: 2,
        eligible: 2,
        claimed: 1,
        digestCandidates: 1,
        processingErrors: 1,
      },
      errorDetails: [{ stage: 'claim', count: 1 }],
    });
    expect(claimOmcMasterdataReminder).toHaveBeenCalledTimes(2);
    expect(sendOmcMasterdataReminderDigest).toHaveBeenCalledWith([
      expect.objectContaining({ employee: employees[1] }),
    ]);
  });

  it('releases every exact shared-timestamp claim after resolved total delivery failure', async () => {
    const employees = [employee('employee-1'), employee('employee-2')];
    mockEmployeeQuery(employees);
    vi.mocked(claimOmcMasterdataReminder).mockImplementation(async (_candidate, timestamp) => ({
      status: 'claimed',
      claimTimestamp: timestamp,
    }));
    vi.mocked(sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 2,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 2,
      outcome: 'total-failure',
    });
    vi.mocked(releaseOmcMasterdataReminderClaims).mockResolvedValue({
      releasedClaims: 2,
      releaseErrors: 0,
    });

    const { GET } = await import('@/app/api/cron/omc-masterdata-reminder/route');
    const response = await GET(authorizedRequest());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      success: false,
      stats: {
        totalEmployees: 2,
        evaluated: 2,
        eligible: 2,
        claimed: 2,
        digestCandidates: 2,
        successfulRecipientDeliveries: 0,
        failedRecipientDeliveries: 2,
        releasedClaims: 2,
      },
      errorDetails: [{ stage: 'delivery', count: 2 }],
    });
    expect(releaseOmcMasterdataReminderClaims).toHaveBeenCalledTimes(1);
    const releasedCandidates = vi.mocked(releaseOmcMasterdataReminderClaims).mock.calls[0][0];
    expect(releasedCandidates).toHaveLength(2);
    expect(releasedCandidates.map(({ employee: value }) => value.id)).toEqual([
      'employee-1',
      'employee-2',
    ]);
    const claimTimestamps = new Set(releasedCandidates.map(({ claimTimestamp }) => claimTimestamp));
    expect(claimTimestamps.size).toBe(1);
    expect([...claimTimestamps][0]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
