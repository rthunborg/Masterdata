import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminService } from "@/lib/services/admin-service";
import { UserRole } from "@/lib/types/user";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("adminService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("getUsers", () => {
    it("fetches and returns user list", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "admin@test.com",
          role: UserRole.HR_ADMIN,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "user-2",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          created_at: "2025-01-02T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUsers }),
      });

      const users = await adminService.getUsers();

      expect(mockFetch).toHaveBeenCalledWith("/api/admin/users");
      expect(users).toEqual(mockUsers);
    });

    it("throws error on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { code: "FORBIDDEN", message: "HR Admin access required" },
        }),
      });

      await expect(adminService.getUsers()).rejects.toThrow(
        "HR Admin access required"
      );
    });
  });

  describe("createUser", () => {
    it("calls API with correct payload", async () => {
      const newUser = {
        email: "newuser@test.com",
        password: "password123",
        role: UserRole.OMC,
        is_active: true,
      };

      const mockResponse = {
        id: "user-3",
        email: "newuser@test.com",
        role: UserRole.OMC,
        is_active: true,
        created_at: "2025-01-03T00:00:00Z",
        temporary_password: "password123",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      });

      const result = await adminService.createUser(newUser);

      expect(mockFetch).toHaveBeenCalledWith("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      expect(result).toEqual(mockResponse);
    });

    it("handles duplicate email error", async () => {
      const newUser = {
        email: "existing@test.com",
        password: "password123",
        role: UserRole.SODEXO,
        is_active: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: "DUPLICATE_ENTRY",
            message: "User with this email already exists",
          },
        }),
      });

      await expect(adminService.createUser(newUser)).rejects.toThrow(
        "User with this email already exists"
      );
    });
  });

  describe("updateUserStatus", () => {
    it("calls API with correct ID and status", async () => {
      const mockUpdatedUser = {
        id: "user-1",
        email: "user@test.com",
        role: UserRole.SODEXO,
        is_active: false,
        created_at: "2025-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUpdatedUser }),
      });

      const result = await adminService.updateUserStatus("user-1", false);

      expect(mockFetch).toHaveBeenCalledWith("/api/admin/users/user-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      expect(result).toEqual(mockUpdatedUser);
    });

    it("handles self-deactivation error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: "FORBIDDEN",
            message: "Cannot deactivate your own account",
          },
        }),
      });

      await expect(
        adminService.updateUserStatus("current-user-id", false)
      ).rejects.toThrow("Cannot deactivate your own account");
    });
  });
});
