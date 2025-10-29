/**
 * Integration Tests for Column Permission API Routes
 * Story 5.2: Column Permission Configuration Interface
 *
 * Tests cover:
 * - GET /api/admin/columns (list all columns with permissions)
 * - PATCH /api/admin/columns/[id] (update column permissions)
 *
 * Authentication scenarios:
 * - 200: Successful operations for HR Admin
 * - 403: Forbidden for non-admin roles
 * - 401: Unauthorized for unauthenticated requests
 *
 * Edge cases:
 * - 400: Validation errors (edit=true but view=false)
 * - 404: Column not found
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockUsers } from "../../utils/role-test-utils";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock column data
const mockColumns: ColumnConfig[] = [
  {
    id: "col-1",
    column_name: "First Name",
    column_type: "text",
    is_masterdata: true,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      payroll: { view: true, edit: false },
      toplux: { view: true, edit: false },
    },
    category: null,
    created_at: "2025-10-28T00:00:00Z",
  },
  {
    id: "col-2",
    column_name: "SSN",
    column_type: "text",
    is_masterdata: true,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: true, edit: false },
      toplux: { view: false, edit: false },
    },
    category: null,
    created_at: "2025-10-28T00:00:00Z",
  },
];

// Mock Supabase client with chainable query builder
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: mockColumns,
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock the auth helpers
const mockRequireHRAdminAPI = vi.fn();

vi.mock("@/lib/server/auth", () => ({
  requireHRAdminAPI: mockRequireHRAdminAPI,
  createErrorResponse: vi.fn((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Authentication required") {
      return new Response(
        JSON.stringify({
          error: { code: "UNAUTHORIZED", message },
        }),
        { status: 401 }
      );
    }
    if (message === "Insufficient permissions") {
      return new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message },
        }),
        { status: 403 }
      );
    }
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      }),
      { status: 500 }
    );
  }),
}));

// Import API handlers after mocking
const { GET } = await import("@/app/api/admin/columns/route");
const { PATCH } = await import("@/app/api/admin/columns/[id]/route");

describe("GET /api/admin/columns", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset Supabase mock to return columns list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({
              data: mockColumns,
              error: null,
            })
          ),
        })),
      })),
    });
  });

  it("returns column list for HR Admin (200)", async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data).toHaveLength(2);

    // Validate column structure
    const column = data.data[0];
    expect(column).toHaveProperty("id");
    expect(column).toHaveProperty("column_name");
    expect(column).toHaveProperty("column_type");
    expect(column).toHaveProperty("is_masterdata");
    expect(column).toHaveProperty("role_permissions");
    expect(column.role_permissions).toHaveProperty("hr_admin");
  });

  it("returns 403 for non-admin roles (Sodexo)", async () => {
    mockRequireHRAdminAPI.mockRejectedValue(
      new Error("Insufficient permissions")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe("FORBIDDEN");
    expect(data.error.message).toBe("Insufficient permissions");
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockRequireHRAdminAPI.mockRejectedValue(
      new Error("Authentication required")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});

describe("PATCH /api/admin/columns/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates column permissions successfully for HR Admin (200)", async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const updatedColumn = {
      ...mockColumns[0],
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: true },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
        toplux: { view: true, edit: false },
      },
    };

    // Mock Supabase update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: updatedColumn,
                error: null,
              })
            ),
          })),
        })),
      })),
    });

    const request = new NextRequest("http://localhost/api/admin/columns/col-1", {
      method: "PATCH",
      body: JSON.stringify({
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: true },
          omc: { view: true, edit: false },
          payroll: { view: true, edit: false },
          toplux: { view: true, edit: false },
        },
      }),
    });

    const response = await PATCH(request, { params: { id: "col-1" } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("data");
    expect(data.data.role_permissions.sodexo.edit).toBe(true);
    expect(data.data.role_permissions.omc.edit).toBe(false);
  });

  it("returns 400 when edit=true but view=false", async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const request = new NextRequest("http://localhost/api/admin/columns/col-1", {
      method: "PATCH",
      body: JSON.stringify({
        role_permissions: {
          sodexo: { view: false, edit: true }, // Invalid!
        },
      }),
    });

    const response = await PATCH(request, { params: { id: "col-1" } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(data.error.message).toContain("Edit permission requires View permission");
  });

  it("returns 403 for non-admin roles", async () => {
    mockRequireHRAdminAPI.mockRejectedValue(
      new Error("Insufficient permissions")
    );

    const request = new NextRequest("http://localhost/api/admin/columns/col-1", {
      method: "PATCH",
      body: JSON.stringify({
        role_permissions: {
          sodexo: { view: true, edit: true },
        },
      }),
    });

    const response = await PATCH(request, { params: { id: "col-1" } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for non-existent column", async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    // Mock Supabase returning not found error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { code: "PGRST116" },
              })
            ),
          })),
        })),
      })),
    });

    const request = new NextRequest(
      "http://localhost/api/admin/columns/nonexistent-id",
      {
        method: "PATCH",
        body: JSON.stringify({
          role_permissions: {
            sodexo: { view: true, edit: false },
          },
        }),
      }
    );

    const response = await PATCH(request, { params: { id: "nonexistent-id" } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(data.error.message).toBe("Column not found");
  });
});
