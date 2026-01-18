/**
 * Story 19.5: Column Validation Tests for is_checklist_item
 * 
 * Tests that is_checklist_item validation works correctly:
 * - Only boolean columns can be marked as checklist items
 * - Non-boolean columns cannot be marked as checklist items
 */

import { describe, it, expect } from 'vitest';
import { createCustomColumnSchema } from '@/lib/validation/column-validation';

describe('createCustomColumnSchema - is_checklist_item validation', () => {
  const baseValidInput = {
    column_name: 'Test Column',
    db_column_name: 'test_column',
    is_masterdata: false,
  };

  it('should allow is_checklist_item=true for boolean columns', () => {
    const input = {
      ...baseValidInput,
      column_type: 'boolean' as const,
      is_checklist_item: true,
    };

    const result = createCustomColumnSchema.safeParse(input);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_checklist_item).toBe(true);
    }
  });

  it('should allow is_checklist_item=false for boolean columns', () => {
    const input = {
      ...baseValidInput,
      column_type: 'boolean' as const,
      is_checklist_item: false,
    };

    const result = createCustomColumnSchema.safeParse(input);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_checklist_item).toBe(false);
    }
  });

  it('should reject is_checklist_item=true for text columns', () => {
    const input = {
      ...baseValidInput,
      column_type: 'text' as const,
      is_checklist_item: true,
    };

    const result = createCustomColumnSchema.safeParse(input);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find(
        (issue) => issue.path.includes('is_checklist_item')
      );
      expect(error?.message).toBe('Only boolean columns can be marked as checklist items');
    }
  });

  it('should reject is_checklist_item=true for number columns', () => {
    const input = {
      ...baseValidInput,
      column_type: 'number' as const,
      is_checklist_item: true,
    };

    const result = createCustomColumnSchema.safeParse(input);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find(
        (issue) => issue.path.includes('is_checklist_item')
      );
      expect(error?.message).toBe('Only boolean columns can be marked as checklist items');
    }
  });

  it('should reject is_checklist_item=true for date columns', () => {
    const input = {
      ...baseValidInput,
      column_type: 'date' as const,
      is_checklist_item: true,
    };

    const result = createCustomColumnSchema.safeParse(input);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = result.error.issues.find(
        (issue) => issue.path.includes('is_checklist_item')
      );
      expect(error?.message).toBe('Only boolean columns can be marked as checklist items');
    }
  });

  it('should allow omitting is_checklist_item (optional field)', () => {
    const input = {
      ...baseValidInput,
      column_type: 'boolean' as const,
      // is_checklist_item omitted
    };

    const result = createCustomColumnSchema.safeParse(input);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_checklist_item).toBeUndefined();
    }
  });

  it('should allow is_checklist_item=false for non-boolean columns', () => {
    const input = {
      ...baseValidInput,
      column_type: 'text' as const,
      is_checklist_item: false,
    };

    const result = createCustomColumnSchema.safeParse(input);
    
    // This should pass because is_checklist_item is false
    expect(result.success).toBe(true);
  });
});
