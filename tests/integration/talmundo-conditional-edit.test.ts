/**
 * Integration Tests for Talmundo Conditional Editability
 * Story 8.4: Talmundo Field with Conditional Editability
 * 
 * These tests verify the complete flow from API validation to business logic
 * ensuring that Talmundo field can only be edited when One field is green 
 * (past 00:01 AM the following day after marking).
 * 
 * Business Rule: Unlock time is 00:01 AM the calendar day after One was marked true.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canEditTalmundo } from '@/lib/services/talmundo-validation';
import type { Employee } from '@/lib/types/employee';

describe('Talmundo Conditional Editability Integration', () => {
  describe('Business Logic Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should reject Talmundo edit when One is false', () => {
      const result = canEditTalmundo(false, null);
      expect(result).toBe(false);
    });

    it('should reject Talmundo edit when One is yellow (before 00:01 AM next day)', () => {
      // Set current time to Jan 16, 2025 at 10:00 PM
      vi.setSystemTime(new Date('2025-01-16T22:00:00'));
      
      // Marked at 3 PM today (Jan 16) - unlock time is Jan 17 00:01 AM
      const markedAt = '2025-01-16T15:00:00';
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(false); // Still before unlock time
    });

    it('should allow Talmundo edit when One is green (past 00:01 AM next day)', () => {
      // Set current time to Jan 17, 2025 at 10:00 AM
      vi.setSystemTime(new Date('2025-01-17T10:00:00'));
      
      // Marked at 3 PM yesterday (Jan 16) - unlock time was Jan 17 00:01 AM
      const markedAt = '2025-01-16T15:00:00';
      const result = canEditTalmundo(true, markedAt);
      expect(result).toBe(true); // Past unlock time
    });
  });

  describe('Employee Data Model Integration', () => {
    it('should have talmundo field in Employee type', () => {
      const mockEmployee: Employee = {
        id: '123',
        first_name: 'Test',
        surname: 'User',
        ssn: '850315-1234',
        email: 'test@example.com',
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: '2025-01-01',
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        talmundo: false,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(mockEmployee.talmundo).toBeDefined();
      expect(typeof mockEmployee.talmundo).toBe('boolean');
    });
  });

  describe('Validation Schema Integration', () => {
    it('should validate employee data with talmundo field', async () => {
      const { createEmployeeSchema } = await import('@/lib/validation/employee-schema');
      
      const validData = {
        first_name: 'Test',
        surname: 'User',
        ssn: '850315-1234',
        email: 'test@example.com',
        mobile: null,
        rank: 'SEV' as const,
        gender: null,
        town_district: null,
        hire_date: '2020-01-01', // Use past date
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        comments: null,
        one: false,
        one_marked_at: null,
        talmundo: false,
        isps: false,
        photo: false,
        origo: false,
        loneiva: null,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const result = createEmployeeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject talmundo=true when One is false', async () => {
      const { createEmployeeSchema } = await import('@/lib/validation/employee-schema');
      
      const invalidData = {
        first_name: 'Test',
        surname: 'User',
        ssn: '850315-1234',
        email: 'test@example.com',
        mobile: null,
        rank: 'SEV' as const,
        gender: null,
        town_district: null,
        hire_date: '2020-01-01', // Use past date
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        comments: null,
        talmundo: true, // Invalid - One is false
        one: false,
        one_marked_at: null,
        isps: false,
        photo: false,
        origo: false,
        loneiva: null,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const result = createEmployeeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const talmundoError = result.error.errors.find(e => e.path.includes('talmundo'));
        expect(talmundoError).toBeDefined();
        // Business rule message mentions "following day" not specific hours
        expect(talmundoError?.message).toContain('following day');
      }
    });

    it('should reject talmundo=true when One is yellow (before unlock time)', async () => {
      vi.useFakeTimers();
      // Set current time to Jan 16, 2025 at 10:00 PM
      vi.setSystemTime(new Date('2025-01-16T22:00:00'));
      
      const { createEmployeeSchema } = await import('@/lib/validation/employee-schema');
      
      // Marked at 3 PM today - unlock time is Jan 17 00:01 AM
      const markedAt = '2025-01-16T15:00:00';
      const invalidData = {
        first_name: 'Test',
        surname: 'User',
        ssn: '850315-1234',
        email: 'test@example.com',
        mobile: null,
        rank: 'SEV' as const,
        gender: null,
        town_district: null,
        hire_date: '2020-01-01', // Use past date
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        comments: null,
        talmundo: true, // Invalid - One is yellow (before unlock time)
        one: true,
        one_marked_at: markedAt,
        isps: false,
        photo: false,
        origo: false,
        loneiva: null,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const result = createEmployeeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const talmundoError = result.error.errors.find(e => e.path.includes('talmundo'));
        expect(talmundoError).toBeDefined();
      }
      
      vi.useRealTimers();
    });

    it('should accept talmundo=true when One is green (past unlock time)', async () => {
      vi.useFakeTimers();
      // Set current time to Jan 17, 2025 at 10:00 AM
      vi.setSystemTime(new Date('2025-01-17T10:00:00'));
      
      // Re-import module to ensure it uses mocked Date
      vi.resetModules();
      const { createEmployeeSchema } = await import('@/lib/validation/employee-schema');
      
      // Marked at 3 PM yesterday - unlock time was Jan 17 00:01 AM
      // Using Z suffix for proper datetime validation (ISO 8601)
      const markedAt = '2025-01-16T15:00:00Z';
      const validData = {
        first_name: 'Test',
        surname: 'User',
        ssn: '850315-1234',
        email: 'test@example.com',
        mobile: null,
        rank: 'SEV' as const,
        gender: null,
        town_district: null,
        hire_date: '2020-01-01', // Use past date
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        comments: null,
        talmundo: true, // Valid - One is green (past unlock time)
        one: true,
        one_marked_at: markedAt,
        isps: false,
        photo: false,
        origo: false,
        loneiva: null,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const result = createEmployeeSchema.safeParse(validData);
      if (!result.success) {
        console.log('Validation errors:', JSON.stringify(result.error.errors, null, 2));
      }
      expect(result.success).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('Time-based Status Transitions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should transition from disabled to enabled at 00:01 AM the next day', () => {
      // Set current time to Jan 16, 2025 at 11:00 PM
      vi.setSystemTime(new Date('2025-01-16T23:00:00'));
      
      // Marked at 3 PM today - unlock time is Jan 17 00:01 AM
      const markedToday = '2025-01-16T15:00:00';
      expect(canEditTalmundo(true, markedToday)).toBe(false); // Still before unlock

      // Move time to exactly 00:01 AM next day
      vi.setSystemTime(new Date('2025-01-17T00:01:00'));
      expect(canEditTalmundo(true, markedToday)).toBe(true); // Now unlocked
    });

    it('should become disabled again if One is set to false', () => {
      // Set time to well past unlock
      vi.setSystemTime(new Date('2025-01-17T10:00:00'));
      
      // Marked yesterday - should be unlocked
      const markedYesterday = '2025-01-16T15:00:00';
      expect(canEditTalmundo(true, markedYesterday)).toBe(true);

      // One is set to false - Talmundo should become disabled
      expect(canEditTalmundo(false, markedYesterday)).toBe(false);
    });
  });
});
