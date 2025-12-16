/**
 * Unit Tests for Enum Validation
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC3: Enum Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { createEmployeeSchemaWithMessages } from '@/lib/validation/employee-schema';
import { createMinimalEmployee } from '@/../tests/helpers/validation-test-helpers';

describe('Enum Validation - Gender', () => {
  const schema = createEmployeeSchemaWithMessages();

  describe('valid gender enum values', () => {
    it('should accept "Man"', () => {
      const result = schema.safeParse(createMinimalEmployee({ gender: 'Man' }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBe('Man');
      }
    });

    it('should accept "Woman"', () => {
      const result = schema.safeParse(createMinimalEmployee({ gender: 'Woman' }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBe('Woman');
      }
    });

    it('should accept null', () => {
      const result = schema.safeParse(createMinimalEmployee({ gender: null }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gender).toBeNull();
      }
    });
  });

  describe('invalid gender enum values', () => {
    it('should reject "male" (English lowercase)', () => {
      const result = schema.safeParse(createMinimalEmployee({ gender: 'male' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const genderError = result.error.errors.find(e => e.path.includes('gender'));
        expect(genderError).toBeDefined();
      }
    });

    it('should reject "Other"', () => {
      const result = schema.safeParse(createMinimalEmployee({ gender: 'Other' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const genderError = result.error.errors.find(e => e.path.includes('gender'));
        expect(genderError).toBeDefined();
      }
    });

    it('should reject empty string', () => {
      const result = schema.safeParse(createMinimalEmployee({ gender: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const genderError = result.error.errors.find(e => e.path.includes('gender'));
        expect(genderError).toBeDefined();
      }
    });
  });
});

describe('Enum Validation - Rank', () => {
  const schema = createEmployeeSchemaWithMessages();

  describe('valid rank enum values', () => {
    it('should accept "SEV"', () => {
      const result = schema.safeParse(createMinimalEmployee({ rank: 'SEV' }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rank).toBe('SEV');
      }
    });

    it('should accept "CHEF"', () => {
      const result = schema.safeParse(createMinimalEmployee({ rank: 'CHEF' }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rank).toBe('CHEF');
      }
    });
  });

  describe('invalid rank enum values', () => {
    it('should reject "sev" (lowercase)', () => {
      const result = schema.safeParse(createMinimalEmployee({ rank: 'sev' as unknown as 'SEV' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const rankError = result.error.errors.find(e => e.path.includes('rank'));
        expect(rankError).toBeDefined();
      }
    });

    it('should reject "Manager"', () => {
      const result = schema.safeParse(createMinimalEmployee({ rank: 'Manager' as unknown as 'SEV' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const rankError = result.error.errors.find(e => e.path.includes('rank'));
        expect(rankError).toBeDefined();
      }
    });

    it('should accept null (rank is optional)', () => {
      const result = schema.safeParse(createMinimalEmployee({ rank: null }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rank).toBeNull();
      }
    });

    it('should reject empty string', () => {
      const result = schema.safeParse(createMinimalEmployee({ rank: '' as unknown as 'SEV' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const rankError = result.error.errors.find(e => e.path.includes('rank'));
        expect(rankError).toBeDefined();
      }
    });
  });
});

