import { describe, it, expect } from 'vitest';
import {
  canEditField,
  canAddEmployee,
  canArchiveEmployee,
  canTerminateEmployee,
  isAdminLimited,
  getRoleDisplayName,
} from '@/lib/utils/role-utils';
import { UserRole } from '@/lib/types/user';
import type { ColumnConfig } from '@/lib/types/column-config';

/**
 * Tests for Admin Limited (Administratör) role functionality
 * 
 * Admin Limited is a restricted internal role with:
 * - Same view permissions as HR Admin/Recruiter
 * - Can only edit: checklist fields (is_checklist_item=true) + loneniva field
 * - Cannot: add employees, archive employees, terminate employees
 * - Cannot access: Important Dates, Admin tabs
 */

// Helper to create a mock ColumnConfig
function createMockColumnConfig(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    id: 'test-id',
    column_name: 'Test Column',
    db_column_name: 'test_column',
    column_type: 'text',
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: true },
      admin_limited: { view: true, edit: false },
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
      crewing: { view: false, edit: false },
    },
    is_masterdata: true,
    category: null,
    category_color: null,
    display_order: 0,
    is_visible: true,
    is_checklist_item: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Admin Limited Role - Permission Helpers', () => {
  describe('isAdminLimited', () => {
    it('returns true for admin_limited role', () => {
      expect(isAdminLimited(UserRole.ADMIN_LIMITED)).toBe(true);
    });

    it('returns false for other roles', () => {
      expect(isAdminLimited(UserRole.HR_ADMIN)).toBe(false);
      expect(isAdminLimited(UserRole.RECRUITER)).toBe(false);
      expect(isAdminLimited(UserRole.SODEXO)).toBe(false);
      expect(isAdminLimited(UserRole.OMC)).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('returns "Administratör" for admin_limited role', () => {
      expect(getRoleDisplayName(UserRole.ADMIN_LIMITED)).toBe('Administratör');
    });
  });

  describe('canAddEmployee', () => {
    it('returns false for admin_limited role', () => {
      expect(canAddEmployee(UserRole.ADMIN_LIMITED)).toBe(false);
    });

    it('returns true for HR Admin', () => {
      expect(canAddEmployee(UserRole.HR_ADMIN)).toBe(true);
    });

    it('returns true for Recruiter', () => {
      expect(canAddEmployee(UserRole.RECRUITER)).toBe(true);
    });
  });

  describe('canArchiveEmployee', () => {
    it('returns false for admin_limited role', () => {
      expect(canArchiveEmployee(UserRole.ADMIN_LIMITED)).toBe(false);
    });

    it('returns true for HR Admin', () => {
      expect(canArchiveEmployee(UserRole.HR_ADMIN)).toBe(true);
    });

    it('returns true for Recruiter', () => {
      expect(canArchiveEmployee(UserRole.RECRUITER)).toBe(true);
    });
  });

  describe('canTerminateEmployee', () => {
    it('returns false for admin_limited role', () => {
      expect(canTerminateEmployee(UserRole.ADMIN_LIMITED)).toBe(false);
    });

    it('returns true for HR Admin', () => {
      expect(canTerminateEmployee(UserRole.HR_ADMIN)).toBe(true);
    });

    it('returns true for Recruiter', () => {
      expect(canTerminateEmployee(UserRole.RECRUITER)).toBe(true);
    });
  });
});

