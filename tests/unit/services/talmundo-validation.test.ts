/**
 * Unit Tests for Talmundo Validation Service
 * Story 8.4: Talmundo Field with Conditional Editability
 */

import { describe, it, expect } from 'vitest';
import { canEditTalmundo } from '@/lib/services/talmundo-validation';

describe('canEditTalmundo', () => {
  describe('when One field is false', () => {
    it('returns false', () => {
      const result = canEditTalmundo(false, null);
      expect(result).toBe(false);
    });

    it('returns false even with a valid timestamp', () => {
      const twentyFiveHoursAgo = new Date(
        Date.now() - 25 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(false, twentyFiveHoursAgo);
      expect(result).toBe(false);
    });
  });

  describe('when One field is null', () => {
    it('returns false', () => {
      const result = canEditTalmundo(null, null);
      expect(result).toBe(false);
    });

    it('returns false even with a valid timestamp', () => {
      const twentyFiveHoursAgo = new Date(
        Date.now() - 25 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(null, twentyFiveHoursAgo);
      expect(result).toBe(false);
    });
  });

  describe('when One is true but less than 24 hours elapsed (yellow status)', () => {
    it('returns false when 1 hour has elapsed', () => {
      const oneHourAgo = new Date(
        Date.now() - 1 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(true, oneHourAgo);
      expect(result).toBe(false);
    });

    it('returns false when 12 hours have elapsed', () => {
      const twelveHoursAgo = new Date(
        Date.now() - 12 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(true, twelveHoursAgo);
      expect(result).toBe(false);
    });

    it('returns false when 23 hours and 59 minutes have elapsed', () => {
      const almostTwentyFourHours = new Date(
        Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(true, almostTwentyFourHours);
      expect(result).toBe(false);
    });
  });

  describe('when One is true and 24+ hours elapsed (green status)', () => {
    it('returns true when exactly 24 hours have elapsed', () => {
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(true, twentyFourHoursAgo);
      expect(result).toBe(true);
    });

    it('returns true when 25 hours have elapsed', () => {
      const twentyFiveHoursAgo = new Date(
        Date.now() - 25 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(true, twentyFiveHoursAgo);
      expect(result).toBe(true);
    });

    it('returns true when 48 hours have elapsed', () => {
      const fortyEightHoursAgo = new Date(
        Date.now() - 48 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(true, fortyEightHoursAgo);
      expect(result).toBe(true);
    });

    it('returns true when 7 days have elapsed', () => {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const result = canEditTalmundo(true, sevenDaysAgo);
      expect(result).toBe(true);
    });
  });

  describe('when One is true but oneMarkedAt is null', () => {
    it('returns false', () => {
      const result = canEditTalmundo(true, null);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for invalid date string', () => {
      const result = canEditTalmundo(true, 'invalid-date');
      expect(result).toBe(false);
    });

    it('returns false for empty string', () => {
      const result = canEditTalmundo(true, '');
      expect(result).toBe(false);
    });

    it('handles timestamps with milliseconds correctly', () => {
      const twentyFiveHoursAgo = new Date(
        Date.now() - 25 * 60 * 60 * 1000 - 500
      ).toISOString();
      const result = canEditTalmundo(true, twentyFiveHoursAgo);
      expect(result).toBe(true);
    });
  });
});
