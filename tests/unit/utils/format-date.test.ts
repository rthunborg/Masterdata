import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '@/lib/utils/format';

describe('formatRelativeTime', () => {
  describe('Null handling', () => {
    it('should return "Never" for null timestamp', () => {
      expect(formatRelativeTime(null, 'en')).toBe('Never');
    });

    it('should return "Aldrig" for null timestamp in Swedish', () => {
      expect(formatRelativeTime(null, 'sv', 'Aldrig')).toBe('Aldrig');
    });

    it('should use custom neverText parameter', () => {
      expect(formatRelativeTime(null, 'en', 'Not available')).toBe('Not available');
    });
  });

  describe('Recent activity (English)', () => {
    it('should format activity from 2 hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(twoHoursAgo, 'en');
      expect(result).toMatch(/2 hours ago|about 2 hours ago/);
    });

    it('should format activity from 30 minutes ago', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const result = formatRelativeTime(thirtyMinutesAgo, 'en');
      expect(result).toMatch(/30 minutes ago|about 30 minutes ago/);
    });

    it('should format activity from 1 day ago', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(oneDayAgo, 'en');
      expect(result).toMatch(/1 day ago|about 1 day ago/);
    });

    it('should format activity from 3 days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(threeDaysAgo, 'en');
      expect(result).toMatch(/3 days ago|about 3 days ago/);
    });
  });

  describe('Recent activity (Swedish)', () => {
    it('should format activity from 2 hours ago in Swedish', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(twoHoursAgo, 'sv');
      expect(result).toMatch(/timmar sedan|ungefär två timmar sedan/);
    });

    it('should format activity from 30 minutes ago in Swedish', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const result = formatRelativeTime(thirtyMinutesAgo, 'sv');
      expect(result).toMatch(/30 minuter sedan|cirka 30 minuter sedan/);
    });

    it('should format activity from 1 day ago in Swedish', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(oneDayAgo, 'sv');
      expect(result).toMatch(/dag sedan/);
    });
  });

  describe('Edge cases', () => {
    it('should handle very recent activity (< 1 minute)', () => {
      const justNow = new Date(Date.now() - 30 * 1000).toISOString();
      const result = formatRelativeTime(justNow, 'en');
      expect(result).toMatch(/seconds ago|minute ago/);
    });

    it('should default to English locale if invalid locale provided', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(twoHoursAgo, 'invalid-locale');
      expect(result).toMatch(/2 hours ago|about 2 hours ago/);
    });

    it('should handle malformed timestamp gracefully', () => {
      const result = formatRelativeTime('invalid-timestamp', 'en');
      expect(result).toBe('Never');
    });
  });
});
