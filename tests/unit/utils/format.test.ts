import { describe, it, expect } from 'vitest';
import { formatImportantDateOption, formatDateForDisplay } from '@/lib/utils/format';
import type { ImportantDate } from '@/lib/types/important-date';

/**
 * Story 19.3: Tests for unified date display formatting
 * Format: dd-MM (no year, as HR uses seasonal workflow)
 */
describe('formatDateForDisplay', () => {
  describe('standard dates (dd-MM format)', () => {
    it('should format ISO date to dd-MM format', () => {
      expect(formatDateForDisplay('2025-03-08')).toBe('08-03');
    });

    it('should format date with single-digit day (padded)', () => {
      expect(formatDateForDisplay('2025-01-05')).toBe('05-01');
    });

    it('should format date with double-digit day', () => {
      expect(formatDateForDisplay('2025-12-25')).toBe('25-12');
    });

    it('should handle Date object', () => {
      const date = new Date('2025-03-08T00:00:00');
      expect(formatDateForDisplay(date)).toBe('08-03');
    });
  });

  describe('null/empty values', () => {
    it('should return "—" for null', () => {
      expect(formatDateForDisplay(null)).toBe('—');
    });

    it('should return "—" for undefined', () => {
      expect(formatDateForDisplay(undefined)).toBe('—');
    });

    it('should return "—" for empty string', () => {
      expect(formatDateForDisplay('')).toBe('—');
    });
  });

  describe('invalid dates', () => {
    it('should return "—" for invalid date string', () => {
      expect(formatDateForDisplay('invalid')).toBe('—');
    });

    it('should return "—" for invalid ISO format', () => {
      expect(formatDateForDisplay('2025-13-45')).toBe('—');
    });
  });

  describe('ÖMC dates (two-day range)', () => {
    it('should format ÖMC date as two-day range', () => {
      expect(formatDateForDisplay('2025-03-08', 'ÖMC Dates')).toBe('08-03 - 09-03');
    });

    it('should handle month boundary for ÖMC date', () => {
      // March 31 + 1 day = April 1
      expect(formatDateForDisplay('2025-03-31', 'ÖMC Dates')).toBe('31-03 - 01-04');
    });
  });

  describe('PE3 dates with time', () => {
    it('should format PE3 date with time', () => {
      expect(formatDateForDisplay('2025-03-07', 'PE3 Dates', '14:30')).toBe('07-03 14:30');
    });

    it('should format PE3 date with time including seconds', () => {
      expect(formatDateForDisplay('2025-03-07', 'PE3 Dates', '14:30:00')).toBe('07-03 14:30');
    });

    it('should format PE3 date without time as standard dd-MM format', () => {
      expect(formatDateForDisplay('2025-03-07', 'PE3 Dates', null)).toBe('07-03');
    });
  });

  describe('other categories (default to dd-MM)', () => {
    it('should format Stena date in dd-MM format', () => {
      expect(formatDateForDisplay('2025-03-14', 'Stena Dates')).toBe('14-03');
    });

    it('should format unknown category in dd-MM format', () => {
      expect(formatDateForDisplay('2025-03-14', 'Unknown Category')).toBe('14-03');
    });
  });
});

describe('formatImportantDateOption', () => {
  const baseDate: ImportantDate = {
    id: '1',
    week_number: 10,
    year: 2025,
    category: 'Stena Dates',
    date_description: 'Standard Description', // Note: date_description is no longer used, date_value is formatted instead
    date_value: '2025-03-01',
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    notes: null,
    is_active: true,
    max_spots: 10,
    remaining_spots: 5,
    assigned_employees: [],
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  };

  // Story 19.3: Updated tests to reflect new behavior - formatDateForDisplay is used instead of date_description
  it('should format standard date with week number using dd-MM format', () => {
    const date = { ...baseDate };
    expect(formatImportantDateOption(date)).toBe('v. 10 - 01-03');
  });

  it('should format standard date without week number using dd-MM format', () => {
    const date = { ...baseDate, week_number: null };
    expect(formatImportantDateOption(date)).toBe('01-03');
  });

  it('should format ÖMC date using two-day format', () => {
    const date = { 
      ...baseDate, 
      category: 'ÖMC Dates',
      date_value: '2025-03-08' 
    };
    expect(formatImportantDateOption(date)).toBe('v. 10 - 08-03 - 09-03');
  });

  it('should format PE3 date with time using dd-MM format', () => {
    const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: 'Fredag 7/3', // ignored - date_value is used
      date_value: '2025-03-07',
      time_value: '14:30'
    };
    expect(formatImportantDateOption(date)).toBe('v. 10 - 07-03 14:30');
  });

  it('should format PE3 date without time using dd-MM format', () => {
    const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: 'Fredag 7/3', // ignored - date_value is used
      date_value: '2025-03-07',
      time_value: null
    };
    expect(formatImportantDateOption(date)).toBe('v. 10 - 07-03');
  });

  it('should handle PE3 date with time having seconds', () => {
    const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: 'Fredag 7/3', // ignored - date_value is used
      date_value: '2025-03-07',
      time_value: '14:30:00'
    };
    expect(formatImportantDateOption(date)).toBe('v. 10 - 07-03 14:30');
  });

  it('should handle null date_value gracefully', () => {
     const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: '',
      date_value: '', // empty string
      time_value: '14:30'
    };
    // formatDateForDisplay returns "—" for empty/null date
    expect(formatImportantDateOption(date)).toBe('v. 10 - —');
  });
});
