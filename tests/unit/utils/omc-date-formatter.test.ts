/**
 * Unit Tests for ÖMC Date Formatting Utilities
 * Story 8.9: ÖMC Two-Day Date Format
 */

import { describe, it, expect } from 'vitest';
import {
  formatOMCDate,
  formatOMCDateDescription,
  parseOMCDateInput,
  validateOMCDateRange,
  isOMCDate,
} from '@/lib/utils/omc-date-formatter';

describe('formatOMCDate', () => {
  it('should format date as two-day range in Swedish', () => {
    const result = formatOMCDate('2025-03-08', 'sv-SE');
    expect(result).toBe('8-9 mars 2025');
  });

  it('should handle Date object input', () => {
    const date = new Date(2025, 2, 8); // March 8, 2025
    const result = formatOMCDate(date, 'sv-SE');
    expect(result).toBe('8-9 mars 2025');
  });

  it('should handle month boundary (March 31 - April 1)', () => {
    const result = formatOMCDate('2025-03-31', 'sv-SE');
    expect(result).toBe('31-1 april 2025');
  });

  it('should handle year boundary (December 31 - January 1)', () => {
    const result = formatOMCDate('2024-12-31', 'sv-SE');
    expect(result).toBe('31-1 januari 2025');
  });

  it('should return "Invalid Date" for invalid input', () => {
    const result = formatOMCDate('invalid-date', 'sv-SE');
    expect(result).toBe('Invalid Date');
  });
});

