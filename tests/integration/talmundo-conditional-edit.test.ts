/**
 * Integration Tests for Talmundo Conditional Editability
 * Story 8.4: Talmundo Field with Conditional Editability
 * 
 * These tests verify the complete flow from API validation to business logic
 * ensuring that Talmundo field can only be edited when One field is green (>= 24 hours)
 */

import { describe, it, expect } from 'vitest';
import { canEditTalmundo } from '@/lib/services/talmundo-validation';
import type { Employee } from '@/lib/types/employee';

describe('Talmundo Conditional Editability Integration', () => {
  describe('Business Logic Integration', () => {
    it('should reject Talmundo edit when One is false', () => {
      const result = canEditTalmundo(false, null);
      expect(result).toBe(false);
    });

    it('should reject Talmundo edit when One is yellow (< 24 hours)', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const result = canEditTalmundo(true, twelveHoursAgo);
      expect(result).toBe(false);
    });

    it('should allow Talmundo edit when One is green (>= 24 hours)', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const result = canEditTalmundo(true, twentyFiveHoursAgo);
      expect(result).toBe(true);
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
        expect(talmundoError?.message).toContain('24 hours');
      }
    });

    it('should reject talmundo=true when One is yellow (< 24 hours)', async () => {
      const { createEmployeeSchema } = await import('@/lib/validation/employee-schema');
      
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
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
        talmundo: true, // Invalid - One is yellow (< 24 hours)
        one: true,
        one_marked_at: twelveHoursAgo,
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
    });

    it('should accept talmundo=true when One is green (>= 24 hours)', async () => {
      const { createEmployeeSchema } = await import('@/lib/validation/employee-schema');
      
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
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
        talmundo: true, // Valid - One is green (>= 24 hours)
        one: true,
        one_marked_at: twentyFiveHoursAgo,
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
  });

  describe('Time-based Status Transitions', () => {
    it('should transition from disabled to enabled after 24 hours', () => {
      // Just before 24 hours
      const almostTwentyFourHours = new Date(
        Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000
      ).toISOString();
      expect(canEditTalmundo(true, almostTwentyFourHours)).toBe(false);

      // Exactly 24 hours
      const exactlyTwentyFourHours = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      expect(canEditTalmundo(true, exactlyTwentyFourHours)).toBe(true);

      // After 24 hours
      const moreThanTwentyFourHours = new Date(
        Date.now() - 25 * 60 * 60 * 1000
      ).toISOString();
      expect(canEditTalmundo(true, moreThanTwentyFourHours)).toBe(true);
    });

    it('should become disabled again if One is set to false', () => {
      // Initially One is green and Talmundo is editable
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      expect(canEditTalmundo(true, twentyFiveHoursAgo)).toBe(true);

      // One is set to false - Talmundo should become disabled
      expect(canEditTalmundo(false, twentyFiveHoursAgo)).toBe(false);
    });
  });
});
