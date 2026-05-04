export enum UserRole {
  HR_ADMIN = 'hr_admin',
  RECRUITER = 'recruiter',
  ADMIN_LIMITED = 'admin_limited',
  CREWING = 'crewing',
  SODEXO = 'sodexo',
  OMC = 'omc',
  PAYROLL = 'payroll',
  TOPLUX = 'toplux',
}

export const USER_ROLES = Object.values(UserRole);

// Role Permission Constants
export const ADMIN_ROLES: UserRole[] = [UserRole.HR_ADMIN];
// Recruiter has admin-like privileges but is distinct
// Admin Limited is internal but with restricted edit permissions
export const INTERNAL_ROLES: UserRole[] = [
  UserRole.HR_ADMIN,
  UserRole.RECRUITER,
  UserRole.ADMIN_LIMITED,
];
export const EXTERNAL_PARTY_ROLES: UserRole[] = [
  UserRole.SODEXO,
  UserRole.OMC,
  UserRole.PAYROLL,
  UserRole.TOPLUX,
  UserRole.CREWING,
];
export const ALL_ROLES: UserRole[] = [
  ...INTERNAL_ROLES,
  ...EXTERNAL_PARTY_ROLES,
];

// Role Utility Functions
export function isHRAdmin(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN;
}

export function isExternalParty(role: UserRole): boolean {
  return EXTERNAL_PARTY_ROLES.includes(role);
}

export function hasAdminAccess(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

// Re-export role utility functions from role-utils.ts to maintain backward compatibility
// The canonical implementations live in role-utils.ts to avoid duplication
export {
  getRoleDisplayName,
  canManageSettings,
  canManageEmployees,
  canAddEmployee,
  canArchiveEmployee,
  canTerminateEmployee,
  isAdminLimited,
  getColumnViewRole,
} from '@/lib/utils/role-utils';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_active_at: string | null;
}

export interface SessionUser extends User {
  auth_id: string;
}

// Form data for creating users
export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

// Form data for updating user status
export interface UpdateUserRequest {
  is_active: boolean;
}

// API response when creating a user
export interface CreateUserResponse extends User {
  temporary_password: string;
}