describe('Admin Limited Role - canEditField', () => {
  describe('Checklist Items', () => {
    it('allows admin_limited to edit fields with is_checklist_item=true', () => {
      const checklistColumn = createMockColumnConfig({
        column_name: 'Checklist Field',
        db_column_name: 'checklist_field',
        is_checklist_item: true,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, checklistColumn)).toBe(true);
    });

    it('prevents admin_limited from editing fields with is_checklist_item=false', () => {
      const nonChecklistColumn = createMockColumnConfig({
        column_name: 'Regular Field',
        db_column_name: 'regular_field',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, nonChecklistColumn)).toBe(false);
    });
  });

  describe('Loneniva Exception', () => {
    it('allows admin_limited to edit loneniva field (lowercase)', () => {
      const lonenivaColumn = createMockColumnConfig({
        column_name: 'Lönenivå',
        db_column_name: 'loneniva',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, lonenivaColumn)).toBe(true);
    });

    it('allows admin_limited to edit lönenivå field (Swedish characters)', () => {
      const lonenivaColumn = createMockColumnConfig({
        column_name: 'Lönenivå',
        db_column_name: 'lönenivå',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, lonenivaColumn)).toBe(true);
    });

    it('allows admin_limited to edit LONENIVA field (uppercase)', () => {
      const lonenivaColumn = createMockColumnConfig({
        column_name: 'Lönenivå',
        db_column_name: 'LONENIVA',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, lonenivaColumn)).toBe(true);
    });
  });

  describe('Protected Fields', () => {
    it('prevents admin_limited from editing first_name', () => {
      const firstNameColumn = createMockColumnConfig({
        column_name: 'First Name',
        db_column_name: 'first_name',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, firstNameColumn)).toBe(false);
    });

    it('prevents admin_limited from editing ssn', () => {
      const ssnColumn = createMockColumnConfig({
        column_name: 'SSN',
        db_column_name: 'ssn',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, ssnColumn)).toBe(false);
    });

    it('prevents admin_limited from editing hire_date', () => {
      const hireDateColumn = createMockColumnConfig({
        column_name: 'Hire Date',
        db_column_name: 'hire_date',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, hireDateColumn)).toBe(false);
    });

    it('prevents admin_limited from editing email', () => {
      const emailColumn = createMockColumnConfig({
        column_name: 'Email',
        db_column_name: 'email',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, emailColumn)).toBe(false);
    });
  });

  describe('Other Roles - Standard Behavior', () => {
    it('HR Admin uses role_permissions for edit access', () => {
      const column = createMockColumnConfig({
        role_permissions: {
          hr_admin: { view: true, edit: true },
          admin_limited: { view: true, edit: false },
        },
      });

      expect(canEditField(UserRole.HR_ADMIN, column)).toBe(true);
    });

    it('Recruiter uses role_permissions for edit access', () => {
      const column = createMockColumnConfig({
        role_permissions: {
          recruiter: { view: true, edit: true },
          admin_limited: { view: true, edit: false },
        },
      });

      expect(canEditField(UserRole.RECRUITER, column)).toBe(true);
    });

    it('External party uses role_permissions for edit access', () => {
      const column = createMockColumnConfig({
        role_permissions: {
          sodexo: { view: true, edit: true },
          admin_limited: { view: true, edit: false },
        },
      });

      expect(canEditField(UserRole.SODEXO, column)).toBe(true);
    });

    it('returns false when role_permissions.edit is false', () => {
      const column = createMockColumnConfig({
        role_permissions: {
          omc: { view: true, edit: false },
        },
      });

      expect(canEditField(UserRole.OMC, column)).toBe(false);
    });

    it('returns false when role is missing from role_permissions', () => {
      const column = createMockColumnConfig({
        role_permissions: {
          hr_admin: { view: true, edit: true },
          // payroll not defined
        },
      });

      expect(canEditField(UserRole.PAYROLL, column)).toBe(false);
    });
  });
});

describe('Admin Limited Role - Combined Scenarios', () => {
  it('admin_limited can edit checklist loneniva field', () => {
    // Edge case: loneniva marked as checklist item (should still work)
    const checklistLoneniva = createMockColumnConfig({
      column_name: 'Lönenivå',
      db_column_name: 'loneniva',
      is_checklist_item: true,
    });

    expect(canEditField(UserRole.ADMIN_LIMITED, checklistLoneniva)).toBe(true);
  });

  it('admin_limited can view but not edit most fields', () => {
    const regularColumn = createMockColumnConfig({
      column_name: 'Comments',
      db_column_name: 'comments',
      is_checklist_item: false,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        admin_limited: { view: true, edit: false }, // Can view, role_permissions says no edit
      },
    });

    // View access is determined by role_permissions (tested elsewhere)
    // Edit access for admin_limited is determined by canEditField
    expect(canEditField(UserRole.ADMIN_LIMITED, regularColumn)).toBe(false);
  });

  it('admin_limited edit rules apply regardless of role_permissions.edit value', () => {
    // Even if role_permissions says edit: true, admin_limited still follows special rules
    const regularColumnWithEditTrue = createMockColumnConfig({
      column_name: 'Some Field',
      db_column_name: 'some_field',
      is_checklist_item: false,
      role_permissions: {
        admin_limited: { view: true, edit: true }, // This is ignored for admin_limited
      },
    });

    // canEditField should return false because it's not a checklist item or loneniva
    expect(canEditField(UserRole.ADMIN_LIMITED, regularColumnWithEditTrue)).toBe(false);
  });
});
