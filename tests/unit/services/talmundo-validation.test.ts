/**
 * Unit Tests for Talmundo Validation Service
 * Story 8.4: Talmundo Field with Conditional Editability
 * 
 * Business Rule: Talmundo can only be edited after 00:01 AM the day following
 * when the One field was marked as true.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canEditTalmundo } from '@/lib/services/talmundo-validation';

describe('canEditTalmundo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when One field is false', () => {
    it('returns false', () => {
      vi.setSystemTime(new Date('2025-01-16T10:00:00'));
      const result = canEditTalmundo(false, null);
      expect(result).toBe(false);
    });

    it('returns false even with a valid timestamp from yesterday', () => {
      vi.setSystemTime(new Date('2025-01-16T10:00:00'));
      const yesterdayAt3PM = '2025-01-15T15:00:00.000Z';
      const result = canEditTalmundo(false, yesterdayAt3PM);
      expect(result).toBe(false);
    });
  });

  describe('when One field is null', () => {
    it('returns false', () => {
      vi.setSystemTime(new Date('2025-01-16T10:00:00'));
      const result = canEditTalmundo(null, null);
      expect(result).toBe(false);
    });

    it('returns false even with a valid timestamp', () => {
      vi.setSystemTime(new Date('2025-01-16T10:00:00'));
      const yesterdayAt3PM = '2025-01-15T15:00:00.000Z';
      const result = canEditTalmundo(null, yesterdayAt3PM);
      expect(result).toBe(false);
    });
  });

  describe('when One is true but not yet 00:01 AM the following day (yellow status)', () => {
    it('returns false when marked same day and current time is before midnight', () => {
      // Current time: Jan 15, 10 PM
      vi.setSystemTime(new Date('2025-01-15T22:00:00'));
      // Marked same day at 3 PM
      const markedAt = '2025-01-15T15:00:00.000Z';
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(false);
    });

    it('returns false when marked same day and current time is exactly midnight', () => {
      // Current time: Jan 16, 00:00 (midnight)
      vi.setSystemTime(new Date('2025-01-16T00:00:00'));
      // Marked previous day at 3 PM
      const markedAt = '2025-01-15T15:00:00.000Z';
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(false); // Still need to wait until 00:01
    });

    it('returns false when marked late at night and only a few minutes have passed', () => {
      // Marked at 11:59 PM on Jan 15
      const markedAt = '2025-01-15T23:59:00.000Z';
      // Current time: 00:01 AM on Jan 16 (only 2 minutes later)
      vi.setSystemTime(new Date('2025-01-16T00:01:00'));
      
      const result = canEditTalmundo(true, markedAt);
      // Should be false because unlock time is Jan 17 00:01
      expect(result).toBe(false);
    });
  });

  describe('when One is true and past 00:01 AM the following day (green status)', () => {
    it('returns true when current time is exactly 00:01 AM the following day', () => {
      // Current time: Jan 16, 00:01
      vi.setSystemTime(new Date('2025-01-16T00:01:00'));
      // Marked previous day at 3 PM
      const markedAt = '2025-01-15T15:00:00.000Z';
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true);
    });

    it('returns true when current time is morning the following day', () => {
      // Current time: Jan 16, 9 AM
      vi.setSystemTime(new Date('2025-01-16T09:00:00'));
      // Marked previous day at 3 PM
      const markedAt = '2025-01-15T15:00:00.000Z';
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true);
    });

    it('returns true when multiple days have passed', () => {
      // Current time: Jan 20
      vi.setSystemTime(new Date('2025-01-20T10:00:00'));
      // Marked 5 days ago
      const markedAt = '2025-01-15T15:00:00.000Z';
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true);
    });

    it('returns true when a week has passed', () => {
      // Current time: Jan 22
      vi.setSystemTime(new Date('2025-01-22T10:00:00'));
      // Marked 7 days ago
      const markedAt = '2025-01-15T15:00:00.000Z';
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true);
    });
  });

  describe('when One is true but oneMarkedAt is null', () => {
    it('returns false', () => {
      vi.setSystemTime(new Date('2025-01-16T10:00:00'));
      const result = canEditTalmundo(true, null);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for invalid date string', () => {
      vi.setSystemTime(new Date('2025-01-16T10:00:00'));
      const result = canEditTalmundo(true, 'invalid-date');
      expect(result).toBe(false);
    });

    it('returns false for empty string', () => {
      vi.setSystemTime(new Date('2025-01-16T10:00:00'));
      const result = canEditTalmundo(true, '');
      expect(result).toBe(false);
    });

    it('handles timestamps with milliseconds correctly', () => {
      // Current time: Jan 16, 00:01
      vi.setSystemTime(new Date('2025-01-16T00:01:00.500'));
      // Marked previous day with milliseconds
      const markedAt = '2025-01-15T15:00:00.500Z';
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true);
    });

    it('handles month boundary correctly', () => {
      // Marked on Jan 31
      const markedAt = '2025-01-31T15:00:00.000Z';
      // Current time: Feb 1, 00:01
      vi.setSystemTime(new Date('2025-02-01T00:01:00'));
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true);
    });

    it('handles year boundary correctly', () => {
      // Marked on Dec 31
      const markedAt = '2025-12-31T15:00:00.000Z';
      // Current time: Jan 1, 2026, 00:01
      vi.setSystemTime(new Date('2026-01-01T00:01:00'));
      
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('scenario: HR marks One at 3 PM Monday, cannot edit Talmundo until Tuesday 00:01', () => {
      const mondayAt3PM = '2025-01-13T15:00:00.000Z'; // Monday

      // Monday evening - should be yellow
      vi.setSystemTime(new Date('2025-01-13T20:00:00'));
      expect(canEditTalmundo(true, mondayAt3PM)).toBe(false);

      // Monday 11:59 PM - should be yellow
      vi.setSystemTime(new Date('2025-01-13T23:59:00'));
      expect(canEditTalmundo(true, mondayAt3PM)).toBe(false);

      // Tuesday 00:00 (midnight) - should be yellow
      vi.setSystemTime(new Date('2025-01-14T00:00:00'));
      expect(canEditTalmundo(true, mondayAt3PM)).toBe(false);

      // Tuesday 00:01 - should be green
      vi.setSystemTime(new Date('2025-01-14T00:01:00'));
      expect(canEditTalmundo(true, mondayAt3PM)).toBe(true);
    });

    it('scenario: HR marks One at 11:59 PM, must wait until day after next', () => {
      const mondayAt1159PM = '2025-01-13T23:59:00.000Z'; // Monday 11:59 PM

      // Tuesday 00:01 - should be yellow (only 2 minutes elapsed)
      vi.setSystemTime(new Date('2025-01-14T00:01:00'));
      expect(canEditTalmundo(true, mondayAt1159PM)).toBe(false);

      // Tuesday evening - should be yellow
      vi.setSystemTime(new Date('2025-01-14T20:00:00'));
      expect(canEditTalmundo(true, mondayAt1159PM)).toBe(false);

      // Wednesday 00:00 - should be yellow
      vi.setSystemTime(new Date('2025-01-15T00:00:00'));
      expect(canEditTalmundo(true, mondayAt1159PM)).toBe(false);

      // Wednesday 00:01 - should be green
      vi.setSystemTime(new Date('2025-01-15T00:01:00'));
      expect(canEditTalmundo(true, mondayAt1159PM)).toBe(true);
    });

    it('scenario: HR marks One at 00:00 midnight, must wait until next day 00:01', () => {
      const mondayAtMidnight = '2025-01-13T00:00:00.000Z'; // Monday midnight

      // Monday evening - should be yellow
      vi.setSystemTime(new Date('2025-01-13T20:00:00'));
      expect(canEditTalmundo(true, mondayAtMidnight)).toBe(false);

      // Tuesday 00:00 - should be yellow
      vi.setSystemTime(new Date('2025-01-14T00:00:00'));
      expect(canEditTalmundo(true, mondayAtMidnight)).toBe(false);

      // Tuesday 00:01 - should be green
      vi.setSystemTime(new Date('2025-01-14T00:01:00'));
      expect(canEditTalmundo(true, mondayAtMidnight)).toBe(true);
    });
  });
});
