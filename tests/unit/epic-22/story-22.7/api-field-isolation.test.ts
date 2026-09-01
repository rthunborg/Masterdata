import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import type { ColumnConfig } from "@/lib/types/column-config";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import { createMockUser } from "../../../utils/role-test-utils";

const requireAuthAPI = vi.fn();
const requireEmployeeManagerAPI = vi.fn();

vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI,
  requireEmployeeManagerAPI,
  createErrorResponse: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Autentisering krävs") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
    }
    if (message === "Saknar behörighet") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
  }),
  createForbiddenResponse: vi.fn((message: string) =>
    NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 })
  ),
}));

vi.mock("@/lib/server/repositories/employee-repository", () => ({
  employeeRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    findAll: vi.fn(),
    findByRole: vi.fn(),
  },
}));

const { GET: getColumns } = await import("@/app/api/columns/route");
const { GET: getEmployees } = await import("@/app/api/employees/route");
const { GET: getEmployeeById } = await import("@/app/api/employees/[id]/route");
const { employeeRepository } = await import(
  "@/lib/server/repositories/employee-repository"
);
const { columnConfigRepository } = await import(
  "@/lib/server/repositories/column-config-repository"
);

const columns = [
  {
    id: "col-first-name",
    column_name: "First name",
    db_column_name: "first_name",
    column_type: "text",
    is_masterdata: true,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: true },
      admin_limited: { view: true, edit: false },
      crewing: { view: true, edit: false },
      payroll: { view: true, edit: false },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      toplux: { view: true, edit: false },
    },
  },
  {
    id: "col-ssn",
    column_name: "SSN",
    db_column_name: "ssn",
    column_type: "text",
    is_masterdata: true,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: true },
      admin_limited: { view: true, edit: false },
      crewing: { view: true, edit: false },
      payroll: { view: true, edit: false },
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      toplux: { view: false, edit: false },
    },
  },
  {
    id: "col-mobile",
    column_name: "Mobile",
    db_column_name: "mobile",
    column_type: "text",
    is_masterdata: true,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: true },
      admin_limited: { view: true, edit: false },
      crewing: { view: true, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      toplux: { view: true, edit: false },
    },
  },
  {
    id: "col-diet",
    column_name: "Diet details",
    db_column_name: "diet_details",
    column_type: "text",
    is_masterdata: true,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: false },
      admin_limited: { view: true, edit: false },
      crewing: { view: true, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: true, edit: false },
      omc: { view: true, edit: false },
      toplux: { view: false, edit: false },
    },
  },
  {
    id: "col-sodexo-uniform",
    column_name: "Sodexo uniform",
    db_column_name: "sodexo_uniform_size",
    column_type: "text",
    is_masterdata: false,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: false, edit: false },
      admin_limited: { view: false, edit: false },
      crewing: { view: false, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: true, edit: true },
      omc: { view: false, edit: false },
      toplux: { view: false, edit: false },
    },
  },
  {
    id: "col-omc-note",
    column_name: "OMC note",
    db_column_name: "omc_note",
    column_type: "text",
    is_masterdata: false,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: false, edit: false },
      admin_limited: { view: false, edit: false },
      crewing: { view: false, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: false, edit: false },
      omc: { view: true, edit: true },
      toplux: { view: false, edit: false },
    },
  },
  {
    id: "col-toplux-room",
    column_name: "Toplux room",
    db_column_name: "toplux_room_note",
    column_type: "text",
    is_masterdata: false,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: false, edit: false },
      admin_limited: { view: false, edit: false },
      crewing: { view: false, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      toplux: { view: true, edit: true },
    },
  },
  {
    id: "col-crewing-note",
    column_name: "Crewing note",
    db_column_name: "crewing_note",
    column_type: "text",
    is_masterdata: false,
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: false, edit: false },
      admin_limited: { view: false, edit: false },
      crewing: { view: true, edit: true },
      payroll: { view: false, edit: false },
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      toplux: { view: false, edit: false },
    },
  },
] satisfies Partial<ColumnConfig>[];

const employee = {
  id: "emp-1",
  first_name: "Visible",
  ssn: "990101-1234",
  mobile: "+46700000000",
  gender: "Woman",
  comments: "Private comment",
  diet_details: "Private diet note",
  sodexo_uniform_size: "M",
  omc_note: "Medical clear",
  toplux_room_note: "Room 12",
  crewing_note: "Crew ready",
  created_at: "2026-06-08T00:00:00Z",
  updated_at: "2026-06-08T00:00:00Z",
} as Employee & {
  sodexo_uniform_size: string;
  omc_note: string;
  toplux_room_note: string;
  crewing_note: string;
};

