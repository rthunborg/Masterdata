import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOneFieldStatus, getRemainingTime, getUnlockTime } from '@/lib/services/one-field-status';

describe('One Field Status Service', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.useRealTimers();
  });

  describe('getUnlockTime', () => {
    it('returns 00:01 AM the following day', () => {
      // Marked at 3 PM on Jan 15
      const markedAt = new Date('2025-01-15T15:00:00');
      const unlockTime = getUnlockTime(markedAt);
      
      expect(unlockTime.getFullYear()).toBe(2025);
      expect(unlockTime.getMonth()).toBe(0); // January
      expect(unlockTime.getDate()).toBe(16); // Next day
      expect(unlockTime.getHours()).toBe(0);
      expect(unlockTime.getMinutes()).toBe(1);
      expect(unlockTime.getSeconds()).toBe(0);
    });

    it('handles midnight correctly - still unlocks next day', () => {
      // Marked at exactly midnight
      const markedAt = new Date('2025-01-15T00:00:00');
      const unlockTime = getUnlockTime(markedAt);
      
      expect(unlockTime.getDate()).toBe(16); // Next day
      expect(unlockTime.getHours()).toBe(0);
      expect(unlockTime.getMinutes()).toBe(1);
    });

    it('handles 11:59 PM correctly', () => {
      // Marked at 11:59 PM
      const markedAt = new Date('2025-01-15T23:59:00');
      const unlockTime = getUnlockTime(markedAt);
      
      expect(unlockTime.getDate()).toBe(16); // Next day
      expect(unlockTime.getHours()).toBe(0);
      expect(unlockTime.getMinutes()).toBe(1);
    });

    it('handles month boundary correctly', () => {
      // Marked on last day of January
      const markedAt = new Date('2025-01-31T15:00:00');
      const unlockTime = getUnlockTime(markedAt);
      
      expect(unlockTime.getMonth()).toBe(1); // February
      expect(unlockTime.getDate()).toBe(1);
    });

    it('handles year boundary correctly', () => {
      // Marked on Dec 31
      const markedAt = new Date('2025-12-31T15:00:00');
      const unlockTime = getUnlockTime(markedAt);
      
      expect(unlockTime.getFullYear()).toBe(2026);
      expect(unlockTime.getMonth()).toBe(0); // January
      expect(unlockTime.getDate()).toBe(1);
    });
  });

  describe('getOneFieldStatus', () => {
    it('returns null when One field is false', () => {
      const markedAt = new Date();
      const status = getOneFieldStatus(false, markedAt);
      expect(status).toBeNull();
    });

    it('returns null when One field is false regardless of timestamp', () => {
      const yesterdayAt3PM = new Date();
      yesterdayAt3PM.setDate(yesterdayAt3PM.getDate() - 1);
      yesterdayAt3PM.setHours(15, 0, 0, 0);
      const status = getOneFieldStatus(false, yesterdayAt3PM);
      expect(status).toBeNull();
    });

    it('returns yellow when One field is true and markedAt is null', () => {
      const status = getOneFieldStatus(true, null);
      expect(status).toBe('yellow');
    });

    it('returns yellow when marked same day before 00:01 AM', () => {
      vi.useFakeTimers();
      // Current time: Jan 15, 10 PM
      const now = new Date('2025-01-15T22:00:00');
      vi.setSystemTime(now);

      // Marked earlier same day at 3 PM
      const markedAt = new Date('2025-01-15T15:00:00');
      const status = getOneFieldStatus(true, markedAt);
      
      expect(status).toBe('yellow'); // Not yet 00:01 AM on Jan 16

      vi.useRealTimers();
    });

    it('returns yellow when current time is exactly 00:00 AM the next day', () => {
      vi.useFakeTimers();
      // Current time: Jan 16, 00:00 (midnight)
      const now = new Date('2025-01-16T00:00:00');
      vi.setSystemTime(now);

      // Marked previous day
      const markedAt = new Date('2025-01-15T15:00:00');
      const status = getOneFieldStatus(true, markedAt);
      
      expect(status).toBe('yellow'); // Still yellow - need to wait until 00:01

      vi.useRealTimers();
    });

    it('returns green when current time is 00:01 AM the next day', () => {
      vi.useFakeTimers();
      // Current time: Jan 16, 00:01
      const now = new Date('2025-01-16T00:01:00');
      vi.setSystemTime(now);

      // Marked previous day
      const markedAt = new Date('2025-01-15T15:00:00');
      const status = getOneFieldStatus(true, markedAt);
      
      expect(status).toBe('green'); // Now green

      vi.useRealTimers();
    });

    it('returns green when current time is well past 00:01 AM the next day', () => {
      vi.useFakeTimers();
      // Current time: Jan 16, 10 AM
      const now = new Date('2025-01-16T10:00:00');
      vi.setSystemTime(now);

      // Marked previous day
      const markedAt = new Date('2025-01-15T15:00:00');
      const status = getOneFieldStatus(true, markedAt);
      
      expect(status).toBe('green');

      vi.useRealTimers();
    });

    it('returns green when multiple days have passed', () => {
      vi.useFakeTimers();
      // Current time: Jan 20
      const now = new Date('2025-01-20T10:00:00');
      vi.setSystemTime(now);

      // Marked 5 days ago
      const markedAt = new Date('2025-01-15T15:00:00');
      const status = getOneFieldStatus(true, markedAt);
      
      expect(status).toBe('green');

      vi.useRealTimers();
    });

    it('handles late night marking correctly', () => {
      vi.useFakeTimers();
      // Marked at 11:59 PM on Jan 15
      const markedAt = new Date('2025-01-15T23:59:00');
      
      // 2 minutes later (00:01 AM on Jan 16 = unlock time)
      const now = new Date('2025-01-16T00:01:00');
      vi.setSystemTime(now);

      const status = getOneFieldStatus(true, markedAt);
      
      // Unlock time is always 00:01 AM the next calendar day after marking
      // Marked on Jan 15 -> unlocks Jan 16 00:01 AM
      expect(status).toBe('green');

      vi.useRealTimers();
    });

    it('handles late night marking - same night before unlock', () => {
      vi.useFakeTimers();
      // Marked at 11:59 PM on Jan 15
      const markedAt = new Date('2025-01-15T23:59:00');
      
      // 1 minute later (00:00 AM on Jan 16 - still before unlock time)
      const now = new Date('2025-01-16T00:00:00');
      vi.setSystemTime(now);

      const status = getOneFieldStatus(true, markedAt);
      
      // Still yellow because 00:00 is before unlock time of 00:01
      expect(status).toBe('yellow');

      vi.useRealTimers();
    });

    it('handles late night marking - well past unlock time', () => {
      vi.useFakeTimers();
      // Marked at 11:59 PM on Jan 15
      const markedAt = new Date('2025-01-15T23:59:00');
      
      // Jan 17 at 00:01 AM (2 days after marking, well past unlock time of Jan 16 00:01)
      const now = new Date('2025-01-17T00:01:00');
      vi.setSystemTime(now);

      const status = getOneFieldStatus(true, markedAt);
      
      expect(status).toBe('green');

      vi.useRealTimers();
    });
  });

  describe('getRemainingTime', () => {
    it('returns "Ready" when past unlock time', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-16T10:00:00');
      vi.setSystemTime(now);

      const markedAt = new Date('2025-01-15T15:00:00');
      const remaining = getRemainingTime(markedAt);
      
      expect(remaining).toBe('Ready');

      vi.useRealTimers();
    });

    it('returns hours and minutes until 00:01 AM next day', () => {
      vi.useFakeTimers();
      // Current time: Jan 15, 8 PM
      const now = new Date('2025-01-15T20:00:00');
      vi.setSystemTime(now);

      // Marked same day at 3 PM
      const markedAt = new Date('2025-01-15T15:00:00');
      const remaining = getRemainingTime(markedAt);
      
      // Unlock at Jan 16, 00:01 = 4 hours 1 minute from 8 PM
      expect(remaining).toMatch(/4 hours 1 minutes/);

      vi.useRealTimers();
    });

    it('returns only minutes when less than 1 hour remaining', () => {
      vi.useFakeTimers();
      // Current time: Jan 15, 11:30 PM
      const now = new Date('2025-01-15T23:30:00');
      vi.setSystemTime(now);

      // Marked same day
      const markedAt = new Date('2025-01-15T15:00:00');
      const remaining = getRemainingTime(markedAt);
      
      // Unlock at Jan 16, 00:01 = 31 minutes from 11:30 PM
      expect(remaining).toMatch(/31 minutes/);
      expect(remaining).not.toMatch(/hours/);

      vi.useRealTimers();
    });

    it('handles exact unlock time correctly', () => {
      vi.useFakeTimers();
      // Current time: exactly at unlock time
      const now = new Date('2025-01-16T00:01:00');
      vi.setSystemTime(now);

      const markedAt = new Date('2025-01-15T15:00:00');
      const remaining = getRemainingTime(markedAt);
      
      expect(remaining).toBe('Ready');

      vi.useRealTimers();
    });
  });

  describe('Edge Cases and Integration', () => {
    it('handles timezone correctly (uses local time)', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-16T00:01:00');
      vi.setSystemTime(now);

      const markedAt = new Date('2025-01-15T15:00:00');
      const status = getOneFieldStatus(true, markedAt);
      
      expect(status).toBe('green');

      vi.useRealTimers();
    });

    it('works correctly with ISO string timestamps (from API)', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-15T22:00:00');
      vi.setSystemTime(now);

      const isoString = '2025-01-15T15:00:00.000Z';
      const markedAt = new Date(isoString);
      
      const status = getOneFieldStatus(true, markedAt);
      expect(status).toBe('yellow'); // Same day, not yet 00:01 AM next day

      vi.useRealTimers();
    });

    it('handles future timestamps gracefully (clock skew)', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-15T10:00:00');
      vi.setSystemTime(now);

      // If server clock is ahead - marked in future
      const futureTime = new Date('2025-01-15T15:00:00');
      const status = getOneFieldStatus(true, futureTime);
      
      // Should still return yellow since unlock time would be Jan 16 00:01
      expect(status).toBe('yellow');
      
      const remaining = getRemainingTime(futureTime);
      expect(remaining).toBeDefined();

      vi.useRealTimers();
    });

    it('status changes from yellow to green at 00:01 AM', () => {
      vi.useFakeTimers();
      const markedAt = new Date('2025-01-15T15:00:00');

      // Before unlock time
      vi.setSystemTime(new Date('2025-01-16T00:00:59'));
      let status = getOneFieldStatus(true, markedAt);
      expect(status).toBe('yellow');

      // At unlock time
      vi.setSystemTime(new Date('2025-01-16T00:01:00'));
      status = getOneFieldStatus(true, markedAt);
      expect(status).toBe('green');

      vi.useRealTimers();
    });
  });
});
