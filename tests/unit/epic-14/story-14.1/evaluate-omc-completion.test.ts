/* eslint-disable @typescript-eslint/no-explicit-any */
/** Story 14.1 timing tests superseded by Story 22.14. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateOmcReminderTiming,
  evaluateOmcMasterdataCompletion,
  getStockholmCalendarDate,
  type OmcReminderEmployee,
} from '@/lib/services/omc-masterdata-reminder';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

function employee(overrides: Partial<OmcReminderEmployee> = {}): OmcReminderEmployee {
  return {
    id: 'employee-1',
    first_name: 'Anna',
    surname: 'Andersson',
    omc_date: 'omc-date-1',
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
    ...overrides,
  };
}

function mockOmcDate(dateValue: string, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({
    data: error ? null : { date_value: dateValue },
    error,
  });
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single })),
      })),
    })),
  };
  vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
  return mockSupabase;
}

describe('calculateOmcReminderTiming', () => {
  it('keeps D+2 ineligible and makes weekday D+3 eligible', () => {
    expect(calculateOmcReminderTiming('2026-08-17', '2026-08-19').eligible).toBe(false);
    expect(calculateOmcReminderTiming('2026-08-17', '2026-08-20')).toMatchObject({
      eligible: true,
      elapsedDays: 3,
      notificationDate: '2026-08-20',
    });
  });

  it('rolls a Saturday D+3 notification date to the following Monday', () => {
    expect(calculateOmcReminderTiming('2026-08-19', '2026-08-22')).toMatchObject({
      eligible: false,
      notificationDate: '2026-08-24',
    });
    expect(calculateOmcReminderTiming('2026-08-19', '2026-08-23').eligible).toBe(false);
    expect(calculateOmcReminderTiming('2026-08-19', '2026-08-24')).toMatchObject({
      eligible: true,
      elapsedDays: 5,
    });
  });

  it('rolls a Sunday D+3 notification date to the following Monday', () => {
    expect(calculateOmcReminderTiming('2026-08-20', '2026-08-23').eligible).toBe(false);
    expect(calculateOmcReminderTiming('2026-08-20', '2026-08-24')).toMatchObject({
      eligible: true,
      notificationDate: '2026-08-24',
    });
  });

  it.each([
    ['D+10', '2026-08-11', true],
    ['D+21', '2026-08-22', true],
    ['D+22', '2026-08-23', false],
    ['D+88', '2026-10-28', false],
  ])('applies the bounded retry window at %s', (_label, today, eligible) => {
    expect(calculateOmcReminderTiming('2026-08-01', today).eligible).toBe(eligible);
  });

  it('resolves both CET and CEST instants to Stockholm calendar dates', () => {
    expect(getStockholmCalendarDate(new Date('2026-01-01T23:30:00Z'))).toBe('2026-01-02');
    expect(getStockholmCalendarDate(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
  });
});

describe('evaluateOmcMasterdataCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not query or notify inactive or archived employees', async () => {
    await expect(evaluateOmcMasterdataCompletion(employee({ is_terminated: true }))).resolves.toMatchObject({
      shouldNotify: false,
      omcDateValue: null,
    });
    await expect(evaluateOmcMasterdataCompletion(employee({ is_archived: true }))).resolves.toMatchObject({
      shouldNotify: false,
      omcDateValue: null,
    });
    expect(supabaseServer.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('keeps an incomplete employee ineligible before the notification date', async () => {
    vi.setSystemTime(new Date('2026-08-19T10:00:00Z'));
    mockOmcDate('2026-08-17');

    await expect(evaluateOmcMasterdataCompletion(employee())).resolves.toMatchObject({
      shouldNotify: false,
      omcDateValue: '2026-08-17',
      elapsedDays: 2,
    });
  });

  it('notifies inside the retry window when any mandatory field is incomplete', async () => {
    vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
    mockOmcDate('2026-08-17');

    await expect(evaluateOmcMasterdataCompletion(employee({ one: false }))).resolves.toMatchObject({
      shouldNotify: true,
      missingFields: ['one'],
      elapsedDays: 10,
    });
  });

  it('does not notify a fully complete employee inside the retry window', async () => {
    vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
    mockOmcDate('2026-08-17');

    await expect(evaluateOmcMasterdataCompletion(employee({ one: true }))).resolves.toMatchObject({
      shouldNotify: false,
      missingFields: [],
      omcDateValue: '2026-08-17',
      elapsedDays: 10,
    });
  });

  it('does not notify when kvitto_c17_18 is false and every mandatory field is complete', async () => {
    vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
    mockOmcDate('2026-08-17');

    await expect(
      evaluateOmcMasterdataCompletion(employee({ one: true, kvitto_c17_18: false }))
    ).resolves.toMatchObject({
      shouldNotify: false,
      missingFields: [],
      omcDateValue: '2026-08-17',
      elapsedDays: 10,
    });
  });

  it('uses one caller-supplied Stockholm date snapshot instead of reading the clock again', async () => {
    vi.setSystemTime(new Date('2026-08-19T10:00:00Z'));
    mockOmcDate('2026-08-17');

    await expect(
      evaluateOmcMasterdataCompletion(employee({ one: false }), '2026-08-27')
    ).resolves.toMatchObject({
      shouldNotify: true,
      missingFields: ['one'],
      elapsedDays: 10,
    });
  });

  it('never releases an expired D+22 assignment even with a null marker', async () => {
    vi.setSystemTime(new Date('2026-08-23T10:00:00Z'));
    mockOmcDate('2026-08-01');

    await expect(evaluateOmcMasterdataCompletion(employee())).resolves.toMatchObject({
      shouldNotify: false,
      elapsedDays: 22,
    });
  });

  it('treats a marker on the same Stockholm date as D as suppressing the assignment', async () => {
    vi.setSystemTime(new Date('2026-06-05T10:00:00Z'));
    mockOmcDate('2026-06-02');

    await expect(evaluateOmcMasterdataCompletion(employee({
      omc_masterdata_reminder_sent_at: '2026-06-01T22:30:00Z',
    }))).resolves.toMatchObject({ shouldNotify: false });
  });

  it('re-arms a genuinely later assignment whose D follows the old marker date', async () => {
    vi.setSystemTime(new Date('2026-06-05T10:00:00Z'));
    mockOmcDate('2026-06-02');

    await expect(evaluateOmcMasterdataCompletion(employee({
      omc_date: 'later-omc-date',
      omc_masterdata_reminder_sent_at: '2026-06-01T20:00:00Z',
    }))).resolves.toMatchObject({ shouldNotify: true, missingFields: ['one'] });
  });

  it('surfaces important-date lookup failures instead of treating them as clean ineligibility', async () => {
    vi.setSystemTime(new Date('2026-08-20T10:00:00Z'));
    mockOmcDate('2026-08-17', { message: 'lookup failed' });

    await expect(evaluateOmcMasterdataCompletion(employee())).rejects.toThrow('ÖMC date lookup failed');
  });
});
