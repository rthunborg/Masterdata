/**
 * Integration Tests for Category Color API Routes
 * Story 9.1: Category Color Coding for Column Headers
 *
 * Tests cover:
 * - PATCH /api/admin/categories/[categoryName] (update category color for all columns)
 * - PATCH /api/admin/columns/[id] (update single column category_color)
 *
 * Authentication scenarios:
 * - 200: Successful operations for HR Admin
 * - 403: Forbidden for non-admin roles
 * - 401: Unauthorized for unauthenticated requests
 *
 * Edge cases:
 * - 400: Validation errors (invalid hex color format)
 * - 404: Category not found (no columns with that category)
 * - Real-time propagation: All columns in category updated simultaneously
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockUsers } from "../../utils/role-test-utils";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock Supabase client BEFORE importing route handlers
let mockUpdateResult: { data: ColumnConfig[] | ColumnConfig | null; error: unknown | null } = {
  data: null,
  error: null,
};

const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => {
        const singleFn = vi.fn(() => Promise.resolve(mockUpdateResult));
        return {
          select: vi.fn(() => ({
            single: singleFn,
            // For category endpoint which doesn't call .single()
            then: (resolve: (value: typeof mockUpdateResult) => void) => {
              return Promise.resolve(mockUpdateResult).then(resolve);
            },
          })),
        };
      }),
    })),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock the auth helpers BEFORE importing route handlers
const mockRequireHRAdminAPI = vi.fn();

vi.mock("@/lib/server/auth", () => ({
  requireHRAdminAPI: () => mockRequireHRAdminAPI(),
  createErrorResponse: vi.fn((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Autentisering krävs") {
      return new Response(
        JSON.stringify({
          error: { code: "UNAUTHORIZED", message },
        }),
        { status: 401 }
      );
    }
    if (message === "HR Admin access required") {
      return new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message },
        }),
        { status: 403 }
      );
    }
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message },
      }),
      { status: 500 }
    );
  }),
}));

// NOW import route handlers AFTER mocks are set up
import { PATCH as patchCategory } from "@/app/api/admin/categories/[categoryName]/route";
import { PATCH as patchColumn } from "@/app/api/admin/columns/[id]/route";

// Mock column data with categories
const mockColumns: ColumnConfig[] = [
  {
    id: "col-1",
    column_name: "team_assignment",
    column_type: "text",
    is_masterdata: false,
    is_visible: true,
    display_order: 0,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      payroll: { view: true, edit: false },
      toplux: { view: true, edit: false },
    },
    category: "Recruitment",
    category_color: "#3B82F6",
    db_column_name: 'custom_column',
    created_at: "2025-11-06T00:00:00Z",
    updated_at: "2025-11-06T00:00:00Z",      },
  {
    id: "col-2",
    column_name: "interview_status",
    column_type: "text",
    is_masterdata: false,
    is_visible: true,
    display_order: 1,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      payroll: { view: true, edit: false },
      toplux: { view: true, edit: false },
    },
    category: "Recruitment",
    category_color: "#3B82F6",
    db_column_name: 'custom_column',
    created_at: "2025-11-06T00:00:00Z",
    updated_at: "2025-11-06T00:00:00Z",      },
  {
    id: "col-3",
    column_name: "warehouse_location",
    column_type: "text",
    is_masterdata: false,
    is_visible: true,
    display_order: 2,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      payroll: { view: true, edit: false },
      toplux: { view: true, edit: false },
    },
    category: "Warehouse",
    category_color: "#10B981",
    db_column_name: 'custom_column',
    created_at: "2025-11-06T00:00:00Z",
    updated_at: "2025-11-06T00:00:00Z",      },
];

describe("PATCH /api/admin/categories/[categoryName]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateResult = { data: null, error: null };
  });

  describe("Authentication & Authorization", () => {
    it("should return 200 for authenticated HR Admin updating category color", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
      mockUpdateResult = {
        data: [mockColumns[0], mockColumns[1]], // All Recruitment columns
        error: null,
      };

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: "#EF4444" }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.category).toBe("Recruitment");
      expect(json.data.color).toBe("#EF4444");
      expect(json.data.affected_columns).toHaveLength(2);
    });

    it("should return 403 for non-admin role (Sodexo) attempting to update category color", async () => {
      mockRequireHRAdminAPI.mockRejectedValueOnce(
        new Error("HR Admin access required")
      );

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: "#EF4444" }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      mockRequireHRAdminAPI.mockRejectedValueOnce(
        new Error("Autentisering krävs")
      );

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: "#EF4444" }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Category Color Updates", () => {
    it("should update color for all columns in category", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
      mockUpdateResult = {
        data: [mockColumns[0], mockColumns[1]],
        error: null,
      };

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: "#8B5CF6" }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.updated_count).toBe(2);
      expect(json.data.color).toBe("#8B5CF6");
    });

    it("should allow setting color to null (remove color)", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
      mockUpdateResult = {
        data: [mockColumns[0]],
        error: null,
      };

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: null }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.color).toBe(null);
    });

    it("should handle URL-encoded category names correctly", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
      mockUpdateResult = {
        data: [mockColumns[0]],
        error: null,
      };

      const request = new NextRequest(
        "http://localhost/api/admin/categories/Recruitment%20Team",
        {
          method: "PATCH",
          body: JSON.stringify({ color: "#3B82F6" }),
        }
      );

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment%20Team" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.category).toBe("Recruitment Team");
    });

    it("should return 404 when category has no columns", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
      mockUpdateResult = {
        data: [],
        error: null,
      };

      const request = new NextRequest("http://localhost/api/admin/categories/NonExistent", {
        method: "PATCH",
        body: JSON.stringify({ color: "#3B82F6" }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "NonExistent" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Validation", () => {
    it("should return 400 for invalid hex color format", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: "blue" }), // Invalid format
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("should accept valid 3-character hex color (#RGB)", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
      mockUpdateResult = {
        data: [mockColumns[0]],
        error: null,
      };

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: "#F00" }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(200);
    });

    it("should accept valid 6-character hex color (#RRGGBB)", async () => {
      mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
      mockUpdateResult = {
        data: [mockColumns[0]],
        error: null,
      };

      const request = new NextRequest("http://localhost/api/admin/categories/Recruitment", {
        method: "PATCH",
        body: JSON.stringify({ color: "#FF0000" }),
      });

      const response = await patchCategory(request, {
        params: Promise.resolve({ categoryName: "Recruitment" }),
      });

      expect(response.status).toBe(200);
    });
  });
});

describe("PATCH /api/admin/columns/[id] - Category Color", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateResult = { data: null, error: null };
  });

  it("should update individual column category_color", async () => {
    mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
    mockUpdateResult = {
      data: { ...mockColumns[0], category_color: "#EC4899" },
      error: null,
    };

    const request = new NextRequest("http://localhost/api/admin/columns/col-1", {
      method: "PATCH",
      body: JSON.stringify({ category_color: "#EC4899" }),
    });

    const response = await patchColumn(request, {
      params: Promise.resolve({ id: "col-1" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.category_color).toBe("#EC4899");
  });

  it("should allow updating category and category_color simultaneously", async () => {
    mockRequireHRAdminAPI.mockResolvedValueOnce(mockUsers.hrAdmin);
    mockUpdateResult = {
      data: {
        ...mockColumns[0],
        category: "New Category",
        category_color: "#06B6D4",
      },
      error: null,
    };

    const request = new NextRequest("http://localhost/api/admin/columns/col-1", {
      method: "PATCH",
      body: JSON.stringify({
        category: "New Category",
        category_color: "#06B6D4",
      }),
    });

    const response = await patchColumn(request, {
      params: Promise.resolve({ id: "col-1" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.category).toBe("New Category");
    expect(json.data.category_color).toBe("#06B6D4");
  });
});
