import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockUsers } from "../../utils/role-test-utils";

// Mock Supabase client first
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => Promise.resolve({
        data: [mockUsers.hrAdmin, mockUsers.sodexo, mockUsers.omc],
        error: null,
      })),
    })),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock the auth helpers
const mockRequireAuthAPI = vi.fn();
const mockRequireHRAdminAPI = vi.fn();

vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: mockRequireAuthAPI,
  requireHRAdminAPI: mockRequireHRAdminAPI,
  createErrorResponse: vi.fn((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Authentication required") {
      return new Response(JSON.stringify({
        error: { code: "UNAUTHORIZED", message }
      }), { status: 401 });
    }
    if (message === "Insufficient permissions") {
      return new Response(JSON.stringify({
        error: { code: "FORBIDDEN", message }
      }), { status: 403 });
    }
    return new Response(JSON.stringify({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }
    }), { status: 500 });
  }),
}));

// Mock the user repository
vi.mock("@/lib/server/repositories/user-repository", () => ({
  userRepository: {
    findAll: vi.fn().mockResolvedValue([
      mockUsers.hrAdmin,
      mockUsers.sodexo,
      mockUsers.omc,
    ]),
  },
}));

// Import API handlers after mocking
const { GET: ProfileGET } = await import("@/app/api/profile/route");
const { GET: AdminUsersGET } = await import("@/app/api/admin/users/route");

describe("API Route Role Protection Integration", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Profile API (/api/profile)", () => {
    it("should return user profile for authenticated users", async () => {
      mockRequireAuthAPI.mockResolvedValue(mockUsers.sodexo);

      const response = await ProfileGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.user).toMatchObject({
        id: mockUsers.sodexo.id,
        email: mockUsers.sodexo.email,
        role: mockUsers.sodexo.role,
      });
      expect(data.data.message).toBe("Profile retrieved successfully");
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockRequireAuthAPI.mockRejectedValue(new Error("Authentication required"));

      const response = await ProfileGET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
      expect(data.error.message).toBe("Authentication required");
    });

    it("should work for HR admin users", async () => {
      mockRequireAuthAPI.mockResolvedValue(mockUsers.hrAdmin);

      const response = await ProfileGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.user.role).toBe("hr_admin");
    });

    it("should work for external party users", async () => {
      const externalUsers = [mockUsers.sodexo, mockUsers.omc, mockUsers.payroll, mockUsers.toplux];
      
      for (const user of externalUsers) {
        mockRequireAuthAPI.mockResolvedValue(user);

        const response = await ProfileGET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.user.role).toBe(user.role);
      }
    });
  });

  describe("Admin Users API (/api/admin/users)", () => {
    it("should return user list for HR admin", async () => {
      mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

      const request = new NextRequest("http://localhost/api/admin/users");
      const response = await AdminUsersGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(3);
      expect(data.data[0]).toMatchObject({
        id: mockUsers.hrAdmin.id,
        email: mockUsers.hrAdmin.email,
        role: mockUsers.hrAdmin.role,
      });
    });

    it("should return 403 for external party users", async () => {
      mockRequireHRAdminAPI.mockRejectedValue(new Error("Insufficient permissions"));

      const request = new NextRequest("http://localhost/api/admin/users");
      const response = await AdminUsersGET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.message).toBe("Insufficient permissions");
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockRequireHRAdminAPI.mockRejectedValue(new Error("Authentication required"));

      const request = new NextRequest("http://localhost/api/admin/users");
      const response = await AdminUsersGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
      expect(data.error.message).toBe("Authentication required");
    });
  });

  describe("Role Validation Patterns", () => {
    it("should consistently handle authentication errors", async () => {
      const apis = [
        { name: "Profile", handler: () => ProfileGET(), mockFn: mockRequireAuthAPI },
        { name: "Admin Users", handler: () => AdminUsersGET(new NextRequest("http://localhost/api/admin/users")), mockFn: mockRequireHRAdminAPI },
      ];

      for (const api of apis) {
        api.mockFn.mockRejectedValue(new Error("Authentication required"));

        const response = await api.handler();
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error.code).toBe("UNAUTHORIZED");
        expect(data.error.message).toBe("Authentication required");
      }
    });

    it("should consistently handle permission errors", async () => {
      mockRequireHRAdminAPI.mockRejectedValue(new Error("Insufficient permissions"));

      const request = new NextRequest("http://localhost/api/admin/users");
      const response = await AdminUsersGET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.message).toBe("Insufficient permissions");
    });
  });
});