/**
 * Unit Tests for Crew Ready Auto-Selection
 * Story 13.5: Crew Ready Filter Auto-Selection
 * 
 * Tests verify:
 * 1. getCrewReadyEmployeeIds() returns correct IDs
 * 2. Only employees meeting ALL criteria are included
 * 3. Employees without loneiva are excluded
 * 4. Employees with any false boolean field are excluded
 * 5. hotel_required is not part of criteria
 */

import { describe, it, expect } from 'vitest';
import { canEditCrewingDone } from '@/lib/services/crewing-validation';
import type { Employee } from '@/lib/types/employee';

// Helper function to replace getCrewReadyEmployeeIds
function getCrewReadyEmployeeIds(employees: Employee[]): string[] {
  return employees
    .filter((employee) => canEditCrewingDone(employee))
    .map((employee) => employee.id);
}

describe('Story 13.5: Crew Ready Auto-Selection', () => {
  describe('getCrewReadyEmployeeIds', () => {
    it('should return correct IDs for employees meeting all crew ready criteria', () => {
      const employees: Employee[] = [
        {
          id: '1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
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
        } as Employee,
        {
          id: '2',
          first_name: 'Jane',
          surname: 'Smith',
          ssn: '987654-3210',
          isps: true,
          photo: true,
          origo: true,
          mail_lon: true,
          loneiva: 3,
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
        } as Employee,
      ];

      const result = getCrewReadyEmployeeIds(employees);
      expect(result).toEqual(['1', '2']);
    });

    it('should include employees with loneiva null when other 8 prerequisites are true', () => {
      const employees: Employee[] = [
        {
          id: '1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          isps: true,
          photo: true,
          origo: true,
          mail_lon: true,
          loneiva: null, // loneiva no longer required for Crewing
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
        } as Employee,
      ];

      const result = getCrewReadyEmployeeIds(employees);
      expect(result).toEqual(['1']);
    });

    it('should include employees with loneiva 0 (Lönenivå 0)', () => {
      const employees: Employee[] = [
        {
          id: '1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          isps: true,
          photo: true,
          origo: true,
          mail_lon: true,
          loneiva: 0, // Lönenivå 0 is valid
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
        } as Employee,
      ];

      const result = getCrewReadyEmployeeIds(employees);
      expect(result).toEqual(['1']);
    });

    it('should exclude employees with any false boolean field', () => {
      const employees: Employee[] = [
        {
          id: '1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          isps: false, // Missing ISP
          photo: true,
          origo: true,
          mail_lon: true,
          loneiva: 1,
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
        } as Employee,
        {
          id: '2',
          first_name: 'Jane',
          surname: 'Smith',
          ssn: '987654-3210',
          isps: true,
          photo: null, // Null photo
          origo: true,
          mail_lon: true,
          loneiva: 1,
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
        } as Employee,
      ];

      const result = getCrewReadyEmployeeIds(employees);
      expect(result).toEqual([]);
    });

    it('should not consider hotel_required in crew ready criteria', () => {
      const employees: Employee[] = [
        {
          id: '1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
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
          hotel_required: false, // Should not affect crew ready status
        } as Employee,
        {
          id: '2',
          first_name: 'Jane',
          surname: 'Smith',
          ssn: '987654-3210',
          isps: true,
          photo: true,
          origo: true,
          mail_lon: true,
          loneiva: 2,
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
          hotel_required: true, // Should not affect crew ready status
        } as Employee,
      ];

      const result = getCrewReadyEmployeeIds(employees);
      // Both should be included regardless of hotel_required value
      expect(result).toEqual(['1', '2']);
    });

    it('should return empty array when no employees meet criteria', () => {
      const employees: Employee[] = [
        {
          id: '1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          isps: false,
          photo: false,
          origo: false,
          mail_lon: false,
          loneiva: null,
          bankuppgifter: false,
          li: false,
          passport: false,
          kvitto_c17_18: false,
          c17: false,
        } as Employee,
      ];

      const result = getCrewReadyEmployeeIds(employees);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const employees: Employee[] = [];
      const result = getCrewReadyEmployeeIds(employees);
      expect(result).toEqual([]);
    });

    it('should handle mixed employees - some crew ready, some not', () => {
      const employees: Employee[] = [
        {
          id: '1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
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
        } as Employee,
        {
          id: '2',
          first_name: 'Jane',
          surname: 'Smith',
          ssn: '987654-3210',
          isps: false, // Not crew ready
          photo: true,
          origo: true,
          mail_lon: true,
          loneiva: 1,
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
        } as Employee,
        {
          id: '3',
          first_name: 'Bob',
          surname: 'Johnson',
          ssn: '111111-2222',
          isps: true,
          photo: true,
          origo: true,
          mail_lon: true,
          loneiva: 2,
          bankuppgifter: true,
          li: true,
          passport: true,
          kvitto_c17_18: true,
          c17: true,
        } as Employee,
      ];

      const result = getCrewReadyEmployeeIds(employees);
      expect(result).toEqual(['1', '3']); // Only IDs 1 and 3 meet all criteria
    });
  });
});

