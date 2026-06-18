import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import type { ColumnConfig } from "@/lib/types/column-config";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import { employeeExportRequestSchema } from "@/lib/validation/export-schema";
import { createMockUser } from "../../../utils/role-test-utils";

const requireAuthAPI = vi.fn();
const requireEmployeeManagerAPI = vi.fn();

vi.mock("@/lib/server/auth", () => ({
  requireAuthAPI,
  requireEmployeeManagerAPI,
  createUnauthorizedResponse: vi.fn((message = "Inloggning krävs") =>
    NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 })
  ),
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
}));

vi.mock("@/lib/server/repositories/employee-repository", () => ({
  employeeRepository: {
    findAll: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    findAll: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}));

vi.mock("@/lib/services/crewing-validation", () => ({
  canEditCrewingDone: vi.fn(() => true),
}));

const { POST: exportEmployees } = await import(
  "@/app/api/employees/export/route"
);
const { POST: exportCrewReady } = await import(
  "@/app/api/employees/export-crew-ready/route"
);
const { employeeRepository } = await import(
  "@/lib/server/repositories/employee-repository"
);
const { columnConfigRepository } = await import(
  "@/lib/server/repositories/column-config-repository"
);

const columns = [
  {
    id: "col-first-name",
    column_name: "First Name",
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
    category: null,
    category_color: null,
    display_order: 1,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
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
    category: null,
    category_color: null,
    display_order: 2,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
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
    category: null,
    category_color: null,
    display_order: 3,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
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
    category: null,
    category_color: null,
    display_order: 4,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
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
    category: null,
    category_color: null,
    display_order: 5,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
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
    category: null,
    category_color: null,
    display_order: 6,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
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
    category: null,
    category_color: null,
    display_order: 7,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
  },
] satisfies ColumnConfig[];

const employee = {
  id: "emp-1",
  first_name: "Ava",
  surname: "Example",
  ssn: "990101-1234",
  email: "ava@example.com",
  mobile: "+46700000000",
  rank: "SEV",
  gender: "Woman",
  town_district: "Göteborg",
  hire_date: "2020-01-01",
  one: true,
  talmundo: true,
  isps: true,
  photo: true,
  origo: true,
  loneiva: 3,
  mail_lon: true,
  bankuppgifter: true,
  li: true,
  passport: true,
  kvitto_c17_18: true,
  c17: true,
  crewing_done: false,
  hotel_required: false,
  special_diet: false,
  diet_details: null,
  sodexo_uniform_size: "M",
  omc_note: "Medical clear",
  toplux_room_note: "Room 12",
  crewing_note: "Crew ready",
  is_archived: false,
  is_terminated: false,
  created_at: "2026-06-08T00:00:00Z",
  updated_at: "2026-06-08T00:00:00Z",
} as Employee & {
  sodexo_uniform_size: string;
  omc_note: string;
  toplux_room_note: string;
  crewing_note: string;
};

function exportRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/employees/export", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("Story 22.7 export field and payload evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(columnConfigRepository.findAll).mockResolvedValue(columns);
    vi.mocked(employeeRepository.findAll).mockResolvedValue([employee]);
    vi.mocked(employeeRepository.update).mockResolvedValue({
      ...employee,
      crewing_done: true,
    });
  });

  it("validates export payloads through the Zod schema", () => {
    expect(
      employeeExportRequestSchema.parse({
        employeeIds: ["emp-1"],
        fields: ["first_name"],
      })
    ).toEqual({
      employeeIds: ["emp-1"],
      fields: ["first_name"],
      format: "csv",
    });

    expect(
      employeeExportRequestSchema.safeParse({
        employeeIds: ["emp-1"],
        fields: ["first_name"],
        format: "pdf",
      }).success
    ).toBe(false);
  });

  it("returns a validation error for malformed JSON payloads", async () => {
    requireAuthAPI.mockResolvedValue(createMockUser(UserRole.SODEXO));

    const response = await exportEmployees(
      new NextRequest("http://localhost:3000/api/employees/export", {
        method: "POST",
        body: "{",
      })
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("INVALID_EXPORT_PAYLOAD");
  });

  it.each([
    { role: UserRole.SODEXO, deniedField: "ssn" },
    { role: UserRole.OMC, deniedField: "ssn" },
    { role: UserRole.PAYROLL, deniedField: "mobile" },
    { role: UserRole.TOPLUX, deniedField: "ssn" },
    { role: UserRole.CREWING, deniedField: "toplux_room_note" },
  ])(
    "denies denied fields instead of dropping them silently for $role",
    async ({ role, deniedField }) => {
      requireAuthAPI.mockResolvedValue(createMockUser(role));

      const response = await exportEmployees(
        exportRequest({
          employeeIds: ["emp-1"],
          fields: ["first_name", deniedField],
        })
      );
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error.code).toBe("PERMISSION_DENIED");
      expect(json.error.details.deniedFields).toEqual([deniedField]);
    }
  );

  it.each([
    {
      role: UserRole.SODEXO,
      fields: ["first_name", "mobile", "sodexo_uniform_size"],
      expectedContent: ["First Name", "Mobile", "Sodexo uniform", "Ava", "M"],
      deniedContent: ["SSN", "990101-1234", "Medical clear"],
    },
    {
      role: UserRole.OMC,
      fields: ["first_name", "omc_note"],
      expectedContent: ["First Name", "OMC note", "Ava", "Medical clear"],
      deniedContent: ["SSN", "990101-1234", "Room 12"],
    },
    {
      role: UserRole.PAYROLL,
      fields: ["first_name", "ssn"],
      expectedContent: ["First Name", "SSN", "Ava", "990101-1234"],
      deniedContent: ["Mobile", "+46700000000", "M"],
    },
    {
      role: UserRole.TOPLUX,
      fields: ["first_name", "mobile", "toplux_room_note"],
      expectedContent: ["First Name", "Mobile", "Toplux room", "Ava", "Room 12"],
      deniedContent: ["SSN", "990101-1234", "Medical clear"],
    },
    {
      role: UserRole.CREWING,
      fields: ["first_name", "ssn", "crewing_note"],
      expectedContent: ["First Name", "SSN", "Crewing note", "Ava", "Crew ready"],
      deniedContent: ["Toplux room", "Room 12"],
    },
  ])(
    "excludes denied values from allowed CSV output for $role",
    async ({ role, fields, expectedContent, deniedContent }) => {
      requireAuthAPI.mockResolvedValue(createMockUser(role));

      const response = await exportEmployees(
        exportRequest({ employeeIds: ["emp-1"], fields })
      );
      const csv = await response.text();

      expect(response.status).toBe(200);
      for (const expected of expectedContent) {
        expect(csv).toContain(expected);
      }
      for (const denied of deniedContent) {
        expect(csv).not.toContain(denied);
      }
    }
  );

  it("uses HR Admin impersonatedRole export permissions for the impersonated role", async () => {
    requireAuthAPI.mockResolvedValue(createMockUser(UserRole.HR_ADMIN));

    const denied = await exportEmployees(
      exportRequest({
        employeeIds: ["emp-1"],
        fields: ["ssn"],
        impersonatedRole: UserRole.SODEXO,
      })
    );
    expect(denied.status).toBe(403);

    const allowed = await exportEmployees(
      exportRequest({
        employeeIds: ["emp-1"],
        fields: ["ssn"],
        impersonatedRole: UserRole.PAYROLL,
      })
    );
    const csv = await allowed.text();

    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("X-Impersonated-Role")).toBe(UserRole.PAYROLL);
    expect(csv).toContain("990101-1234");
  });

  it("prevents non-HR Admin callers from using impersonatedRole", async () => {
    requireAuthAPI.mockResolvedValue(createMockUser(UserRole.RECRUITER));

    const response = await exportEmployees(
      exportRequest({
        employeeIds: ["emp-1"],
        fields: ["first_name"],
        impersonatedRole: UserRole.PAYROLL,
      })
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("IMPERSONATION_FORBIDDEN");
  });

  it("keeps crew-ready export restricted to employee managers", async () => {
    requireEmployeeManagerAPI.mockRejectedValue(new Error("Saknar behörighet"));

    const denied = await exportCrewReady(
      new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
      })
    );
    expect(denied.status).toBe(403);
    expect(employeeRepository.findAll).not.toHaveBeenCalled();

    requireEmployeeManagerAPI.mockResolvedValue(createMockUser(UserRole.RECRUITER));
    const allowed = await exportCrewReady(
      new NextRequest("http://localhost:3000/api/employees/export-crew-ready", {
        method: "POST",
        body: JSON.stringify({ selectedEmployeeIds: ["emp-1"] }),
      })
    );
    const csv = await allowed.text();

    expect(allowed.status).toBe(200);
    expect(csv).toContain("SSN");
    expect(csv).toContain("990101-1234");
    expect(employeeRepository.update).toHaveBeenCalledWith("emp-1", {
      crewing_done: true,
    });
  });
});
