/** Story 14.1 regression surface superseded by Story 22.14. */

import { describe, expect, it } from 'vitest';
import {
  checkRequiredMasterdataFields,
  REQUIRED_BOOLEAN_FIELDS,
  type OmcReminderEmployee,
} from '@/lib/services/omc-masterdata-reminder';

const EXPECTED_REQUIRED_BOOLEAN_FIELDS = [
  'one',
  'talmundo',
  'isps',
  'photo',
  'origo',
  'mail_lon',
  'bankuppgifter',
  'li',
  'passport',
  'c17',
] as const;

function completeEmployee(overrides: Partial<OmcReminderEmployee> = {}): OmcReminderEmployee {
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
    kvitto_c17_18: true,
    c17: true,
    loneiva: 3,
    ...overrides,
  };
}

describe('checkRequiredMasterdataFields (Story 22.14 policy)', () => {
  it('exports the independently specified Story 22.14 required-field allowlist', () => {
    expect(REQUIRED_BOOLEAN_FIELDS).toEqual(EXPECTED_REQUIRED_BOOLEAN_FIELDS);
  });

  it.each([false, null])(
    'treats kvitto_c17_18=%s as complete because the receipt is optional',
    (kvitto_c17_18) => {
      expect(checkRequiredMasterdataFields(completeEmployee({ kvitto_c17_18 }))).toEqual([]);
    }
  );

  it.each(EXPECTED_REQUIRED_BOOLEAN_FIELDS)(
    'keeps %s independently mandatory when false',
    (field) => {
      expect(checkRequiredMasterdataFields(completeEmployee({ [field]: false }))).toEqual([field]);
    }
  );

  it.each(EXPECTED_REQUIRED_BOOLEAN_FIELDS)(
    'keeps %s independently mandatory when null',
    (field) => {
      expect(checkRequiredMasterdataFields(completeEmployee({ [field]: null }))).toEqual([field]);
    }
  );

  it('keeps loneiva independently mandatory', () => {
    expect(checkRequiredMasterdataFields(completeEmployee({ loneiva: null }))).toEqual(['loneiva']);
  });

  it('does not introduce Crewing or hotel fields into the reminder policy', () => {
    const employee = {
      ...completeEmployee(),
      crewing_done: false,
      hotel_required: false,
    };

    expect(checkRequiredMasterdataFields(employee)).toEqual([]);
  });
});
