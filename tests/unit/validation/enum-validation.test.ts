/**
 * Unit Tests for Enum Validation
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC3: Enum Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { createEmployeeSchemaWithMessages } from '@/lib/validation/employee-schema';

describe('Enum Validation - Gender', () => {
  const schema = createEmployeeSchemaWithMessages();

  describe('valid gender enum values', () => {
    it('should accept "Man"', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        gender: 'Man',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBe('Man');
      }
    });

    it('should accept "Woman"', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        gender: 'Woman',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBe('Woman');
      }
    });

    it('should accept null', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        gender: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBeNull();
      }
    });
  });

  describe('invalid gender enum values', () => {
    it('should reject "male" (English lowercase)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        gender: 'male',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('gender');
      }
    });

    it('should reject "Other"', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        gender: 'Other',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('gender');
      }
    });

    it('should reject empty string', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
        gender: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('gender');
      }
    });
  });
});

describe('Enum Validation - Rank', () => {
  const schema = createEmployeeSchemaWithMessages();

  describe('valid rank enum values', () => {
    it('should accept "SEV"', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'SEV',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rank).toBe('SEV');
      }
    });

    it('should accept "CHEF"', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'CHEF',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rank).toBe('CHEF');
      }
    });
  });

  describe('invalid rank enum values', () => {
    it('should reject "sev" (lowercase)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'sev',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('rank');
      }
    });

    it('should reject "Manager"', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: 'Manager',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('rank');
      }
    });

    it('should reject null (rank is required)', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('rank');
      }
    });

    it('should reject empty string', () => {
      const result = schema.safeParse({
        first_name: 'Test',
        surname: 'Employee',
        ssn: '19900101-1234',
        hire_date: '2025-01-01',
        rank: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('rank');
      }
    });
  });
});

