import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/columns/route";
import * as auth from "@/lib/server/auth";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/column-config-repository");

describe("GET /api/columns", () => {
  const mockAuthUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "user@example.com",
    role: UserRole.SODEXO,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  const mockHRAdminUser = {
    ...mockAuthUser,
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
  };

  const mockColumnConfigs: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "First Name",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
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
      },
      category: null,
      created_at: "2025-10-28T00:00:00Z",
    },
    {
      id: "col-3",
      column_name: "Email",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
      },
      category: null,
      created_at: "2025-10-28T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all column configurations for authenticated HR Admin", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(columnConfigRepository.findByRole).mockResolvedValue(mockColumnConfigs);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockColumnConfigs);
    expect(json.data.length).toBe(3);
    expect(columnConfigRepository.findByRole).toHaveBeenCalledWith(UserRole.HR_ADMIN);
  });

  it("should return all column configurations for authenticated external party", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockAuthUser);
    vi.mocked(columnConfigRepository.findByRole).mockResolvedValue(mockColumnConfigs);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockColumnConfigs);
    // Frontend will filter based on role permissions
    expect(json.data.length).toBe(3);
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

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 500 on repository error", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockAuthUser);
    vi.mocked(columnConfigRepository.findByRole).mockRejectedValue(
      new Error("Database connection failed")
    );
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch column configurations",
          },
        }),
        { status: 500 }
      ) as never
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("should return empty array when no columns exist", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockAuthUser);
    vi.mocked(columnConfigRepository.findByRole).mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it("should include all permission structure in response", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(columnConfigRepository.findByRole).mockResolvedValue(mockColumnConfigs);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    // Verify full permission structure is included
    expect(json.data[0].role_permissions).toHaveProperty("hr_admin");
    expect(json.data[0].role_permissions).toHaveProperty("sodexo");
    expect(json.data[0].role_permissions.hr_admin).toEqual({ view: true, edit: true });
  });
});

describe("POST /api/columns", () => {
  const mockSodexoUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "sodexo@test.com",
    role: UserRole.SODEXO,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  const mockHRAdminUser = {
    id: "admin-1",
    auth_id: "auth-admin",
    email: "admin@test.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create custom column for external party user", async () => {
    const newColumn: ColumnConfig = {
      id: "col-new",
      column_name: "Sodexo Team Assignment",
      column_type: "text",
      is_masterdata: false,
      role_permissions: {
        sodexo: { view: true, edit: true },
      },
      category: "Recruitment",
      created_at: "2025-10-28T00:00:00Z",
    };

    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);
    vi.mocked(columnConfigRepository.createCustomColumn).mockResolvedValue(newColumn);

    const request = new NextRequest("http://localhost:3000/api/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Sodexo Team Assignment",
        column_type: "text",
        category: "Recruitment",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.column_name).toBe("Sodexo Team Assignment");
    expect(json.data.is_masterdata).toBe(false);
    expect(json.data.role_permissions).toEqual({
      sodexo: { view: true, edit: true },
    });
    expect(columnConfigRepository.createCustomColumn).toHaveBeenCalledWith({
      column_name: "Sodexo Team Assignment",
      column_type: "text",
      category: "Recruitment",
      role: UserRole.SODEXO,
    });
  });

  it("should return 403 for HR Admin attempting to create custom column", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(auth.createForbiddenResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "HR Admin cannot create custom columns",
          },
        }),
        { status: 403 }
      ) as never
    );

    const request = new NextRequest("http://localhost:3000/api/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Test Column",
        column_type: "text",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toBe("HR Admin cannot create custom columns");
    expect(columnConfigRepository.createCustomColumn).not.toHaveBeenCalled();
  });

  it("should return 400 for duplicate column name", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);
    vi.mocked(columnConfigRepository.createCustomColumn).mockRejectedValue(
      new Error('Column "Sodexo Team" already exists for this role')
    );

    const request = new NextRequest("http://localhost:3000/api/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Sodexo Team",
        column_type: "text",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("DUPLICATE_COLUMN");
    expect(json.error.message).toContain("already exists");
  });

  it("should return 400 for invalid column_type", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);

    const request = new NextRequest("http://localhost:3000/api/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Test Column",
        column_type: "invalid_type",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("Invalid column type");
  });

  it("should return 400 for missing column_name", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);

    const request = new NextRequest("http://localhost:3000/api/columns", {
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

  it("should return 400 for invalid column_name characters", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);

    const request = new NextRequest("http://localhost:3000/api/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Invalid@Column!",
        column_type: "text",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("only contain letters, numbers");
  });

  it("should return 401 for unauthenticated request", async () => {
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

    const request = new NextRequest("http://localhost:3000/api/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Test Column",
        column_type: "text",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should create column without optional category", async () => {
    const newColumn: ColumnConfig = {
      id: "col-new",
      column_name: "Test Column",
      column_type: "text",
      is_masterdata: false,
      role_permissions: {
        sodexo: { view: true, edit: true },
      },
      category: null,
      created_at: "2025-10-28T00:00:00Z",
    };

    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockSodexoUser);
    vi.mocked(columnConfigRepository.createCustomColumn).mockResolvedValue(newColumn);

    const request = new NextRequest("http://localhost:3000/api/columns", {
      method: "POST",
      body: JSON.stringify({
        column_name: "Test Column",
        column_type: "text",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.category).toBeNull();
  });

  it("should work for all external party roles", async () => {
    const roles = [UserRole.SODEXO, UserRole.OMC, UserRole.PAYROLL, UserRole.TOPLUX];

    for (const role of roles) {
      vi.clearAllMocks();

      const mockUser = { ...mockSodexoUser, role };
      const newColumn: ColumnConfig = {
        id: `col-${role}`,
        column_name: `${role} Column`,
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          [role]: { view: true, edit: true },
        },
        category: null,
        created_at: "2025-10-28T00:00:00Z",
      };

      vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockUser);
      vi.mocked(columnConfigRepository.createCustomColumn).mockResolvedValue(newColumn);

      const request = new NextRequest("http://localhost:3000/api/columns", {
        method: "POST",
        body: JSON.stringify({
          column_name: `${role} Column`,
          column_type: "text",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.role_permissions).toHaveProperty(role);
    }
  });
});
