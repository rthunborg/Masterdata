import { describe, it, expect } from 'vitest';
import { formatImportantDateOption } from '@/lib/utils/format';
import type { ImportantDate } from '@/lib/types/important-date';

describe('formatImportantDateOption', () => {
  const baseDate: ImportantDate = {
    id: '1',
    week_number: 10,
    year: 2025,
    category: 'Stena Dates',
    date_description: 'Standard Description',
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

  it('should format standard date with week number', () => {
    const date = { ...baseDate };
    expect(formatImportantDateOption(date)).toBe('v. 10 - Standard Description');
  });

  it('should format standard date without week number', () => {
    const date = { ...baseDate, week_number: null };
    expect(formatImportantDateOption(date)).toBe('Standard Description');
  });

  it('should format ÖMC date using two-day format', () => {
    const date = { 
      ...baseDate, 
      category: 'ÖMC Dates',
      date_value: '2025-03-08' 
    };
    // Assuming formatOMCDate returns "8-9 mars 2025" for this input
    expect(formatImportantDateOption(date)).toContain('8-9 mars');
    expect(formatImportantDateOption(date)).toContain('v. 10');
  });

  it('should format PE3 date with time using date_description and time', () => {
    const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: 'Fredag 7/3',
      date_value: '2025-03-07',
      time_value: '14:30'
    };
    // Expected: "v. 10 - Fredag 7/3 14:30"
    expect(formatImportantDateOption(date)).toBe('v. 10 - Fredag 7/3 14:30');
  });

  it('should format PE3 date without time using only date_description', () => {
    const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: 'Fredag 7/3',
      date_value: '2025-03-07',
      time_value: null
    };
    // Expected: "v. 10 - Fredag 7/3"
    expect(formatImportantDateOption(date)).toBe('v. 10 - Fredag 7/3');
  });

  it('should handle PE3 date with time having seconds', () => {
    const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: 'Fredag 7/3',
      date_value: '2025-03-07',
      time_value: '14:30:00'
    };
    expect(formatImportantDateOption(date)).toBe('v. 10 - Fredag 7/3 14:30');
  });

  it('should handle PE3 date with time but empty description', () => {
     const date = {
      ...baseDate,
      category: 'PE3 Dates',
      date_description: '',
      date_value: '2025-03-07',
      time_value: '14:30'
    };
    // Expected: "v. 10 -  14:30" (with a leading space in the description part)
    // Actually: "v. 10 -  14:30"
    expect(formatImportantDateOption(date)).toBe('v. 10 -  14:30');
  });
});
