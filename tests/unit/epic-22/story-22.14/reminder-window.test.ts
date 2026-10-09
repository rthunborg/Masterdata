import { describe, expect, it } from 'vitest';
import {
  calculateOmcReminderTiming,
  checkRequiredMasterdataFields,
  getStockholmCalendarDate,
  type OmcReminderEmployee,
} from '@/lib/services/omc-masterdata-reminder';

function completeEmployee(kvitto_c17_18: boolean | null): OmcReminderEmployee {
  return {
    id: 'employee-1',
    first_name: 'Anna',
    surname: 'Andersson',
    omc_date: 'omc-date-1',
    is_terminated: false,
    is_archived: false,
    omc_masterdata_reminder_sent_at: null,
    one: true,
    talmundo: true,
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18,
    c17: true,
    loneiva: 2,
  };
}

describe('Story 22.14 I/O edge-case matrix', () => {
  it.each([
    ['before due D+2', '2026-08-17', '2026-08-19', false],
    ['weekday due D+3', '2026-08-17', '2026-08-20', true],
    ['weekend base due Saturday', '2026-08-19', '2026-08-22', false],
    ['weekend base due Sunday', '2026-08-20', '2026-08-23', false],
    ['first Monday after weekend due', '2026-08-19', '2026-08-24', true],
    ['retry D+10', '2026-08-01', '2026-08-11', true],
    ['last retry D+21', '2026-08-01', '2026-08-22', true],
    ['expired D+22', '2026-08-01', '2026-08-23', false],
    ['historical D+88', '2026-08-01', '2026-10-28', false],
  ])('%s', (_scenario, omcDate, today, expected) => {
    expect(calculateOmcReminderTiming(omcDate, today).eligible).toBe(expected);
  });

  it('uses Stockholm calendar dates on both sides of daylight-saving time', () => {
    expect(getStockholmCalendarDate(new Date('2026-01-01T23:30:00Z'))).toBe('2026-01-02');
    expect(getStockholmCalendarDate(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
  });

  it.each([false, null])('does not treat optional receipt value %s as missing', (value) => {
    expect(checkRequiredMasterdataFields(completeEmployee(value))).toEqual([]);
  });
});
