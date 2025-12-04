/**
 * Unit Tests for PE3 Time Field Validation
 * Story 11.10: PE3 Validation & UI Component Tests
 * AC1: PE3 Time Field Mandatory Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { createImportantDateSchema, updateImportantDateSchema } from '@/lib/validation/important-date-schema';

describe('PE3 Time Field Mandatory Validation', () => {
  const schema = createImportantDateSchema;

  describe('AC1: PE3 Time Field Mandatory Validation Tests', () => {
    it('should reject PE3 date without time field', () => {
      const result = schema.safeParse({
        category: 'PE3 Dates',
        date_description: 'Test PE3 Date',
        date_value: '2025-03-15',
        year: 2025,
        max_spots: 10,
        remaining_spots: 10,
        time_value: null,
        deadline_submit: null,
        deadline_cancel: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const timeError = result.error.issues.find((e: any) => 
          Array.isArray(e.path) && e.path.length > 0 && e.path[e.path.length - 1] === 'time_value'
        );
        expect(timeError).toBeDefined();
        expect(timeError?.message).toBe('Time is required for PE3 dates');
      }
    });

    it('should reject PE3 date with empty time string', () => {
      const result = schema.safeParse({
        category: 'PE3 Dates',
        date_description: 'Test PE3 Date',
        date_value: '2025-03-15',
        year: 2025,
        max_spots: 10,
        remaining_spots: 10,
        time_value: '',
        deadline_submit: null,
        deadline_cancel: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const timeError = result.error.issues.find((e: any) => 
          Array.isArray(e.path) && e.path.length > 0 && e.path[e.path.length - 1] === 'time_value'
        );
        expect(timeError).toBeDefined();
        expect(timeError?.message).toBe('Time is required for PE3 dates');
      }
    });

    it('should accept PE3 date with valid time (HH:MM format)', () => {
      const result = schema.safeParse({
        category: 'PE3 Dates',
        date_description: 'Test PE3 Date',
        date_value: '2025-03-15',
        year: 2025,
        max_spots: 10,
        remaining_spots: 10,
        time_value: '14:30',
        deadline_submit: null,
        deadline_cancel: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.time_value).toBe('14:30');
        expect(result.data.category).toBe('PE3 Dates');
      }
    });

    it('should reject PE3 date with invalid time format', () => {
      const result = schema.safeParse({
        category: 'PE3 Dates',
        date_description: 'Test PE3 Date',
        date_value: '2025-03-15',
        year: 2025,
        max_spots: 10,
        remaining_spots: 10,
        time_value: '25:00', // Invalid hour
        deadline_submit: null,
        deadline_cancel: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const timeError = result.error.issues.find((e: any) => 
          Array.isArray(e.path) && e.path.length > 0 && e.path[e.path.length - 1] === 'time_value'
        );
        expect(timeError).toBeDefined();
        expect(timeError?.message).toContain('HH:MM');
      }
    });

    it('should reject PE3 date with invalid minute format', () => {
      const result = schema.safeParse({
        category: 'PE3 Dates',
        date_description: 'Test PE3 Date',
        date_value: '2025-03-15',
        year: 2025,
        max_spots: 10,
        remaining_spots: 10,
        time_value: '14:60', // Invalid minute
        deadline_submit: null,
        deadline_cancel: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const timeError = result.error.issues.find((e: any) => 
          Array.isArray(e.path) && e.path.length > 0 && e.path[e.path.length - 1] === 'time_value'
        );
        expect(timeError).toBeDefined();
      }
    });

    it('should accept valid time formats for PE3 dates', () => {
      const validTimes = ['00:00', '09:05', '14:30', '23:59'];
      
      validTimes.forEach((time) => {
        const result = schema.safeParse({
          category: 'PE3 Dates',
          date_description: 'Test PE3 Date',
          date_value: '2025-03-15',
          year: 2025,
          max_spots: 10,
          remaining_spots: 10,
          time_value: time,
          deadline_submit: null,
          deadline_cancel: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.time_value).toBe(time);
        }
      });
    });

    it('should allow other categories without time field', () => {
      const categories = ['Stena Dates', 'ÖMC Dates', 'Other'];
      
      categories.forEach((category) => {
        const result = schema.safeParse({
          category,
          date_description: 'Test Date',
          date_value: '2025-03-15',
          year: 2025,
          max_spots: 10,
          remaining_spots: 10,
          time_value: null,
          deadline_submit: null,
          deadline_cancel: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.time_value).toBeNull();
        }
      });
    });
  });

  describe('Update Schema: PE3 Time Validation', () => {
    it('should reject updating PE3 date to clear time field', () => {
      // First create a valid PE3 date with time
      const createResult = schema.safeParse({
        category: 'PE3 Dates',
        date_description: 'Test PE3 Date',
        date_value: '2025-03-15',
        year: 2025,
        max_spots: 10,
        remaining_spots: 10,
        time_value: '14:30',
        deadline_submit: null,
        deadline_cancel: null,
      });
      expect(createResult.success).toBe(true);

      // Try to update and clear time
      const updateResult = updateImportantDateSchema.safeParse({
        category: 'PE3 Dates',
        time_value: null,
      });

      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        const timeError = updateResult.error.issues.find((e: any) => 
          Array.isArray(e.path) && e.path.length > 0 && e.path[e.path.length - 1] === 'time_value'
        );
        expect(timeError).toBeDefined();
        expect(timeError?.message).toBe('Time is required for PE3 dates');
      }
    });

    it('should reject updating PE3 date to empty time string', () => {
      const updateResult = updateImportantDateSchema.safeParse({
        category: 'PE3 Dates',
        time_value: '',
      });

      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        const timeError = updateResult.error.issues.find((e: any) => 
          Array.isArray(e.path) && e.path.length > 0 && e.path[e.path.length - 1] === 'time_value'
        );
        expect(timeError).toBeDefined();
        expect(timeError?.message).toBe('Time is required for PE3 dates');
      }
    });

    it('should allow updating PE3 date with valid time', () => {
      const updateResult = updateImportantDateSchema.safeParse({
        category: 'PE3 Dates',
        time_value: '15:45',
      });

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.data.time_value).toBe('15:45');
      }
    });

    it('should allow updating other fields without changing time for PE3', () => {
      const updateResult = updateImportantDateSchema.safeParse({
        category: 'PE3 Dates',
        date_description: 'Updated description',
        // time_value not provided, but category is PE3 - should fail if time is cleared
      });

      // If category is PE3 and time_value is undefined, it should not fail
      // because update schema allows partial updates
      // But if time_value is explicitly set to null, it should fail
      expect(updateResult.success).toBe(true);
    });
  });
});

