import type { SessionUser, UserRole } from "@/lib/types/user";
import { vi } from "vitest";

// Mock user data for different roles
export const mockUsers = {
  hrAdmin: {
    id: "hr-admin-1",
    auth_id: "auth-hr-admin-1",
    email: "admin@company.com",
    role: "hr_admin" as UserRole,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  } as SessionUser,

  sodexo: {
    id: "sodexo-1",
    auth_id: "auth-sodexo-1",
    email: "sodexo@company.com",
    role: "sodexo" as UserRole,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  } as SessionUser,

  omc: {
    id: "omc-1",
    auth_id: "auth-omc-1",
    email: "omc@company.com", 
    role: "omc" as UserRole,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  } as SessionUser,

  payroll: {
    id: "payroll-1",
    auth_id: "auth-payroll-1",
    email: "payroll@company.com",
    role: "payroll" as UserRole,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  } as SessionUser,

  toplux: {
    id: "toplux-1",
    auth_id: "auth-toplux-1",
    email: "toplux@company.com",
    role: "toplux" as UserRole,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  } as SessionUser,

  inactive: {
    id: "inactive-1",
    auth_id: "auth-inactive-1",
    email: "inactive@company.com",
    role: "sodexo" as UserRole,
    is_active: false,
    created_at: "2025-01-01T00:00:00Z",
  } as SessionUser,
};

// Helper to create mock user with specific role
export function createMockUser(role: UserRole, overrides: Partial<SessionUser> = {}): SessionUser {
  const baseUser = mockUsers[role as keyof typeof mockUsers] || mockUsers.sodexo;
  return {
    ...baseUser,
    ...overrides,
  };
}

// Test role validation functions
export const roleTestCases = {
  adminOnly: {
    allowedRoles: ["hr_admin" as UserRole],
    shouldPass: [mockUsers.hrAdmin],
    shouldFail: [mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux],
  },
  externalParty: {
    allowedRoles: ["sodexo", "omc", "payroll", "toplux"] as UserRole[],
    shouldPass: [mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux],
    shouldFail: [mockUsers.hrAdmin],
  },
  allRoles: {
    allowedRoles: ["hr_admin", "sodexo", "omc", "payroll", "toplux"] as UserRole[],
    shouldPass: [mockUsers.hrAdmin, mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux],
    shouldFail: [],
  },
};

// Mock authentication helpers for tests
export const mockAuthHelpers = {
  // Mock successful authentication
  mockAuthSuccess: (user: SessionUser) => {
    return vi.fn().mockResolvedValue(user);
  },

  // Mock authentication failure
  mockAuthFailure: (error: string = "Authentication required") => {
    return vi.fn().mockRejectedValue(new Error(error));
  },

  // Mock role validation success
  mockRoleSuccess: (user: SessionUser) => {
    return vi.fn().mockResolvedValue(user);
  },

  // Mock role validation failure
  mockRoleFailure: (error: string = "Insufficient permissions") => {
    return vi.fn().mockRejectedValue(new Error(error));
  },
};

// Utility to create API request headers with user context
export function createAuthHeaders(user: SessionUser) {
  return {
    "x-user-id": user.id,
    "x-user-role": user.role,
  };
}

// Test route protection scenarios
export const routeTestScenarios = [
  {
    route: "/admin",
    description: "Admin routes should only allow hr_admin",
    allowedUsers: [mockUsers.hrAdmin],
    forbiddenUsers: [mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux],
    unauthenticatedShouldRedirectTo: "/login",
    forbiddenShouldRedirectTo: "/403",
  },
  {
    route: "/dashboard",
    description: "Dashboard should allow all authenticated users",
    allowedUsers: [mockUsers.hrAdmin, mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux],
    forbiddenUsers: [],
    unauthenticatedShouldRedirectTo: "/login",
  },
];

// API endpoint protection scenarios
export const apiTestScenarios = [
  {
    endpoint: "/api/admin/users",
    method: "GET",
    description: "Admin API should only allow hr_admin",
    allowedUsers: [mockUsers.hrAdmin],
    forbiddenUsers: [mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux],
    expectedStatusUnauth: 401,
    expectedStatusForbidden: 403,
    expectedStatusSuccess: 200,
  },
  {
    endpoint: "/api/profile",
    method: "GET", 
    description: "Profile API should allow all authenticated users",
    allowedUsers: [mockUsers.hrAdmin, mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux],
    forbiddenUsers: [],
    expectedStatusUnauth: 401,
    expectedStatusSuccess: 200,
  },
];