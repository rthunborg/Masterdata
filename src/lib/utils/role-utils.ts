/**
 * Role Utility Functions
 *
 * This module contains all role-based permission helpers.
 * These functions are re-exported from @/lib/types/user for backward compatibility.
 *
 * Note: Some helpers (canArchiveEmployee, canTerminateEmployee) are not currently
 * used in UI components but are defined for:
 * 1. API-level validation and authorization
 * 2. Documentation of the permission model
 * 3. Test coverage of role capabilities
 * 4. Future use if other roles need these capabilities
 */

import type { UserRole } from '@/lib/types/user';
import type { ColumnConfig } from '@/lib/types/column-config';

const INTERNAL_COLUMN_VIEW_ROLES = new Set<UserRole>([
  'hr_admin' as UserRole,
  'recruiter' as UserRole,
  'admin_limited' as UserRole,
]);

const HR_ADMIN_ROLE = 'hr_admin' as UserRole;
const RECRUITER_ROLE = 'recruiter' as UserRole;
const ADMIN_LIMITED_ROLE = 'admin_limited' as UserRole;
const CREWING_ROLE = 'crewing' as UserRole;
const SODEXO_ROLE = 'sodexo' as UserRole;
const OMC_ROLE = 'omc' as UserRole;
const PAYROLL_ROLE = 'payroll' as UserRole;
const TOPLUX_ROLE = 'toplux' as UserRole;

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case HR_ADMIN_ROLE:
      return 'HR Superuser';
    case RECRUITER_ROLE:
      return 'Recruiter';
    case ADMIN_LIMITED_ROLE:
      return 'Administratör';
    case CREWING_ROLE:
      return 'Crewing';
    case SODEXO_ROLE:
      return 'Sodexo';
    case OMC_ROLE:
      return 'ÖMC';
    case PAYROLL_ROLE:
      return 'Payroll';
    case TOPLUX_ROLE:
      return 'Toplux';
    default:
      return role;
  }
}

export function canManageSettings(role: UserRole): boolean {
  return role === HR_ADMIN_ROLE;
}

export function canManageEmployees(role: UserRole): boolean {
  return role === HR_ADMIN_ROLE || role === RECRUITER_ROLE;
}

/**
 * Check if role can add new employees
 * Administrator cannot add employees (risk mitigation for new hires)
 */
export function canAddEmployee(role: UserRole): boolean {
  return role === HR_ADMIN_ROLE || role === RECRUITER_ROLE;
}

/**
 * Check if role can archive/unarchive employees
 * Administrator cannot archive employees
 */
export function canArchiveEmployee(role: UserRole): boolean {
  return role === HR_ADMIN_ROLE || role === RECRUITER_ROLE;
}

/**
 * Check if role can terminate/reactivate employees
 * Administrator cannot terminate employees
 */
export function canTerminateEmployee(role: UserRole): boolean {
  return role === HR_ADMIN_ROLE || role === RECRUITER_ROLE;
}

/**
 * Check if admin_limited role (restricted internal role)
 */
export function isAdminLimited(role: UserRole): boolean {
  return role === ADMIN_LIMITED_ROLE;
}

/**
 * Resolve which role's column view permissions should be used.
 *
 * Internal HR roles share HR Superuser visibility. Edit permissions remain
 * role-specific and are handled by canEditField.
 */
export function getColumnViewRole(role: UserRole): UserRole {
  return INTERNAL_COLUMN_VIEW_ROLES.has(role) ? HR_ADMIN_ROLE : role;
}

/**
 * Check if role can edit staffing needs (headcount targets)
 * Only HR Admin and Crewing can modify staffing targets
 */
export function canEditStaffingNeeds(role: UserRole): boolean {
  return role === HR_ADMIN_ROLE || role === CREWING_ROLE;
}

/**
 * Check if a role can edit a specific field based on column config
 *
 * Internal role checklist overrides:
 * - Recruiter can always edit checklist fields
 * - Admin Limited can edit checklist fields
 *
 * All other roles use the standard role_permissions from column config
 */
export function canEditField(
  role: UserRole,
  columnConfig: ColumnConfig
): boolean {
  if (
    (role === RECRUITER_ROLE || role === ADMIN_LIMITED_ROLE) &&
    columnConfig.is_checklist_item
  ) {
    return true;
  }

  // Admin Limited has special edit logic
  if (role === ADMIN_LIMITED_ROLE) {
    // Cannot edit any non-checklist fields
    return false;
  }

  // All other roles use standard role_permissions
  const rolePerms = columnConfig.role_permissions[role];
  return rolePerms?.edit ?? false;
}
