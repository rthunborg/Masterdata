/* eslint-disable @typescript-eslint/no-explicit-any */
/** Story 14.1 route contract superseded by Story 22.14. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/omc-masterdata-reminder/route';
import * as supabaseServer from '@/lib/supabase/server';
import * as reminderService from '@/lib/services/omc-masterdata-reminder';
import type { OmcReminderEmployee } from '@/lib/services/omc-masterdata-reminder';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/omc-masterdata-reminder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/omc-masterdata-reminder')>();
  return {
    ...actual,
    evaluateOmcMasterdataCompletion: vi.fn(),
    claimOmcMasterdataReminder: vi.fn(),
    sendOmcMasterdataReminderDigest: vi.fn(),
    releaseOmcMasterdataReminderClaims: vi.fn(),
  };
});

function employee(id: string): OmcReminderEmployee {
  return {
    id,
    first_name: `Name-${id}`,
    surname: `Surname-${id}`,
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

const REMINDER_EMPLOYEE_COLUMNS = [
  'id',
  'first_name',
  'surname',
  'omc_date',
  'is_terminated',
  'is_archived',
  'omc_masterdata_reminder_sent_at',
  'one',
  'talmundo',
  'isps',
  'photo',
  'origo',
  'mail_lon',
  'bankuppgifter',
  'li',
  'passport',
  'kvitto_c17_18',
  'c17',
  'loneiva',
].join(',');

interface MockEmployeeQueryPage {
  data: unknown;
  error?: unknown;
}

function mockEmployeePages(pages: MockEmployeeQueryPage[]) {
  let pageIndex = 0;
  const limit = vi.fn(async () => {
    const page = pages[pageIndex] ?? { data: [], error: null };
    pageIndex += 1;
    return { data: page.data, error: page.error ?? null };
  });
  const order = vi.fn(() => ({ limit }));
  const queryTail: { gt: ReturnType<typeof vi.fn>; order: typeof order } = {
    gt: vi.fn(),
    order,
  };
  queryTail.gt.mockImplementation(() => queryTail);
  const archivedFilter = vi.fn(() => queryTail);
  const terminatedFilter = vi.fn(() => ({ eq: archivedFilter }));
  const omcFilter = vi.fn(() => ({ eq: terminatedFilter }));
  const select = vi.fn(() => ({ not: omcFilter }));
  const mockSupabase = { from: vi.fn(() => ({ select })) };
  vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
  return {
    mockSupabase,
    select,
    omcFilter,
    terminatedFilter,
    archivedFilter,
    gt: queryTail.gt,
    order,
    limit,
  };
}

function mockEmployeeQuery(data: unknown, error: unknown = null) {
  return mockEmployeePages([{ data, error }]);
}

function request(token: string | null = 'test-secret') {
  return new NextRequest('http://localhost/api/cron/omc-masterdata-reminder', {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe('ÖMC reminder cron Story 22.14 contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.stubEnv('NODE_ENV', 'test');
    vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mockResolvedValue({
      releasedClaims: 0,
      releaseErrors: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('keeps cron authentication unchanged', async () => {
    const response = await GET(request('wrong-secret'));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('rejects a request with no Authorization header when CRON_SECRET is configured', async () => {
    const response = await GET(request(null));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(supabaseServer.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('rejects production requests when CRON_SECRET is missing', async () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');

    const response = await GET(request(null));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(supabaseServer.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('returns a clean successful run and sends nothing when there are no candidates', async () => {
    const query = mockEmployeeQuery([]);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats).toEqual({
      totalEmployees: 0,
      fetchedEmployees: 0,
      evaluated: 0,
      eligible: 0,
      claimed: 0,
      suppressedClaims: 0,
      digestCandidates: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      releasedClaims: 0,
      processingErrors: 0,
    });
    expect(query.omcFilter).toHaveBeenCalledWith('omc_date', 'is', null);
    expect(query.terminatedFilter).toHaveBeenCalledWith('is_terminated', false);
    expect(query.archivedFilter).toHaveBeenCalledWith('is_archived', false);
    expect(query.select).toHaveBeenCalledWith(REMINDER_EMPLOYEE_COLUMNS);
    expect(query.order).toHaveBeenCalledWith('id', { ascending: true });
    expect(query.limit).toHaveBeenCalledWith(1000);
    expect(reminderService.sendOmcMasterdataReminderDigest).not.toHaveBeenCalled();
  });

  it('uses employee-id keyset pagination so a lower hosted max-row cap cannot truncate the run', async () => {
    const firstPage = [employee('employee-0'), employee('employee-1')];
    const secondPage = [employee('employee-2')];
    const query = mockEmployeePages([
      { data: firstPage },
      { data: secondPage },
    ]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: false,
      missingFields: [],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toMatchObject({ totalEmployees: 3, evaluated: 3 });
    expect(query.order).toHaveBeenCalledTimes(3);
    expect(query.order).toHaveBeenNthCalledWith(1, 'id', { ascending: true });
    expect(query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true });
    expect(query.order).toHaveBeenNthCalledWith(3, 'id', { ascending: true });
    expect(query.gt.mock.calls).toEqual([
      ['id', 'employee-1'],
      ['id', 'employee-2'],
    ]);
    expect(query.limit.mock.calls).toEqual([[1000], [1000], [1000]]);
  });

  it('fails the whole employee query when a later page fails', async () => {
    const firstPage = [employee('employee-0'), employee('employee-1')];
    mockEmployeePages([
      { data: firstPage },
      { data: null, error: { message: 'private database failure' } },
    ]);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      totalEmployees: null,
      fetchedEmployees: 2,
      evaluated: 0,
      processingErrors: 1,
    });
    expect(body.errorDetails).toEqual([{ stage: 'employee-query', count: 1 }]);
    expect(reminderService.evaluateOmcMasterdataCompletion).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('private database failure');
  });

  it('fails safely when a page does not advance the employee-id cursor', async () => {
    const query = mockEmployeePages([
      { data: [employee('employee-1')] },
      { data: [employee('employee-1')] },
    ]);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      totalEmployees: null,
      fetchedEmployees: 1,
      evaluated: 0,
      processingErrors: 1,
    });
    expect(body.errorDetails).toEqual([{ stage: 'employee-query', count: 1 }]);
    expect(query.gt).toHaveBeenCalledTimes(1);
    expect(query.gt).toHaveBeenCalledWith('id', 'employee-1');
    expect(query.limit).toHaveBeenCalledTimes(2);
    expect(reminderService.evaluateOmcMasterdataCompletion).not.toHaveBeenCalled();
  });

  it('fails the employee query when a page returns a non-array payload', async () => {
    mockEmployeeQuery({ id: 'unexpected-object' });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.errorDetails).toEqual([{ stage: 'employee-query', count: 1 }]);
    expect(reminderService.evaluateOmcMasterdataCompletion).not.toHaveBeenCalled();
  });

  it('returns an observable non-2xx failure for an employee-query error', async () => {
    mockEmployeeQuery(null, { message: 'database failed' });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.stats.processingErrors).toBe(1);
    expect(body.errorDetails).toEqual([{ stage: 'employee-query', count: 1 }]);
    expect(JSON.stringify(body)).not.toContain('database failed');
  });

  it('evaluates N employees, claims eligible assignments, and sends one digest', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T22:30:00.000Z'));
    const employees = [employee('employee-1'), employee('employee-2')];
    mockEmployeeQuery(employees);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion)
      .mockResolvedValueOnce({
        shouldNotify: true,
        missingFields: ['one'],
        omcDateValue: '2026-08-20',
        elapsedDays: 7,
      })
      .mockResolvedValueOnce({
        shouldNotify: false,
        missingFields: [],
        omcDateValue: '2026-08-20',
        elapsedDays: 7,
      });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 2,
      successfulRecipientDeliveries: 2,
      failedRecipientDeliveries: 0,
      outcome: 'success',
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats).toMatchObject({
      totalEmployees: 2,
      evaluated: 2,
      eligible: 1,
      claimed: 1,
      digestCandidates: 1,
      successfulRecipientDeliveries: 2,
      failedRecipientDeliveries: 0,
    });
    expect(reminderService.sendOmcMasterdataReminderDigest).toHaveBeenCalledTimes(1);
    expect(reminderService.sendOmcMasterdataReminderDigest).toHaveBeenCalledWith([
      expect.objectContaining({ employee: employees[0], claimTimestamp: expect.any(String) }),
    ]);
    expect(reminderService.evaluateOmcMasterdataCompletion).toHaveBeenNthCalledWith(
      1,
      employees[0],
      '2026-08-30'
    );
    expect(reminderService.evaluateOmcMasterdataCompletion).toHaveBeenNthCalledWith(
      2,
      employees[1],
      '2026-08-30'
    );
  });

  it('treats contention as clean suppression rather than a notification', async () => {
    mockEmployeeQuery([employee('employee-1')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockResolvedValue({
      status: 'suppressed',
      claimTimestamp: null,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats).toMatchObject({ claimed: 0, suppressedClaims: 1, digestCandidates: 0 });
    expect(reminderService.sendOmcMasterdataReminderDigest).not.toHaveBeenCalled();
  });

  it('continues after evaluation failure but returns aggregate PII-free failure details', async () => {
    mockEmployeeQuery([employee('employee-1'), employee('employee-2')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion)
      .mockRejectedValueOnce(new Error('Name-employee-1 employee-1 private failure'))
      .mockResolvedValueOnce({
        shouldNotify: true,
        missingFields: ['one'],
        omcDateValue: '2026-08-20',
        elapsedDays: 7,
      });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 1,
      successfulRecipientDeliveries: 1,
      failedRecipientDeliveries: 0,
      outcome: 'success',
    });

    const response = await GET(request());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({ evaluated: 1, eligible: 1, claimed: 1, processingErrors: 1 });
    expect(body.errorDetails).toEqual([{ stage: 'evaluation', count: 1 }]);
    expect(serialized).not.toContain('employee-1');
    expect(serialized).not.toContain('Name-employee-1');
    expect(reminderService.sendOmcMasterdataReminderDigest).toHaveBeenCalledTimes(1);
  });

  it('continues after a claim failure and reports it as non-2xx', async () => {
    mockEmployeeQuery([employee('employee-1'), employee('employee-2')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder)
      .mockResolvedValueOnce({ status: 'error', claimTimestamp: null })
      .mockImplementationOnce(async (_candidate, claimTimestamp) => ({
        status: 'claimed',
        claimTimestamp,
      }));
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 1,
      successfulRecipientDeliveries: 1,
      failedRecipientDeliveries: 0,
      outcome: 'success',
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({ eligible: 2, claimed: 1, processingErrors: 1 });
    expect(body.errorDetails).toEqual([{ stage: 'claim', count: 1 }]);
  });

  it('releases exact invocation claims after total delivery failure', async () => {
    mockEmployeeQuery([employee('employee-1')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 2,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 2,
      outcome: 'total-failure',
    });
    vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mockResolvedValue({
      releasedClaims: 1,
      releaseErrors: 0,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      claimed: 1,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 2,
      releasedClaims: 1,
    });
    const releaseCandidates = vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mock.calls[0][0];
    expect(releaseCandidates[0].claimTimestamp).toEqual(expect.any(String));
    expect(releaseCandidates[0].claimTimestamp).toBe(
      vi.mocked(reminderService.claimOmcMasterdataReminder).mock.calls[0][1]
    );
  });

  it('retains all claims after partial recipient success while returning non-2xx', async () => {
    mockEmployeeQuery([employee('employee-1')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 2,
      successfulRecipientDeliveries: 1,
      failedRecipientDeliveries: 1,
      outcome: 'partial-failure',
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      claimed: 1,
      successfulRecipientDeliveries: 1,
      failedRecipientDeliveries: 1,
      releasedClaims: 0,
      processingErrors: 1,
    });
    expect(reminderService.releaseOmcMasterdataReminderClaims).not.toHaveBeenCalled();
  });

  it('returns non-2xx and releases exact claims when no recipients are available', async () => {
    mockEmployeeQuery([employee('employee-1')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'no-recipients',
    });
    vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mockResolvedValue({
      releasedClaims: 1,
      releaseErrors: 0,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      claimed: 1,
      releasedClaims: 1,
      processingErrors: 1,
    });
    expect(body.errorDetails).toEqual([{ stage: 'recipient-configuration', count: 1 }]);
    expect(reminderService.releaseOmcMasterdataReminderClaims).toHaveBeenCalledTimes(1);
  });

  it('returns recipient-lookup failure and releases exact claims when recipient lookup fails', async () => {
    mockEmployeeQuery([employee('employee-1')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'recipient-lookup-failure',
    });
    vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mockResolvedValue({
      releasedClaims: 1,
      releaseErrors: 0,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      claimed: 1,
      failedRecipientDeliveries: 0,
      releasedClaims: 1,
      processingErrors: 1,
    });
    expect(body.errorDetails).toEqual([{ stage: 'recipient-lookup', count: 1 }]);
    expect(reminderService.releaseOmcMasterdataReminderClaims).toHaveBeenCalledTimes(1);
  });

  it('keeps rejected-delivery logs and API error details free of candidate and recipient PII', async () => {
    const privateEmployeeId = 'employee-secret-123';
    const privateCandidateName = `Name-${privateEmployeeId} Surname-${privateEmployeeId}`;
    const privateRecipientEmail = 'hr.secret@example.test';
    const privateSubject = 'Stena Season: confidential candidate reminder';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    mockEmployeeQuery([employee(privateEmployeeId)]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockRejectedValue(
      new Error(
        `SMTP 550 rejected ${privateRecipientEmail} for subject "${privateSubject}" while sending ${privateCandidateName} (${privateEmployeeId})`
      )
    );
    vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mockResolvedValue({
      releasedClaims: 1,
      releaseErrors: 0,
    });

    const response = await GET(request());
    const body = await response.json();
    const serializedResponse = JSON.stringify(body);
    const serializedLogs = JSON.stringify([...logSpy.mock.calls, ...errorSpy.mock.calls]);

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      claimed: 1,
      failedRecipientDeliveries: 0,
      releasedClaims: 1,
      processingErrors: 1,
    });
    expect(body.errorDetails).toEqual([{ stage: 'delivery', count: 1 }]);
    for (const privateValue of [
      privateEmployeeId,
      privateCandidateName,
      privateRecipientEmail,
      privateSubject,
    ]) {
      expect(serializedResponse).not.toContain(privateValue);
      expect(serializedLogs).not.toContain(privateValue);
    }

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('surfaces exact-claim cleanup failures after total failure', async () => {
    mockEmployeeQuery([employee('employee-1')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 1,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 1,
      outcome: 'total-failure',
    });
    vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mockResolvedValue({
      releasedClaims: 0,
      releaseErrors: 1,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.stats.processingErrors).toBe(2);
    expect(body.errorDetails).toEqual(expect.arrayContaining([
      { stage: 'delivery', count: 1 },
      { stage: 'claim-release', count: 1 },
    ]));
  });

  it('records a rejected exact-claim release once without retrying or misclassifying it', async () => {
    mockEmployeeQuery([employee('employee-1')]);
    vi.mocked(reminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
      shouldNotify: true,
      missingFields: ['one'],
      omcDateValue: '2026-08-20',
      elapsedDays: 7,
    });
    vi.mocked(reminderService.claimOmcMasterdataReminder).mockImplementation(
      async (_candidate, claimTimestamp) => ({ status: 'claimed', claimTimestamp })
    );
    vi.mocked(reminderService.sendOmcMasterdataReminderDigest).mockResolvedValue({
      recipientCount: 1,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 1,
      outcome: 'total-failure',
    });
    vi.mocked(reminderService.releaseOmcMasterdataReminderClaims).mockRejectedValue(
      new Error('private claim release failure')
    );

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.stats).toMatchObject({
      failedRecipientDeliveries: 1,
      releasedClaims: 0,
      processingErrors: 2,
    });
    expect(body.errorDetails).toEqual([
      { stage: 'delivery', count: 1 },
      { stage: 'claim-release', count: 1 },
    ]);
    expect(reminderService.releaseOmcMasterdataReminderClaims).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(body)).not.toContain('private claim release failure');
  });
});
