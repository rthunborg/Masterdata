/**
 * Unit Tests for Range Validation
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC4: Range Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { createEmployeeSchemaWithMessages } from '@/lib/validation/employee-schema';
import { createMinimalEmployee } from '@/../tests/helpers/validation-test-helpers';

describe('Range Validation - Lönenivå (loneiva)', () => {
  const schema = createEmployeeSchemaWithMessages();

  describe('valid lönenivå range values', () => {
    it('should accept 0 (minimum)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: 0 }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBe(0);
      }
    });

    it('should accept 7 (maximum)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: 7 }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBe(7);
      }
    });

    it('should accept 3 (middle value)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: 3 }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBe(3);
      }
    });

    it('should accept null', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: null }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loneiva).toBeNull();
      }
    });
  });

  describe('invalid lönenivå range values', () => {
    it('should reject -1 (below minimum)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: -1 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const loneivaError = result.error.errors.find(e => e.path.includes('loneiva'));
        expect(loneivaError).toBeDefined();
        expect(loneivaError?.message).toContain('at least 0');
      }
    });

    it('should reject 8 (above maximum)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: 8 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const loneivaError = result.error.errors.find(e => e.path.includes('loneiva'));
        expect(loneivaError).toBeDefined();
        expect(loneivaError?.message).toContain('at most 7');
      }
    });

    it('should reject 3.5 (decimal)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: 3.5 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const loneivaError = result.error.errors.find(e => e.path.includes('loneiva'));
        expect(loneivaError).toBeDefined();
        expect(loneivaError?.message).toContain('whole number');
      }
    });

    it('should reject "3" (string)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: '3' as unknown as number }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const loneivaError = result.error.errors.find(e => e.path.includes('loneiva'));
        expect(loneivaError).toBeDefined();
      }
    });

    it('should reject 100 (way above maximum)', () => {
      const result = schema.safeParse(createMinimalEmployee({ loneiva: 100 }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const loneivaError = result.error.errors.find(e => e.path.includes('loneiva'));
        expect(loneivaError).toBeDefined();
        expect(loneivaError?.message).toContain('at most 7');
      }
    });
  });
});

