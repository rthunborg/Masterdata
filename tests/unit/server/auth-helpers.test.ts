import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockUsers } from "../../utils/role-test-utils";
import { UserRole } from "@/lib/types/user";
import {
  requireAuthAPI,
  requireRoleAPI,
  requireHRAdminAPI,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createErrorResponse,
} from "@/lib/server/auth";

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("Auth Helper Functions", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuthAPI", () => {
    it("should return user when authenticated", async () => {
      // Mock Supabase session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
        error: null,
      });
      
      // Mock user data query
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.hrAdmin.id,
                email: mockUsers.hrAdmin.email,
                role: mockUsers.hrAdmin.role,
                is_active: true,
                created_at: mockUsers.hrAdmin.created_at,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await requireAuthAPI();

      expect(result).toMatchObject({
        id: mockUsers.hrAdmin.id,
        email: mockUsers.hrAdmin.email,
        role: mockUsers.hrAdmin.role,
      });
    });

    it("should throw error when not authenticated", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(requireAuthAPI()).rejects.toThrow("Authentication required");
    });
  });

  describe("requireRoleAPI", () => {
    it("should return user when role is allowed", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
        error: null,
      });
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.hrAdmin.id,
                email: mockUsers.hrAdmin.email,
                role: mockUsers.hrAdmin.role,
                is_active: true,
                created_at: mockUsers.hrAdmin.created_at,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await requireRoleAPI([UserRole.HR_ADMIN]);

      expect(result).toMatchObject({
        id: mockUsers.hrAdmin.id,
        role: mockUsers.hrAdmin.role,
      });
    });

    it("should throw error when role is not allowed", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.sodexo.auth_id } } },
        error: null,
      });
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.sodexo.id,
                email: mockUsers.sodexo.email,
                role: mockUsers.sodexo.role,
                is_active: true,
                created_at: mockUsers.sodexo.created_at,
              },
              error: null,
            }),
          }),
        }),
      });

      await expect(requireRoleAPI([UserRole.HR_ADMIN])).rejects.toThrow("Insufficient permissions");
    });

    it("should allow multiple roles", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.sodexo.auth_id } } },
        error: null,
      });
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.sodexo.id,
                email: mockUsers.sodexo.email,
                role: mockUsers.sodexo.role,
                is_active: true,
                created_at: mockUsers.sodexo.created_at,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await requireRoleAPI([UserRole.SODEXO, UserRole.OMC]);

      expect(result).toMatchObject({
        id: mockUsers.sodexo.id,
        role: mockUsers.sodexo.role,
      });
    });

    it("should throw error when not authenticated", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(requireRoleAPI([UserRole.HR_ADMIN])).rejects.toThrow("Authentication required");
    });
  });  describe("requireHRAdminAPI", () => {
    it("should return user when user is HR admin", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
        error: null,
      });
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.hrAdmin.id,
                email: mockUsers.hrAdmin.email,
                role: mockUsers.hrAdmin.role,
                is_active: true,
                created_at: mockUsers.hrAdmin.created_at,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await requireHRAdminAPI();

      expect(result).toMatchObject({
        id: mockUsers.hrAdmin.id,
        role: mockUsers.hrAdmin.role,
      });
    });

    it("should throw error when user is not HR admin", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.sodexo.auth_id } } },
        error: null,
      });
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.sodexo.id,
                email: mockUsers.sodexo.email,
                role: mockUsers.sodexo.role,
                is_active: true,
                created_at: mockUsers.sodexo.created_at,
              },
              error: null,
            }),
          }),
        }),
      });

      await expect(requireHRAdminAPI()).rejects.toThrow("Insufficient permissions");
    });
  });

  describe("Error Response Utilities", () => {
    describe("createUnauthorizedResponse", () => {
      it("should create 401 response with default message", async () => {
        const response = createUnauthorizedResponse();

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data).toMatchObject({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required"
          }
        });
      });

      it("should create 401 response with custom message", async () => {
        const customMessage = "Custom auth message";
        const response = createUnauthorizedResponse(customMessage);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data).toMatchObject({
          error: {
            code: "UNAUTHORIZED",
            message: customMessage
          }
        });
      });
    });

    describe("createForbiddenResponse", () => {
      it("should create 403 response with default message", async () => {
        const response = createForbiddenResponse();

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data).toMatchObject({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions"
          }
        });
      });

      it("should create 403 response with custom message", async () => {
        const customMessage = "Custom forbidden message";
        const response = createForbiddenResponse(customMessage);

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data).toMatchObject({
          error: {
            code: "FORBIDDEN",
            message: customMessage
          }
        });
      });
    });

    describe("createErrorResponse", () => {
      it("should create 401 response for authentication error", () => {
        const error = new Error("Authentication required");
        const response = createErrorResponse(error);

        expect(response.status).toBe(401);
      });

      it("should create 403 response for permission error", () => {
        const error = new Error("Insufficient permissions");
        const response = createErrorResponse(error);

        expect(response.status).toBe(403);
      });

      it("should create 500 response for unknown error", async () => {
        const error = new Error("Unknown error");
        const response = createErrorResponse(error);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data).toMatchObject({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred"
          }
        });
      });

      it("should create 500 response for non-Error objects", () => {
        const error = "String error";
        const response = createErrorResponse(error);

        expect(response.status).toBe(500);
      });
    });
  });
});