describe('parseOMCDateInput', () => {
  describe('ISO date format (YYYY-MM-DD)', () => {
    it('should parse ISO date string', () => {
      const result = parseOMCDateInput('2025-03-08');
      expect(result).not.toBeNull();
      expect(result?.startDate.toISOString()).toContain('2025-03-08');
      expect(result?.endDate.toISOString()).toContain('2025-03-09');
    });

    it('should return null for invalid ISO date', () => {
      const result = parseOMCDateInput('2025-13-45'); // Invalid month/day
      expect(result).toBeNull();
    });
  });

  describe('Short format (8-9/3)', () => {
    it('should parse "8-9/3" format', () => {
      const result = parseOMCDateInput('8-9/3');
      expect(result).not.toBeNull();
      expect(result?.startDate.getDate()).toBe(8);
      expect(result?.endDate.getDate()).toBe(9);
      expect(result?.startDate.getMonth()).toBe(2); // March (0-indexed)
    });

    it('should parse "8-9/03" format with leading zero', () => {
      const result = parseOMCDateInput('8-9/03');
      expect(result).not.toBeNull();
      expect(result?.startDate.getMonth()).toBe(2); // March
    });

    it('should return null for non-consecutive days in short format', () => {
      const result = parseOMCDateInput('8-10/3'); // Non-consecutive
      expect(result).toBeNull();
    });
  });

  describe('Swedish month name format', () => {
    it('should parse "8-9 mars" format', () => {
      const result = parseOMCDateInput('8-9 mars');
      expect(result).not.toBeNull();
      expect(result?.startDate.getDate()).toBe(8);
      expect(result?.endDate.getDate()).toBe(9);
      expect(result?.startDate.getMonth()).toBe(2); // March
    });

    it('should parse "8-9 mars 2025" format with year', () => {
      const result = parseOMCDateInput('8-9 mars 2025');
      expect(result).not.toBeNull();
      expect(result?.startDate.getFullYear()).toBe(2025);
      expect(result?.startDate.getMonth()).toBe(2); // March
    });

    it('should parse all Swedish month names correctly', () => {
      const months = [
        { name: 'januari', index: 0 },
        { name: 'februari', index: 1 },
        { name: 'mars', index: 2 },
        { name: 'april', index: 3 },
        { name: 'maj', index: 4 },
        { name: 'juni', index: 5 },
        { name: 'juli', index: 6 },
        { name: 'augusti', index: 7 },
        { name: 'september', index: 8 },
        { name: 'oktober', index: 9 },
        { name: 'november', index: 10 },
        { name: 'december', index: 11 },
      ];

      months.forEach(({ name, index }) => {
        const result = parseOMCDateInput(`8-9 ${name} 2025`);
        expect(result).not.toBeNull();
        expect(result?.startDate.getMonth()).toBe(index);
      });
    });

    it('should handle case-insensitive month names', () => {
      const result = parseOMCDateInput('8-9 MARS 2025');
      expect(result).not.toBeNull();
      expect(result?.startDate.getMonth()).toBe(2);
    });

    it('should return null for invalid month name', () => {
      const result = parseOMCDateInput('8-9 invalidmonth 2025');
      expect(result).toBeNull();
    });

    it('should return null for non-consecutive days', () => {
      const result = parseOMCDateInput('8-11 mars 2025');
      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty string', () => {
      const result = parseOMCDateInput('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = parseOMCDateInput(null as unknown as string);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = parseOMCDateInput(undefined as unknown as string);
      expect(result).toBeNull();
    });

    it('should return null for completely invalid format', () => {
      const result = parseOMCDateInput('completely invalid');
      expect(result).toBeNull();
    });
  });
});

describe('validateOMCDateRange', () => {
  it('should validate consecutive days as valid', () => {
    const start = new Date(2025, 2, 8); // March 8
    const end = new Date(2025, 2, 9); // March 9
    const result = validateOMCDateRange(start, end);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should invalidate non-consecutive days', () => {
    const start = new Date(2025, 2, 8); // March 8
    const end = new Date(2025, 2, 10); // March 10 (skip a day)
    const result = validateOMCDateRange(start, end);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('två på varandra följande dagar');
  });

  it('should invalidate same day twice', () => {
    const start = new Date(2025, 2, 8);
    const end = new Date(2025, 2, 8); // Same day
    const result = validateOMCDateRange(start, end);
    
    expect(result.valid).toBe(false);
  });

  it('should invalidate reversed dates', () => {
    const start = new Date(2025, 2, 9);
    const end = new Date(2025, 2, 8); // End before start
    const result = validateOMCDateRange(start, end);
    
    expect(result.valid).toBe(false);
  });

  it('should invalidate invalid Date objects', () => {
    const invalid = new Date('invalid');
    const valid = new Date(2025, 2, 8);
    const result = validateOMCDateRange(invalid, valid);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid dates');
  });

  it('should invalidate non-Date objects', () => {
    const result = validateOMCDateRange('not a date' as unknown as Date, new Date());
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Date objects');
  });
});

describe('formatOMCDateDescription', () => {
  it('should format date as two-day range without year (same month)', () => {
    const result = formatOMCDateDescription('2025-03-08');
    expect(result).toBe('8-9 mars');
  });

  it('should handle Date object input', () => {
    const date = new Date(2025, 2, 8); // March 8, 2025
    const result = formatOMCDateDescription(date);
    expect(result).toBe('8-9 mars');
  });

  it('should handle month boundary with short month names', () => {
    const result = formatOMCDateDescription('2025-02-28');
    expect(result).toBe('28 feb, 1 mars');
  });

  it('should handle year boundary (December 31 - January 1)', () => {
    const result = formatOMCDateDescription('2024-12-31');
    expect(result).toBe('31 dec, 1 januari');
  });

  it('should return empty string for invalid input', () => {
    const result = formatOMCDateDescription('invalid-date');
    expect(result).toBe('');
  });

  it('should format dates in same month correctly', () => {
    const result = formatOMCDateDescription('2025-07-15');
    expect(result).toBe('15-16 juli');
  });

  it('should format dates spanning two months correctly', () => {
    const result = formatOMCDateDescription('2025-03-31');
    expect(result).toBe('31 mar, 1 april');
  });
});

describe('isOMCDate', () => {
  it('should return true for "ÖMC Dates" category', () => {
    expect(isOMCDate('ÖMC Dates')).toBe(true);
  });

  it('should return false for other categories', () => {
    expect(isOMCDate('Stena Dates')).toBe(false);
    expect(isOMCDate('PE3 Dates')).toBe(false);
    expect(isOMCDate('Other')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isOMCDate('')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isOMCDate('ömc dates')).toBe(false);
    expect(isOMCDate('OMC DATES')).toBe(false);
  });
});