describe("Story 22.7 API response field isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(employeeRepository.findAll).mockResolvedValue([employee]);
    vi.mocked(employeeRepository.findById).mockResolvedValue(employee);
    vi.mocked(columnConfigRepository.findAll).mockResolvedValue(columns as ColumnConfig[]);
    vi.mocked(columnConfigRepository.findByRole).mockImplementation(async (role: UserRole) =>
      (columns as ColumnConfig[]).filter(
        (column) => column.role_permissions[role]?.view === true
      )
    );
  });

  it.each([
    {
      role: UserRole.SODEXO,
      visibleColumns: [
        "diet_details",
        "first_name",
        "mobile",
        "sodexo_uniform_size",
      ],
    },
    {
      role: UserRole.OMC,
      visibleColumns: ["diet_details", "first_name", "mobile", "omc_note"],
    },
    {
      role: UserRole.PAYROLL,
      visibleColumns: ["first_name", "ssn"],
    },
    {
      role: UserRole.TOPLUX,
      visibleColumns: ["first_name", "mobile", "toplux_room_note"],
    },
    {
      role: UserRole.CREWING,
      visibleColumns: [
        "crewing_note",
        "diet_details",
        "first_name",
        "mobile",
        "ssn",
      ],
    },
  ])(
    "returns only column configs visible to $role",
    async ({ role, visibleColumns }) => {
      requireAuthAPI.mockResolvedValue(createMockUser(role));

      const response = await getColumns(
        new NextRequest("http://localhost:3000/api/columns")
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(columnConfigRepository.findByRole).toHaveBeenCalledWith(role);
      expect(
        json.data.map((column: ColumnConfig) => column.db_column_name).sort()
      ).toEqual(visibleColumns.sort());
    }
  );

  it.each([
    {
      role: UserRole.SODEXO,
      visible: {
        id: "emp-1",
        first_name: "Visible",
        mobile: "+46700000000",
        diet_details: "Private diet note",
        customData: { sodexo_uniform_size: "M" },
      },
      denied: ["ssn", "gender", "comments", "omc_note", "toplux_room_note"],
    },
    {
      role: UserRole.OMC,
      visible: {
        id: "emp-1",
        first_name: "Visible",
        mobile: "+46700000000",
        diet_details: "Private diet note",
        customData: { omc_note: "Medical clear" },
      },
      denied: ["ssn", "gender", "comments", "sodexo_uniform_size"],
    },
    {
      role: UserRole.PAYROLL,
      visible: { id: "emp-1", first_name: "Visible", ssn: "990101-1234" },
      denied: ["mobile", "diet_details", "comments", "toplux_room_note"],
    },
    {
      role: UserRole.TOPLUX,
      visible: {
        id: "emp-1",
        first_name: "Visible",
        mobile: "+46700000000",
        customData: { toplux_room_note: "Room 12" },
      },
      denied: ["ssn", "diet_details", "comments", "sodexo_uniform_size"],
    },
    {
      role: UserRole.CREWING,
      visible: {
        id: "emp-1",
        first_name: "Visible",
        ssn: "990101-1234",
        mobile: "+46700000000",
        diet_details: "Private diet note",
        customData: { crewing_note: "Crew ready" },
      },
      denied: ["comments", "toplux_room_note", "sodexo_uniform_size"],
    },
  ])(
    "shapes /api/employees rows for $role",
    async ({ role, visible, denied }) => {
      requireAuthAPI.mockResolvedValue(createMockUser(role));

      const response = await getEmployees(
        new NextRequest("http://localhost:3000/api/employees")
      );
      const json = await response.json();
      const row = json.data[0];

      expect(response.status).toBe(200);
      expect(row).toMatchObject(visible);
      expect(row).not.toHaveProperty("created_at");
      expect(row).not.toHaveProperty("updated_at");
      for (const deniedField of denied) {
        expect(row).not.toHaveProperty(deniedField);
      }
    }
  );

  it.each([UserRole.RECRUITER, UserRole.ADMIN_LIMITED])(
    "preserves visible customData for internal non-HR role %s",
    async (role) => {
      requireAuthAPI.mockResolvedValue(createMockUser(role));

      const response = await getEmployees(
        new NextRequest("http://localhost:3000/api/employees")
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data[0]).toMatchObject({
        ssn: "990101-1234",
        comments: "Private comment",
        customData: {
          sodexo_uniform_size: "M",
          omc_note: "Medical clear",
          toplux_room_note: "Room 12",
          crewing_note: "Crew ready",
        },
      });
    }
  );

  it("does not return employee detail data to external roles", async () => {
    requireEmployeeManagerAPI.mockRejectedValue(new Error("Saknar behörighet"));

    const response = await getEmployeeById(
      new NextRequest("http://localhost:3000/api/employees/emp-1"),
      { params: Promise.resolve({ id: "emp-1" }) }
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).not.toHaveProperty("data");
    expect(employeeRepository.findById).not.toHaveBeenCalled();
  });
});
