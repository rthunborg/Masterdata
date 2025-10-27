import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockUsers } from "../../utils/role-test-utils";
import { UserRole } from "@/lib/types/user";

// Mock getUserFromSession first
vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual("@/lib/server/auth");
  return {
    ...actual,
    getUserFromSession: vi.fn(),
  };
});

// Import after mocking
const { 
  requireAuthAPI, 
  requireRoleAPI, 
  requireHRAdminAPI,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createErrorResponse,
  getUserFromSession
} = await import("@/lib/server/auth");

const mockGetUserFromSession = vi.mocked(getUserFromSession);

describe("Auth Helper Functions", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuthAPI", () => {
    it("should return user when authenticated", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);

      const result = await requireAuthAPI();

      expect(result).toEqual(mockUsers.hrAdmin);
    });

    it("should throw error when not authenticated", async () => {
      mockGetUserFromSession.mockResolvedValue(null);

      await expect(requireAuthAPI()).rejects.toThrow("Authentication required");
    });
  });

  describe("requireRoleAPI", () => {
    it("should return user when role is allowed", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);
      
      const result = await requireRoleAPI([UserRole.HR_ADMIN]);

      expect(result).toEqual(mockUsers.hrAdmin);
    });

    it("should throw error when role is not allowed", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      await expect(requireRoleAPI([UserRole.HR_ADMIN])).rejects.toThrow("Insufficient permissions");
    });

    it("should allow multiple roles", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

      const result = await requireRoleAPI([UserRole.SODEXO, UserRole.OMC]);

      expect(result).toEqual(mockUsers.sodexo);
    });

    it("should throw error when not authenticated", async () => {
      mockGetUserFromSession.mockResolvedValue(null);

      await expect(requireRoleAPI([UserRole.HR_ADMIN])).rejects.toThrow("Authentication required");
    });
  });

  describe("requireHRAdminAPI", () => {
    it("should return user when user is HR admin", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.hrAdmin);

      const result = await requireHRAdminAPI();

      expect(result).toEqual(mockUsers.hrAdmin);
    });

    it("should throw error when user is not HR admin", async () => {
      mockGetUserFromSession.mockResolvedValue(mockUsers.sodexo);

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