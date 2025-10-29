import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../../middleware";
import { mockUsers } from "../../utils/role-test-utils";
import { createServerClient } from "@supabase/ssr";

// Mock Supabase client
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

const mockCreateServerClient = vi.mocked(createServerClient);

describe("Proxy Role Protection", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient = {
      auth: {
        getSession: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    };
    mockCreateServerClient.mockReturnValue(mockSupabaseClient);
  });

  describe("Authentication Checks", () => {
    it("should redirect unauthenticated users to login for dashboard routes", async () => {
      // Mock no session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const request = new NextRequest("http://localhost:3000/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("should redirect unauthenticated users to login for admin routes", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const request = new NextRequest("http://localhost:3000/admin");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("should redirect authenticated users from login to dashboard", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      });

      const request = new NextRequest("http://localhost:3000/login");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });
  });

  describe("Role-Based Access Control", () => {
    it("should allow hr_admin to access admin routes", async () => {
      // Mock authenticated session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      });

      // Mock user data with hr_admin role
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.hrAdmin.id,
                role: mockUsers.hrAdmin.role,
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest("http://localhost:3000/admin");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("x-user-id")).toBe(mockUsers.hrAdmin.id);
      expect(response.headers.get("x-user-role")).toBe(mockUsers.hrAdmin.role);
    });

    it("should redirect external party users to 403 for admin routes", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.sodexo.auth_id } } },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.sodexo.id,
                role: mockUsers.sodexo.role,
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest("http://localhost:3000/admin");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/403");
    });

    it("should allow all authenticated users to access dashboard", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.sodexo.auth_id } } },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.sodexo.id,
                role: mockUsers.sodexo.role,
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest("http://localhost:3000/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("x-user-id")).toBe(mockUsers.sodexo.id);
      expect(response.headers.get("x-user-role")).toBe(mockUsers.sodexo.role);
    });
  });

  describe("Inactive User Handling", () => {
    it("should redirect inactive users to login", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUsers.inactive.auth_id } } },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUsers.inactive.id,
                role: mockUsers.inactive.role,
                is_active: false,
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const request = new NextRequest("http://localhost:3000/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should redirect to login on database errors", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Database error"),
            }),
          }),
        }),
      });

      const request = new NextRequest("http://localhost:3000/dashboard");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });
  });
});

