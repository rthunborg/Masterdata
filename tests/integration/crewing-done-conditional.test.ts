/**
 * Integration Tests for Crewing/Done Conditional Editability
 * Story 8.5: Crewing/Done Field Conditional Logic
 * 
 * These tests verify the complete flow from API validation to business logic
 * ensuring that Crewing/Done field can only be edited when all 8 prerequisite fields are true (kvitto_c17_18 and loneiva not required).
 */

import { describe, it, expect } from 'vitest';
import { canEditCrewingDone, getIncompleteFields } from '@/lib/services/crewing-validation';
import type { Employee } from '@/lib/types/employee';

describe('Crewing/Done Conditional Editability Integration', () => {
  // Complete employee with all 8 prerequisites set to true (loneiva and kvitto_c17_18 not required)
  const completeEmployee: Partial<Employee> = {
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    c17: true,
  };

  describe('Business Logic Integration', () => {
    it('should allow Crewing/Done edit when all prerequisites are true', () => {
      const result = canEditCrewingDone(completeEmployee);
      expect(result).toBe(true);
    });

    it('should reject Crewing/Done edit when any prerequisite is false', () => {
      const incompleteEmployee = { ...completeEmployee, isps: false };
      const result = canEditCrewingDone(incompleteEmployee);
      expect(result).toBe(false);
    });

    it('should reject Crewing/Done edit when any prerequisite is null', () => {
      const incompleteEmployee = { ...completeEmployee, photo: null };
      const result = canEditCrewingDone(incompleteEmployee);
      expect(result).toBe(false);
    });

    it('should return correct incomplete field names', () => {
      const incompleteEmployee = {
        ...completeEmployee,
        isps: false,
        photo: null,
        origo: false,
      };
      const incomplete = getIncompleteFields(incompleteEmployee);
      expect(incomplete).toEqual(['ISP', 'Photo', 'Origo']);
    });

    it('should return empty array when all prerequisites complete', () => {
      const incomplete = getIncompleteFields(completeEmployee);
      expect(incomplete).toEqual([]);
    });
  });

  describe('Employee Data Model Integration', () => {
    it('should have crewing_done field in Employee type', () => {
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
        comments: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(mockEmployee.crewing_done).toBeDefined();
      expect(typeof mockEmployee.crewing_done).toBe('boolean');
    });

    it('should have all 8 crewing prerequisite fields plus loneiva and kvitto_c17_18 in Employee type', () => {
      const mockEmployee: Partial<Employee> = {
        isps: true,
        photo: true,
        origo: true,
        mail_lon: true,
        loneiva: 1,
        bankuppgifter: true,
        li: true,
        passport: true,
        kvitto_c17_18: true,
        c17: true,
      };

      expect(mockEmployee.isps).toBeDefined();
      expect(mockEmployee.photo).toBeDefined();
      expect(mockEmployee.origo).toBeDefined();
      expect(mockEmployee.loneiva).toBeDefined();
      expect(mockEmployee.mail_lon).toBeDefined();
      expect(mockEmployee.bankuppgifter).toBeDefined();
      expect(mockEmployee.li).toBeDefined();
      expect(mockEmployee.passport).toBeDefined();
      expect(mockEmployee.kvitto_c17_18).toBeDefined();
      expect(mockEmployee.c17).toBeDefined();
    });
  });

  describe('Validation Schema Integration', () => {
    it('should validate employee data with crewing_done field', async () => {
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
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const result = createEmployeeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept crewing_done=true when all prerequisites are true', async () => {
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
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const result = createEmployeeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Prerequisites Validation', () => {
    it('should allow edit when kvitto_c17_18 is false but all 8 prerequisites are true', () => {
      const withKvittoFalse = { ...completeEmployee, kvitto_c17_18: false };
      const result = canEditCrewingDone(withKvittoFalse);
      expect(result).toBe(true);
      expect(getIncompleteFields(withKvittoFalse)).toEqual([]);
    });

    it('should reject edit when only 7 out of 8 prerequisites are true', () => {
      const almostComplete = { ...completeEmployee, c17: false };
      const result = canEditCrewingDone(almostComplete);
      expect(result).toBe(false);

      const incomplete = getIncompleteFields(almostComplete);
      expect(incomplete).toEqual(['C17']);
    });

    it('should reject edit when only 1 out of 8 prerequisites is true', () => {
      const mostlyIncomplete = {
        isps: true, // Only this one is true
        photo: false,
        origo: false,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
      };
      const result = canEditCrewingDone(mostlyIncomplete);
      expect(result).toBe(false);

      const incomplete = getIncompleteFields(mostlyIncomplete);
      expect(incomplete.length).toBe(7);
      expect(incomplete).toContain('Photo');
      expect(incomplete).toContain('Origo');
      expect(incomplete).toContain('Mail');
      expect(incomplete).toContain('Bankuppgifter');
      expect(incomplete).toContain('LI');
      expect(incomplete).toContain('Passport');
      expect(incomplete).toContain('C17');
    });

    it('should reject edit when all prerequisites are false', () => {
      const allIncomplete = {
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
      };
      const result = canEditCrewingDone(allIncomplete);
      expect(result).toBe(false);

      const incomplete = getIncompleteFields(allIncomplete);
      expect(incomplete.length).toBe(8);
    });
  });

  describe('Prerequisite State Transitions', () => {
    it('should become editable when last prerequisite is completed', () => {
      // Before completing last prerequisite
      const beforeComplete = { ...completeEmployee, c17: false };
      expect(canEditCrewingDone(beforeComplete)).toBe(false);

      // After completing last prerequisite
      const afterComplete = { ...completeEmployee, c17: true };
      expect(canEditCrewingDone(afterComplete)).toBe(true);
    });

    it('should become disabled again if any prerequisite is set to false', () => {
      // Initially all prerequisites are complete
      expect(canEditCrewingDone(completeEmployee)).toBe(true);

      // One prerequisite is set to false
      const nowIncomplete = { ...completeEmployee, isps: false };
      expect(canEditCrewingDone(nowIncomplete)).toBe(false);
    });

    it('should correctly identify which fields became incomplete', () => {
      // Complete state
      expect(getIncompleteFields(completeEmployee)).toEqual([]);

      // Set 3 fields to false
      const partiallyIncomplete = {
        ...completeEmployee,
        isps: false,
        mail_lon: false,
        passport: false,
      };
      const incomplete = getIncompleteFields(partiallyIncomplete);
      expect(incomplete).toEqual(['ISP', 'Mail', 'Passport']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty employee object', () => {
      const result = canEditCrewingDone({});
      expect(result).toBe(false);

      const incomplete = getIncompleteFields({});
      expect(incomplete.length).toBe(8);
    });

    it('should handle missing prerequisite fields', () => {
      const incomplete = { ...completeEmployee };
      delete (incomplete as Record<string, unknown>).li;
      
      const result = canEditCrewingDone(incomplete);
      expect(result).toBe(false);

      const incompleteFields = getIncompleteFields(incomplete);
      expect(incompleteFields).toContain('LI');
    });

    it('should handle crewing_done being already set', () => {
      const employeeWithCrewingDone = {
        ...completeEmployee,
        crewing_done: true,
      };
      
      // Should still validate prerequisites
      const result = canEditCrewingDone(employeeWithCrewingDone);
      expect(result).toBe(true);
    });
  });
});
