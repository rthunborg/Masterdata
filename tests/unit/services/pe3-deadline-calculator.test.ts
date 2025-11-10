import { describe, it, expect } from 'vitest';
import {
  calculatePE3Deadlines,
  validatePE3Deadlines,
} from '@/lib/services/pe3-deadline-calculator';

describe('PE3 Deadline Calculator', () => {
  describe('calculatePE3Deadlines', () => {
    it('should calculate deadlines for mid-year date', () => {
      // Test case: March 15, 2025 (Saturday)
      // Week containing March 15: March 10-16 (Mon-Sun)
      // Week before: March 3-9
      // Expected Monday: March 3, 2025
      // Expected Wednesday: March 5, 2025
      const dates = ['2025-03-15'];
      const result = calculatePE3Deadlines(dates);

      expect(result.firstDate).toBe('2025-03-15');
      expect(result.deadlineCancel).toBe('2025-03-03');
      expect(result.deadlineSubmit).toBe('2025-03-05');
    });

    it('should calculate deadlines for first week of year', () => {
      // Test case: January 3, 2025 (Friday)
      // Week containing Jan 3: December 30, 2024 - January 5, 2025 (Mon-Sun)
      // Week before: December 23-29, 2024
      // Expected Monday: December 23, 2024
      // Expected Wednesday: December 25, 2024
      const dates = ['2025-01-03'];
      const result = calculatePE3Deadlines(dates);

      expect(result.firstDate).toBe('2025-01-03');
      expect(result.deadlineCancel).toBe('2024-12-23');
      expect(result.deadlineSubmit).toBe('2024-12-25');
    });

    it('should calculate deadlines based on earliest date in batch', () => {
      // Multiple dates: use earliest
      const dates = ['2025-03-19', '2025-03-10', '2025-03-28'];
      const result = calculatePE3Deadlines(dates);

      // Earliest is March 10, 2025 (Monday)
      // Week before: March 3-9
      // Expected Monday: March 3, 2025
      // Expected Wednesday: March 5, 2025
      expect(result.firstDate).toBe('2025-03-10');
      expect(result.deadlineCancel).toBe('2025-03-03');
      expect(result.deadlineSubmit).toBe('2025-03-05');
    });

    it('should handle single date import', () => {
      const dates = ['2025-04-10'];
      const result = calculatePE3Deadlines(dates);

      expect(result.firstDate).toBe('2025-04-10');
      expect(result.deadlineCancel).toBe('2025-03-31'); // Monday of previous week
      expect(result.deadlineSubmit).toBe('2025-04-02'); // Wednesday of previous week
    });

    it('should handle dates with times (ignores time)', () => {
      const dates = ['2025-03-15T14:00:00Z'];
      const result = calculatePE3Deadlines(dates);

      expect(result.firstDate).toBe('2025-03-15');
      expect(result.deadlineCancel).toBe('2025-03-03');
      expect(result.deadlineSubmit).toBe('2025-03-05');
    });

    it('should throw error when no dates provided', () => {
      expect(() => calculatePE3Deadlines([])).toThrow(
        'Cannot calculate deadlines: no dates provided'
      );
    });

    it('should throw error when all dates are invalid', () => {
      expect(() => calculatePE3Deadlines(['invalid-date', ''])).toThrow(
        'Cannot calculate deadlines: no valid dates provided'
      );
    });

    it('should filter out invalid dates and use valid ones', () => {
      const dates = ['invalid', '2025-03-15', '', '2025-03-10'];
      const result = calculatePE3Deadlines(dates);

      // Should use earliest valid date: March 10
      expect(result.firstDate).toBe('2025-03-10');
      expect(result.deadlineCancel).toBe('2025-03-03');
      expect(result.deadlineSubmit).toBe('2025-03-05');
    });

    it('should calculate deadlines for Sunday as first date', () => {
      // Test case: March 16, 2025 (Sunday)
      // Week containing March 16: March 10-16 (Mon-Sun)
      // Week before: March 3-9
      // Expected Monday: March 3, 2025
      // Expected Wednesday: March 5, 2025
      const dates = ['2025-03-16'];
      const result = calculatePE3Deadlines(dates);

      expect(result.firstDate).toBe('2025-03-16');
      expect(result.deadlineCancel).toBe('2025-03-03');
      expect(result.deadlineSubmit).toBe('2025-03-05');
    });

    it('should calculate deadlines for Monday as first date', () => {
      // Test case: March 10, 2025 (Monday)
      // Week before: March 3-9
      // Expected Monday: March 3, 2025
      // Expected Wednesday: March 5, 2025
      const dates = ['2025-03-10'];
      const result = calculatePE3Deadlines(dates);

      expect(result.firstDate).toBe('2025-03-10');
      expect(result.deadlineCancel).toBe('2025-03-03');
      expect(result.deadlineSubmit).toBe('2025-03-05');
    });
  });

  describe('validatePE3Deadlines', () => {
    it('should validate correct deadlines where submit is before cancel', () => {
      // Correct order: Submit (Wednesday) should be BEFORE Cancel (Monday of next week)
      // This test validates the expected business rule
      const result = validatePE3Deadlines(
        '2025-03-05', // Submit (Wednesday)
        '2025-03-10', // Cancel (Monday - after submit)
        '2025-03-15'  // First date (Saturday)
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when submit deadline is after cancel deadline', () => {
      const result = validatePE3Deadlines(
        '2025-03-12', // Submit (after cancel - invalid)
        '2025-03-10', // Cancel
        '2025-03-15'  // First date
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Submit deadline must be before or equal to cancel deadline');
    });

    it('should reject when cancel deadline is after first date', () => {
      const result = validatePE3Deadlines(
        '2025-03-12', // Submit
        '2025-03-16', // Cancel (after first date - invalid)
        '2025-03-15'  // First date
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cancel deadline must be before or equal to the first PE3 date');
    });

    it('should reject invalid date formats', () => {
      let result = validatePE3Deadlines(
        'invalid',
        '2025-03-10',
        '2025-03-15'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid submit deadline date format');

      result = validatePE3Deadlines(
        '2025-03-12',
        'invalid',
        '2025-03-15'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid cancel deadline date format');

      result = validatePE3Deadlines(
        '2025-03-12',
        '2025-03-10',
        'invalid'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid first date format');
    });

    it('should accept equal deadlines and dates', () => {
      // Edge case: submit = cancel (same day)
      const result = validatePE3Deadlines(
        '2025-03-10',
        '2025-03-10',
        '2025-03-15'
      );

      expect(result.valid).toBe(true);
    });
  });
});
