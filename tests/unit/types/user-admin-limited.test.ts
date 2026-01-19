import { describe, it, expect } from 'vitest';
import {
  UserRole,
  ADMIN_ROLES,
  INTERNAL_ROLES,
  EXTERNAL_PARTY_ROLES,
  ALL_ROLES,
  isHRAdmin,
  isExternalParty,
  hasAdminAccess,
  canManageSettings,
  canManageEmployees,
  canAddEmployee,
  canArchiveEmployee,
  canTerminateEmployee,
  isAdminLimited,
  getRoleDisplayName,
} from '@/lib/types/user';

/**
 * Tests for Admin Limited role in type definitions and role constants
 */

describe('UserRole Enum', () => {
  it('includes ADMIN_LIMITED role', () => {
    expect(UserRole.ADMIN_LIMITED).toBe('admin_limited');
  });

  it('has all expected roles', () => {
    expect(Object.values(UserRole)).toContain('hr_admin');
    expect(Object.values(UserRole)).toContain('recruiter');
    expect(Object.values(UserRole)).toContain('admin_limited');
    expect(Object.values(UserRole)).toContain('crewing');
    expect(Object.values(UserRole)).toContain('sodexo');
    expect(Object.values(UserRole)).toContain('omc');
    expect(Object.values(UserRole)).toContain('payroll');
    expect(Object.values(UserRole)).toContain('toplux');
  });
});

describe('Role Constants', () => {
  describe('ADMIN_ROLES', () => {
    it('does NOT include admin_limited', () => {
      expect(ADMIN_ROLES).not.toContain(UserRole.ADMIN_LIMITED);
    });

    it('only includes hr_admin', () => {
      expect(ADMIN_ROLES).toEqual([UserRole.HR_ADMIN]);
    });
  });

  describe('INTERNAL_ROLES', () => {
    it('includes admin_limited', () => {
      expect(INTERNAL_ROLES).toContain(UserRole.ADMIN_LIMITED);
    });

    it('includes hr_admin and recruiter', () => {
      expect(INTERNAL_ROLES).toContain(UserRole.HR_ADMIN);
      expect(INTERNAL_ROLES).toContain(UserRole.RECRUITER);
    });

    it('does NOT include external party roles', () => {
      expect(INTERNAL_ROLES).not.toContain(UserRole.SODEXO);
      expect(INTERNAL_ROLES).not.toContain(UserRole.OMC);
      expect(INTERNAL_ROLES).not.toContain(UserRole.PAYROLL);
      expect(INTERNAL_ROLES).not.toContain(UserRole.TOPLUX);
      expect(INTERNAL_ROLES).not.toContain(UserRole.CREWING);
    });
  });

  describe('EXTERNAL_PARTY_ROLES', () => {
    it('does NOT include admin_limited', () => {
      expect(EXTERNAL_PARTY_ROLES).not.toContain(UserRole.ADMIN_LIMITED);
    });
  });

  describe('ALL_ROLES', () => {
    it('includes admin_limited', () => {
      expect(ALL_ROLES).toContain(UserRole.ADMIN_LIMITED);
    });
  });
});

