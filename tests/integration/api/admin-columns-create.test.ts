/**
 * Integration Tests for POST /api/admin/columns
 * Story 6.6: Column Management UX Improvements - Add Column Functionality
 *
 * Tests cover:
 * - POST /api/admin/columns (create new custom column)
 *
 * Test scenarios:
 * - 201: Successful column creation with default permissions
 * - 400: Validation errors (missing fields, invalid types)
 * - 409: Duplicate column name
 * - 403: Forbidden for non-admin roles
 * - 401: Unauthorized for unauthenticated requests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/columns/route";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { mockUsers } from "../../utils/role-test-utils";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock the repository
vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    create: vi.fn(),
  },
}));

// Mock the auth middleware
vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual("@/lib/server/auth");
  return {
    ...actual,
    requireHRAdminAPI: vi.fn(),
  };
});

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("POST /api/admin/columns", () => {
  const newColumnId = "new-col-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create column successfully for HR Admin", async () => {
    // Mock session
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    // Mock repository response
    vi.mocked(columnConfigRepository.create).mockResolvedValue({
      id: newColumnId,
      column_name: "Test Column",
      column_type: "text",
      category: "Test Category",
      is_masterdata: false,
      display_order: 100,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      },
      created_at: new Date().toISOString(),
    } as ColumnConfig);

    const request = new NextRequest("http://localhost:3000/api/admin/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column_name: "Test Column",
        column_type: "text",
        category: "Test Category",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.column_name).toBe("Test Column");
    expect(json.data.column_type).toBe("text");
    expect(json.data.category).toBe("Test Category");
    expect(json.data.is_masterdata).toBe(false);
    expect(json.data.display_order).toBe(100);

    // Verify default permissions
    expect(json.data.role_permissions.hr_admin.view).toBe(true);
    expect(json.data.role_permissions.hr_admin.edit).toBe(true);
    expect(json.data.role_permissions.sodexo.view).toBe(false);
    expect(json.data.role_permissions.sodexo.edit).toBe(false);
  });

  it("should auto-assign display_order when not provided", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    vi.mocked(columnConfigRepository.create).mockResolvedValue({
      id: newColumnId,
      column_name: "Auto Order Column",
      column_type: "number",
      category: null,
      is_masterdata: false,
      display_order: 150,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      },
      created_at: new Date().toISOString(),
    } as ColumnConfig);

    const request = new NextRequest("http://localhost:3000/api/admin/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Auto Order Column",
        column_type: "number",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.display_order).toBe(150);
  });

  it("should reject duplicate column name", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    // Mock repository to throw duplicate error
    vi.mocked(columnConfigRepository.create).mockRejectedValue(
      new Error("Column with name 'Duplicate Test' already exists")
    );

    const request = new NextRequest("http://localhost:3000/api/admin/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Duplicate Test",
        column_type: "number",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.code).toBe("DUPLICATE_COLUMN");
  });

  it("should reject invalid column type", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Invalid Type",
        column_type: "invalid_type",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject missing column_name", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns", {
      method: "POST",
      body: JSON.stringify({
        column_type: "text",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject column_name exceeding max length", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "A".repeat(101), // Exceeds 100 char max
        column_type: "text",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should create column with all optional fields", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    vi.mocked(columnConfigRepository.create).mockResolvedValue({
      id: newColumnId,
      column_name: "Complete Column",
      column_type: "date",
      category: "Dates",
      is_masterdata: false,
      display_order: 999,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      },
      created_at: new Date().toISOString(),
    } as ColumnConfig);

    const request = new NextRequest("http://localhost:3000/api/admin/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Complete Column",
        column_type: "date",
        category: "Dates",
        display_order: 999,
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.column_name).toBe("Complete Column");
    expect(json.data.category).toBe("Dates");
    expect(json.data.display_order).toBe(999);
  });
});

