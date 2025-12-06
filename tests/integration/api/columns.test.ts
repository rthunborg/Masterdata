/**
 * Integration Tests for Columns API
 * 
 * Story: 17.2 - Delete Functionality for Custom Columns
 * 
 * Tests verify DELETE endpoint for custom columns:
 * - External users can delete columns they own (have edit permission)
 * - External users cannot delete columns they don't own
 * - HR Admin is blocked from using user endpoint
 * - Masterdata columns cannot be deleted
 * - Proper error handling (404, 403)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DELETE } from "@/app/api/columns/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: vi.fn(),
  createErrorResponse: vi.fn((error) => {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      }),
      { status: 500 }
    );
  }),
  createForbiddenResponse: vi.fn((message) => {
    return new Response(
      JSON.stringify({
        error: {
          code: "FORBIDDEN",
          message: message || "Insufficient permissions",
        },
      }),
      { status: 403 }
    );
  }),
}));
vi.mock("@/lib/server/repositories/column-config-repository");

describe("DELETE /api/columns/[id]", () => {
  const mockExternalUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "external@example.com",
    role: UserRole.SODEXO,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockHRAdminUser = {
    id: "admin-1",
    auth_id: "auth-admin",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockCustomColumn: ColumnConfig = {
    id: "col-custom-1",
    column_name: "Team Assignment",
    column_type: "text",
    is_masterdata: false,
    role_permissions: {
      sodexo: { view: true, edit: true },
    },
    category: "Team",
    display_order: 1,
    is_visible: true,
    db_column_name: "team_assignment",
    category_color: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  const mockMasterdataColumn: ColumnConfig = {
    id: "col-master-1",
    column_name: "First Name",
    column_type: "text",
    is_masterdata: true,
    role_permissions: {
      sodexo: { view: true, edit: false },
    },
    category: "Employee Information",
    display_order: 0,
    is_visible: true,
    db_column_name: "first_name",
    category_color: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  const mockColumnWithoutEditPermission: ColumnConfig = {
    id: "col-custom-2",
    column_name: "Other Team Column",
    column_type: "text",
    is_masterdata: false,
    role_permissions: {
      sodexo: { view: true, edit: false }, // No edit permission
    },
    category: "Team",
    display_order: 2,
    is_visible: true,
    db_column_name: "other_team_column",
    category_color: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete column for external user with edit permission", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockExternalUser);
    vi.mocked(columnConfigRepository.deleteColumn).mockResolvedValue();

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-custom-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-custom-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe("col-custom-1");
    expect(json.data.message).toBe("Column deleted successfully");
    expect(columnConfigRepository.deleteColumn).toHaveBeenCalledWith(
      "col-custom-1",
      "user-1",
      UserRole.SODEXO
    );
  });

  it("should return 403 for HR Admin using user endpoint", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-custom-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-custom-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toContain("HR Admin cannot use this endpoint");
    expect(columnConfigRepository.deleteColumn).not.toHaveBeenCalled();
  });

  it("should return 403 for user without edit permission", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockExternalUser);
    vi.mocked(columnConfigRepository.deleteColumn).mockRejectedValue(
      new Error("You do not have permission to delete this column")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-custom-2",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-custom-2" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toContain("permission");
    expect(columnConfigRepository.deleteColumn).toHaveBeenCalledWith(
      "col-custom-2",
      "user-1",
      UserRole.SODEXO
    );
  });

  it("should return 404 for non-existent column", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockExternalUser);
    vi.mocked(columnConfigRepository.deleteColumn).mockRejectedValue(
      new Error("Column not found")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/columns/non-existent",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toContain("not found");
  });

  it("should return 403 for masterdata column deletion attempt", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockExternalUser);
    vi.mocked(columnConfigRepository.deleteColumn).mockRejectedValue(
      new Error("Cannot delete masterdata column")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-master-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-master-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toContain("masterdata");
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireAuthAPI).mockRejectedValue(
      new Error("Authentication required")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      ) as never
    );

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-custom-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-custom-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(columnConfigRepository.deleteColumn).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockExternalUser);
    vi.mocked(columnConfigRepository.deleteColumn).mockRejectedValue(
      new Error("Failed to delete column: Database connection error")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete column: Database connection error",
          },
        }),
        { status: 500 }
      ) as never
    );

    const request = new NextRequest(
      "http://localhost:3000/api/columns/col-custom-1",
      {
        method: "DELETE",
      }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "col-custom-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});

