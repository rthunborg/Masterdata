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

import { UserRole } from "@/lib/types/user";
import type { ColumnConfig } from "@/lib/types/column-config";

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.HR_ADMIN: return "HR Superuser";
    case UserRole.RECRUITER: return "Recruiter";
    case UserRole.ADMIN_LIMITED: return "Administratör";
    case UserRole.CREWING: return "Crewing";
    case UserRole.SODEXO: return "Sodexo";
    case UserRole.OMC: return "ÖMC";
    case UserRole.PAYROLL: return "Payroll";
    case UserRole.TOPLUX: return "Toplux";
    default: return role;
  }
}

export function canManageSettings(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN;
}

export function canManageEmployees(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN || role === UserRole.RECRUITER;
}

/**
 * Check if role can add new employees
 * Administrator cannot add employees (risk mitigation for new hires)
 */
export function canAddEmployee(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN || role === UserRole.RECRUITER;
}

/**
 * Check if role can archive/unarchive employees
 * Administrator cannot archive employees
 */
export function canArchiveEmployee(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN || role === UserRole.RECRUITER;
}

/**
 * Check if role can terminate/reactivate employees
 * Administrator cannot terminate employees
 */
export function canTerminateEmployee(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN || role === UserRole.RECRUITER;
}

/**
 * Check if admin_limited role (restricted internal role)
 */
export function isAdminLimited(role: UserRole): boolean {
  return role === UserRole.ADMIN_LIMITED;
}

/**
 * Check if a role can edit a specific field based on column config
 * 
 * Admin Limited role has special edit restrictions:
 * - Can only edit fields where is_checklist_item = true
 * - Exception: Can also edit the 'loneniva' field
 * 
 * All other roles use the standard role_permissions from column config
 */
export function canEditField(role: UserRole, columnConfig: ColumnConfig): boolean {
  // Admin Limited has special edit logic
  if (role === UserRole.ADMIN_LIMITED) {
    // Can edit checklist items
    if (columnConfig.is_checklist_item) {
      return true;
    }
    // Exception: Can edit loneniva field
    const dbColumnName = columnConfig.db_column_name.toLowerCase();
    if (dbColumnName === 'loneniva' || dbColumnName === 'lönenivå') {
      return true;
    }
    // Cannot edit any other fields
    return false;
  }

  // All other roles use standard role_permissions
  const rolePerms = columnConfig.role_permissions[role];
  return rolePerms?.edit ?? false;
}

