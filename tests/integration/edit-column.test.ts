import { describe, it, expect, beforeEach, vi } from "vitest";
import { PATCH } from "@/app/api/columns/[id]/route";
import { NextRequest } from "next/server";
import { UserRole } from "@/lib/types/user";

// Mock authentication
vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI: vi.fn().mockResolvedValue({
    id: "user-123",
    auth_id: "auth-123",
    email: "sodexo@example.com",
    role: UserRole.SODEXO,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  }),
  createErrorResponse: vi.fn((error) => {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Internal error",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }),
  createForbiddenResponse: vi.fn((message) => {
    return new Response(
      JSON.stringify({
        error: {
          code: "FORBIDDEN",
          message,
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }),
}));

// Mock column config repository
vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    updateColumn: vi.fn().mockResolvedValue({
      id: "col-123",
      column_name: "Updated Name",
      column_type: "text",
      category: "Warehouse Team",
      is_masterdata: false,
      role_permissions: {
        sodexo: { view: true, edit: true },
      },
      created_at: "2025-01-01T00:00:00Z",
    }),
  },
}));

describe("PATCH /api/columns/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates column name successfully", async () => {
    const mockRequest = new NextRequest(
      "http://localhost/api/columns/col-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_name: "Updated Name" }),
      }
    );

    const response = await PATCH(mockRequest, { params: { id: "col-123" } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.column_name).toBe("Updated Name");
  });

  it("updates column category successfully", async () => {
    const mockRequest = new NextRequest(
      "http://localhost/api/columns/col-123",
      {
        method: "PATCH",
        body: JSON.stringify({ category: "Warehouse Team" }),
      }
    );

    const response = await PATCH(mockRequest, { params: { id: "col-123" } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.category).toBe("Warehouse Team");
  });

  it("returns 403 when HR Admin tries to use this endpoint", async () => {
    // Mock HR Admin user
    const { requireAuthAPI } = await import("@/lib/server/auth");
    vi.mocked(requireAuthAPI).mockResolvedValueOnce({
      id: "admin-123",
      auth_id: "auth-admin-123",
      email: "admin@example.com",
      role: UserRole.HR_ADMIN,
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
    });

    const mockRequest = new NextRequest(
      "http://localhost/api/columns/col-123",
      {
        method: "PATCH",
        body: JSON.stringify({ column_name: "Hacked Name" }),
      }
    );

    const response = await PATCH(mockRequest, { params: { id: "col-123" } });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error.message).toContain("HR Admin cannot use this endpoint");
  });

  it("returns 403 when user does not have permission to edit column", async () => {
    // Mock repository to throw permission error
    const { columnConfigRepository } = await import(
      "@/lib/server/repositories/column-config-repository"
    );
    vi.mocked(columnConfigRepository.updateColumn).mockRejectedValueOnce(
      new Error("You do not have permission to edit this column")
    );

    const mockRequest = new NextRequest(
      "http://localhost/api/columns/sodexo-col",
      {
        method: "PATCH",
        body: JSON.stringify({ column_name: "Hacked Name" }),
      }
    );

    const response = await PATCH(mockRequest, { params: { id: "sodexo-col" } });

    expect(response.status).toBe(403);
    const error = await response.json();
    expect(error.error.message).toContain("permission");
  });

  it("validates column name length", async () => {
    const mockRequest = new NextRequest(
      "http://localhost/api/columns/col-123",
      {
        method: "PATCH",
        body: JSON.stringify({ column_name: "" }), // Empty name
      }
    );

    const response = await PATCH(mockRequest, { params: { id: "col-123" } });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error.code).toBe("VALIDATION_ERROR");
  });

  it("validates category max length", async () => {
    const mockRequest = new NextRequest(
      "http://localhost/api/columns/col-123",
      {
        method: "PATCH",
        body: JSON.stringify({
          category: "A".repeat(101), // Exceeds 100 char limit
        }),
      }
    );

    const response = await PATCH(mockRequest, { params: { id: "col-123" } });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when column not found", async () => {
    // Mock repository to throw not found error
    const { columnConfigRepository } = await import(
      "@/lib/server/repositories/column-config-repository"
    );
    vi.mocked(columnConfigRepository.updateColumn).mockRejectedValueOnce(
      new Error("Column not found")
    );

    const mockRequest = new NextRequest(
      "http://localhost/api/columns/nonexistent",
      {
        method: "PATCH",
        body: JSON.stringify({ column_name: "New Name" }),
      }
    );

    const response = await PATCH(mockRequest, {
      params: { id: "nonexistent" },
    });

    expect(response.status).toBe(404);
  });
});
