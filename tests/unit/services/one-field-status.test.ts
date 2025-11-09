import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOneFieldStatus, getRemainingTime } from '@/lib/services/one-field-status';

describe('One Field Status Service', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.useRealTimers();
  });

  describe('getOneFieldStatus', () => {
    it('returns null when One field is false', () => {
      const markedAt = new Date();
      const status = getOneFieldStatus(false, markedAt);
      expect(status).toBeNull();
    });

    it('returns null when One field is false regardless of timestamp', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const status = getOneFieldStatus(false, twentyFiveHoursAgo);
      expect(status).toBeNull();
    });

    it('returns yellow when One field is true and markedAt is null', () => {
      const status = getOneFieldStatus(true, null);
      expect(status).toBe('yellow');
    });

    it('returns yellow when One field is true and less than 24 hours elapsed', () => {
      // 23 hours ago
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
      const status = getOneFieldStatus(true, twentyThreeHoursAgo);
      expect(status).toBe('yellow');
    });

    it('returns yellow when One field is true and 1 hour elapsed', () => {
      // 1 hour ago
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const status = getOneFieldStatus(true, oneHourAgo);
      expect(status).toBe('yellow');
    });

    it('returns yellow when One field is true and 12 hours elapsed', () => {
      // 12 hours ago
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const status = getOneFieldStatus(true, twelveHoursAgo);
      expect(status).toBe('yellow');
    });

    it('returns green when One field is true and exactly 24 hours elapsed', () => {
      // Exactly 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const status = getOneFieldStatus(true, twentyFourHoursAgo);
      expect(status).toBe('green');
    });

    it('returns green when One field is true and more than 24 hours elapsed', () => {
      // 25 hours ago
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const status = getOneFieldStatus(true, twentyFiveHoursAgo);
      expect(status).toBe('green');
    });

    it('returns green when One field is true and 48 hours elapsed', () => {
      // 48 hours (2 days) ago
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const status = getOneFieldStatus(true, fortyEightHoursAgo);
      expect(status).toBe('green');
    });

    it('handles exact boundary at 24 hours correctly', () => {
      // Test exact 24-hour boundary (86400000 milliseconds)
      const exactTwentyFourHours = new Date(Date.now() - 86400000);
      const status = getOneFieldStatus(true, exactTwentyFourHours);
      expect(status).toBe('green');
    });

    it('handles just before 24-hour boundary correctly', () => {
      // 23 hours 59 minutes 59 seconds ago (just before 24 hours)
      const almostTwentyFourHours = new Date(Date.now() - (24 * 60 * 60 * 1000 - 1000));
      const status = getOneFieldStatus(true, almostTwentyFourHours);
      expect(status).toBe('yellow');
    });
  });

  describe('getRemainingTime', () => {
    it('returns "Ready" when more than 24 hours have elapsed', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const remaining = getRemainingTime(twentyFiveHoursAgo);
      expect(remaining).toBe('Ready');
    });

    it('returns "Ready" when exactly 24 hours have elapsed', () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const remaining = getRemainingTime(twentyFourHoursAgo);
      expect(remaining).toBe('Ready');
    });

    it('returns hours and minutes when time remaining', () => {
      // 18 hours ago = 6 hours remaining
      const eighteenHoursAgo = new Date(Date.now() - 18 * 60 * 60 * 1000);
      const remaining = getRemainingTime(eighteenHoursAgo);
      expect(remaining).toMatch(/6 hours 0 minutes/);
    });

    it('returns only minutes when less than 1 hour remaining', () => {
      // 23 hours 30 minutes ago = 30 minutes remaining
      const twentyThreeThirtyAgo = new Date(Date.now() - (23 * 60 * 60 * 1000 + 30 * 60 * 1000));
      const remaining = getRemainingTime(twentyThreeThirtyAgo);
      expect(remaining).toMatch(/30 minutes/);
      expect(remaining).not.toMatch(/hours/);
    });

    it('formats hours and minutes correctly', () => {
      // 18.5 hours ago = 5 hours 30 minutes remaining
      const eighteenThirtyAgo = new Date(Date.now() - 18.5 * 60 * 60 * 1000);
      const remaining = getRemainingTime(eighteenThirtyAgo);
      expect(remaining).toMatch(/5 hours 30 minutes/);
    });

    it('returns full 24 hours when just marked', () => {
      // Just now (few milliseconds ago)
      const justNow = new Date(Date.now() - 1000); // 1 second ago
      const remaining = getRemainingTime(justNow);
      expect(remaining).toMatch(/23 hours 59 minutes/);
    });

    it('handles various time intervals correctly', () => {
      // Test multiple scenarios
      const testCases = [
        { elapsed: 1 * 60 * 60 * 1000, expected: /23 hours 0 minutes/ },  // 1 hour ago
        { elapsed: 12 * 60 * 60 * 1000, expected: /12 hours 0 minutes/ }, // 12 hours ago
        { elapsed: 20 * 60 * 60 * 1000, expected: /4 hours 0 minutes/ },  // 20 hours ago
        { elapsed: 23 * 60 * 60 * 1000 + 45 * 60 * 1000, expected: /15 minutes/ }, // 23h45m ago
      ];

      testCases.forEach(({ elapsed, expected }) => {
        const markedAt = new Date(Date.now() - elapsed);
        const remaining = getRemainingTime(markedAt);
        expect(remaining).toMatch(expected);
      });
    });
  });

  describe('Edge Cases and Integration', () => {
    it('handles timezone differences correctly (uses UTC)', () => {
      // Create date in different timezone offset
      const markedAt = new Date('2025-01-01T00:00:00Z');
      const now = new Date('2025-01-02T00:00:00Z');
      
      // Mock Date.now() to return specific time
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const status = getOneFieldStatus(true, markedAt);
      expect(status).toBe('green'); // 24 hours have elapsed

      vi.useRealTimers();
    });

    it('handles daylight savings time correctly (UTC-based)', () => {
      // UTC timestamps avoid DST issues entirely
      const beforeDST = new Date('2025-03-09T01:00:00Z'); // Before DST
      const afterDST = new Date('2025-03-10T02:00:00Z');  // After DST (25 hours later in UTC)

      vi.useFakeTimers();
      vi.setSystemTime(afterDST);

      const status = getOneFieldStatus(true, beforeDST);
      expect(status).toBe('green'); // More than 24 hours

      vi.useRealTimers();
    });

    it('works correctly with ISO string timestamps (from API)', () => {
      // Simulating data coming from API as ISO string
      const isoString = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const markedAt = new Date(isoString);
      
      const status = getOneFieldStatus(true, markedAt);
      expect(status).toBe('yellow');
    });

    it('handles future timestamps gracefully (clock skew)', () => {
      // If server clock is ahead of client clock
      const futureTime = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour in future
      const status = getOneFieldStatus(true, futureTime);
      
      // Should still return yellow since negative elapsed time
      expect(status).toBe('yellow');
      
      const remaining = getRemainingTime(futureTime);
      // Should handle gracefully (will show > 24 hours remaining)
      expect(remaining).toBeDefined();
    });

    it('status changes from yellow to green after 24 hours', () => {
      const markedAt = new Date(Date.now() - 23 * 60 * 60 * 1000);

      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now()));

      // Should be yellow initially
      let status = getOneFieldStatus(true, markedAt);
      expect(status).toBe('yellow');

      // Advance time by 2 hours
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      // Should now be green
      status = getOneFieldStatus(true, markedAt);
      expect(status).toBe('green');

      vi.useRealTimers();
    });
  });
});
