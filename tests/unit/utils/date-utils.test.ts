import { describe, it, expect } from 'vitest';
import { getISOWeek, getWeekNumberFromDateString } from '@/lib/utils/date-utils';

describe('date-utils', () => {
  describe('getISOWeek', () => {
    it('should calculate week 1 correctly', () => {
      // Monday, January 1, 2024 is in week 1
      const date = new Date('2024-01-01');
      expect(getISOWeek(date)).toBe(1);
    });

    it('should calculate mid-year week correctly', () => {
      // Monday, July 1, 2024 is in week 27
      const date = new Date('2024-07-01');
      expect(getISOWeek(date)).toBe(27);
    });

    it('should calculate week 52/53 correctly', () => {
      // December 30, 2024 is in week 1 of 2025 (ISO week date)
      const date = new Date('2024-12-30');
      expect(getISOWeek(date)).toBe(1);
    });

    it('should handle year boundary correctly', () => {
      // December 31, 2023 is in week 52
      const date = new Date('2023-12-31');
      expect(getISOWeek(date)).toBe(52);
    });

    it('should handle leap year correctly', () => {
      // February 29, 2024 (leap year)
      const date = new Date('2024-02-29');
      expect(getISOWeek(date)).toBe(9);
    });
  });

  describe('getWeekNumberFromDateString', () => {
    it('should return week number for valid ISO date string', () => {
      const weekNum = getWeekNumberFromDateString('2024-07-01');
      expect(weekNum).toBe(27);
    });

    it('should return null for invalid date format', () => {
      const weekNum = getWeekNumberFromDateString('2024/07/01');
      expect(weekNum).toBeNull();
    });

    it('should return null for invalid date string', () => {
      const weekNum = getWeekNumberFromDateString('not-a-date');
      expect(weekNum).toBeNull();
    });

    it('should return null for empty string', () => {
      const weekNum = getWeekNumberFromDateString('');
      expect(weekNum).toBeNull();
    });

    it('should return null for malformed ISO date', () => {
      const weekNum = getWeekNumberFromDateString('2024-13-45');
      expect(weekNum).toBeNull();
    });

    it('should handle year boundary dates correctly', () => {
      const weekNum = getWeekNumberFromDateString('2024-12-30');
      expect(weekNum).toBe(1); // First week of 2025 in ISO week date system
    });
  });
});
