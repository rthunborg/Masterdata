/**
 * Unit Tests for Range Validation
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC4: Range Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { createEmployeeSchemaWithMessages } from '@/lib/validation/employee-schema';

describe('Range Validation - Lönenivå (loneiva)', () => {
  const schema = createEmployeeSchemaWithMessages();

  describe('valid lönenivå range values', () => {
    it('should accept 0 (minimum)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBe(0);
      }
    });

    it('should accept 7 (maximum)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: 7,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBe(7);
      }
    });

    it('should accept 3 (middle value)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: 3,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBe(3);
      }
    });

    it('should accept null', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBeNull();
      }
    });
  });

  describe('invalid lönenivå range values', () => {
    it('should reject -1 (below minimum)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: -1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('loneiva');
        expect(result.error.errors[0].message).toContain('at least 0');
      }
    });

    it('should reject 8 (above maximum)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: 8,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('loneiva');
        expect(result.error.errors[0].message).toContain('at most 7');
      }
    });

    it('should reject 3.5 (decimal)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: 3.5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('loneiva');
        expect(result.error.errors[0].message).toContain('whole number');
      }
    });

    it('should reject "3" (string)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: '3' as any,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('loneiva');
      }
    });

    it('should reject 100 (way above maximum)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        loneiva: 100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('loneiva');
        expect(result.error.errors[0].message).toContain('at most 7');
      }
    });
  });
});