describe('Role Utility Functions for Admin Limited', () => {
  describe('isAdminLimited', () => {
    it('returns true for ADMIN_LIMITED', () => {
      expect(isAdminLimited(UserRole.ADMIN_LIMITED)).toBe(true);
    });

    it('returns false for all other roles', () => {
      expect(isAdminLimited(UserRole.HR_ADMIN)).toBe(false);
      expect(isAdminLimited(UserRole.RECRUITER)).toBe(false);
      expect(isAdminLimited(UserRole.SODEXO)).toBe(false);
      expect(isAdminLimited(UserRole.OMC)).toBe(false);
      expect(isAdminLimited(UserRole.PAYROLL)).toBe(false);
      expect(isAdminLimited(UserRole.TOPLUX)).toBe(false);
      expect(isAdminLimited(UserRole.CREWING)).toBe(false);
    });
  });

  describe('isHRAdmin', () => {
    it('returns false for admin_limited', () => {
      expect(isHRAdmin(UserRole.ADMIN_LIMITED)).toBe(false);
    });
  });

  describe('isExternalParty', () => {
    it('returns false for admin_limited (internal role)', () => {
      expect(isExternalParty(UserRole.ADMIN_LIMITED)).toBe(false);
    });
  });

  describe('hasAdminAccess', () => {
    it('returns false for admin_limited', () => {
      expect(hasAdminAccess(UserRole.ADMIN_LIMITED)).toBe(false);
    });
  });

  describe('canManageSettings', () => {
    it('returns false for admin_limited', () => {
      expect(canManageSettings(UserRole.ADMIN_LIMITED)).toBe(false);
    });
  });

  describe('canManageEmployees', () => {
    it('returns false for admin_limited', () => {
      // canManageEmployees gates Important Dates access
      expect(canManageEmployees(UserRole.ADMIN_LIMITED)).toBe(false);
    });
  });

  describe('canAddEmployee', () => {
    it('returns false for admin_limited', () => {
      expect(canAddEmployee(UserRole.ADMIN_LIMITED)).toBe(false);
    });

    it('returns true for hr_admin', () => {
      expect(canAddEmployee(UserRole.HR_ADMIN)).toBe(true);
    });

    it('returns true for recruiter', () => {
      expect(canAddEmployee(UserRole.RECRUITER)).toBe(true);
    });

    it('returns false for external party roles', () => {
      expect(canAddEmployee(UserRole.SODEXO)).toBe(false);
      expect(canAddEmployee(UserRole.OMC)).toBe(false);
    });
  });

  describe('canArchiveEmployee', () => {
    it('returns false for admin_limited', () => {
      expect(canArchiveEmployee(UserRole.ADMIN_LIMITED)).toBe(false);
    });

    it('returns true for hr_admin', () => {
      expect(canArchiveEmployee(UserRole.HR_ADMIN)).toBe(true);
    });

    it('returns true for recruiter', () => {
      expect(canArchiveEmployee(UserRole.RECRUITER)).toBe(true);
    });
  });

  describe('canTerminateEmployee', () => {
    it('returns false for admin_limited', () => {
      expect(canTerminateEmployee(UserRole.ADMIN_LIMITED)).toBe(false);
    });

    it('returns true for hr_admin', () => {
      expect(canTerminateEmployee(UserRole.HR_ADMIN)).toBe(true);
    });

    it('returns true for recruiter', () => {
      expect(canTerminateEmployee(UserRole.RECRUITER)).toBe(true);
    });
  });

  describe('getRoleDisplayName', () => {
    it('returns "Administratör" for admin_limited', () => {
      expect(getRoleDisplayName(UserRole.ADMIN_LIMITED)).toBe('Administratör');
    });
  });
});

describe('Admin Limited - Permission Summary', () => {
  /**
   * This test documents the expected permission matrix for admin_limited
   */
  it('has correct permission profile', () => {
    const adminLimited = UserRole.ADMIN_LIMITED;

    // Internal role classification
    expect(INTERNAL_ROLES).toContain(adminLimited);
    expect(EXTERNAL_PARTY_ROLES).not.toContain(adminLimited);

    // NOT a full admin
    expect(ADMIN_ROLES).not.toContain(adminLimited);
    expect(hasAdminAccess(adminLimited)).toBe(false);

    // Cannot manage settings (admin tabs)
    expect(canManageSettings(adminLimited)).toBe(false);

    // Cannot manage employees (add/archive/terminate)
    expect(canAddEmployee(adminLimited)).toBe(false);
    expect(canArchiveEmployee(adminLimited)).toBe(false);
    expect(canTerminateEmployee(adminLimited)).toBe(false);

    // Cannot access Important Dates
    expect(canManageEmployees(adminLimited)).toBe(false);

    // Display name is Swedish
    expect(getRoleDisplayName(adminLimited)).toBe('Administratör');
  });
});
