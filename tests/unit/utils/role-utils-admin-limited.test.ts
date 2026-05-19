import { describe, it, expect } from 'vitest';
import {
  canEditField,
  canAddEmployee,
  canArchiveEmployee,
  canTerminateEmployee,
  isAdminLimited,
  getRoleDisplayName,
  getColumnViewRole,
} from '@/lib/utils/role-utils';
import { UserRole } from '@/lib/types/user';
import type { ColumnConfig } from '@/lib/types/column-config';

/**
 * Tests for Admin Limited (Administratör) role functionality
 * 
 * Admin Limited is a restricted internal role with:
 * - Same view permissions as HR Admin/Recruiter
 * - Can only edit: checklist fields (is_checklist_item=true)
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
  describe('getColumnViewRole', () => {
    it('uses HR Admin view permissions for all internal HR roles', () => {
      expect(getColumnViewRole(UserRole.HR_ADMIN)).toBe(UserRole.HR_ADMIN);
      expect(getColumnViewRole(UserRole.RECRUITER)).toBe(UserRole.HR_ADMIN);
      expect(getColumnViewRole(UserRole.ADMIN_LIMITED)).toBe(UserRole.HR_ADMIN);
    });

    it('keeps external party view permissions role-specific', () => {
      expect(getColumnViewRole(UserRole.SODEXO)).toBe(UserRole.SODEXO);
      expect(getColumnViewRole(UserRole.OMC)).toBe(UserRole.OMC);
      expect(getColumnViewRole(UserRole.PAYROLL)).toBe(UserRole.PAYROLL);
      expect(getColumnViewRole(UserRole.TOPLUX)).toBe(UserRole.TOPLUX);
      expect(getColumnViewRole(UserRole.CREWING)).toBe(UserRole.CREWING);
    });
  });

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

  describe('Checklist-only edit scope', () => {
    it('prevents admin_limited from editing loneniva when it is not a checklist item', () => {
      const lonenivaColumn = createMockColumnConfig({
        column_name: 'Lönenivå',
        db_column_name: 'loneniva',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, lonenivaColumn)).toBe(false);
    });

    it('prevents admin_limited from editing lönenivå when it is not a checklist item', () => {
      const lonenivaColumn = createMockColumnConfig({
        column_name: 'Lönenivå',
        db_column_name: 'lönenivå',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, lonenivaColumn)).toBe(false);
    });

    it('prevents admin_limited from editing LONENIVA when it is not a checklist item', () => {
      const lonenivaColumn = createMockColumnConfig({
        column_name: 'Lönenivå',
        db_column_name: 'LONENIVA',
        is_checklist_item: false,
      });

      expect(canEditField(UserRole.ADMIN_LIMITED, lonenivaColumn)).toBe(false);
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

    it('Recruiter can edit checklist items even when role_permissions.edit is false', () => {
      const checklistColumn = createMockColumnConfig({
        column_name: 'Security Awareness Training',
        db_column_name: 'seably_security',
        is_checklist_item: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          recruiter: { view: false, edit: false },
        },
      });

      expect(canEditField(UserRole.RECRUITER, checklistColumn)).toBe(true);
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
