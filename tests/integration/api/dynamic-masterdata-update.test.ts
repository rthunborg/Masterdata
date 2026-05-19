import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/employees/[id]/route";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types/user";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";

vi.mock("@/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/auth")>();
  return {
    ...actual,
    requireEmployeeEditorAPI: vi.fn(),
  };
});
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

const mockRecruiterUser = {
  id: "user-1",
  auth_id: "auth-1",
  email: "recruiter@example.com",
  role: UserRole.RECRUITER,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  last_active_at: null,
};

const mockAdminLimitedUser = {
  id: "user-2",
  auth_id: "auth-2",
  email: "admin-limited@example.com",
  role: UserRole.ADMIN_LIMITED,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  last_active_at: null,
};

const mockEmployee = {
  id: "emp-1",
  first_name: "Jane",
  surname: "Doe",
  ssn: "900101-1234",
  email: "jane@example.com",
  mobile: null,
  rank: "SEV",
  gender: "Woman",
  town_district: "Gothenburg",
  hire_date: "2020-01-01",
  stena_date: null,
  omc_date: null,
  pe3_date: null,
  termination_date: null,
  termination_reason: null,
  is_terminated: false,
  is_archived: false,
  archived_at: null,
  is_anonymized: false,
  repayment_needed_omc: null,
  repayment_needed_pe3: null,
  special_diet: false,
  diet_details: null,
  comments: null,
  one: false,
  one_marked_at: null,
  talmundo: false,
  isps: false,
  photo: false,
  origo: false,
  loneiva: null,
  mail_lon: false,
  bankuppgifter: false,
  li: false,
  passport: false,
  kvitto_c17_18: false,
  c17: false,
  crewing_done: false,
  hotel_required: false,
  room_number_shared: null,
  omc_masterdata_reminder_sent_at: null,
  stena_id_origo_nummer: null,
  seably_prm: false,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
} as Employee & { seably_prm: boolean };

const seablyPrmColumn = {
  id: "col-seably-prm",
  column_name: "PRM",
  db_column_name: "seably_prm",
  column_type: "boolean",
  is_masterdata: true,
  is_checklist_item: true,
  category: "Seably",
  category_color: null,
  display_order: 10,
  is_visible: true,
  role_permissions: {
    hr_admin: { view: true, edit: true },
    recruiter: { view: false, edit: false },
    admin_limited: { view: false, edit: false },
  },
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
} satisfies ColumnConfig;

const firstNameColumn = {
  ...seablyPrmColumn,
  id: "col-first-name",
  column_name: "First name",
  db_column_name: "first_name",
  column_type: "text",
  is_checklist_item: false,
  role_permissions: {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: true },
  },
} satisfies ColumnConfig;

function mockColumnConfigClient(columns: ColumnConfig[] = [seablyPrmColumn]) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn((_field: string, names: string[]) => Promise.resolve({
      data: columns.filter((column) => names.includes(column.db_column_name)),
      error: null,
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table !== "column_config") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return query;
    }),
  };
}

function mockServiceRoleEmployeeClient(employee: Employee) {
  const query = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: employee, error: null }),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table !== "employees") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return query;
    }),
  };

  return { client, query };
}

describe("PATCH /api/employees/[id] - dynamic masterdata columns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireEmployeeEditorAPI).mockResolvedValue(mockRecruiterUser);
    vi.mocked(createClient).mockResolvedValue(mockColumnConfigClient() as never);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    vi.mocked(employeeRepository.update).mockResolvedValue({
      ...mockEmployee,
      seably_prm: true,
      updated_at: "2025-01-02T00:00:00Z",
    } as Employee);
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockServiceRoleEmployeeClient({
        ...mockEmployee,
        seably_prm: true,
        updated_at: "2025-01-02T00:00:00Z",
      } as Employee).client as never
    );
  });

  it("persists configured checklist masterdata columns outside the static employee schema", async () => {
    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ seably_prm: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.seably_prm).toBe(true);
    expect(employeeRepository.update).toHaveBeenCalledWith(
      "emp-1",
      expect.objectContaining({ seably_prm: true })
    );
  });

  it("rejects display-derived field names instead of treating them as empty updates", async () => {
    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ prm: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.message).toBe("Ogiltigt uppdateringsfält: prm");
    expect(employeeRepository.update).not.toHaveBeenCalled();
  });

  it("returns Swedish validation copy when no update fields are provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.message).toBe("Minst ett fält måste anges för uppdatering");
  });

  it("validates dynamic masterdata value types with Swedish copy", async () => {
    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ seably_prm: "true" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.message).toBe("Värdet måste vara sant eller falskt");
    expect(json.error.details).toEqual({ seably_prm: ["Värdet måste vara sant eller falskt"] });
    expect(employeeRepository.update).not.toHaveBeenCalled();
  });

  it("does not allow recruiter updates to non-checklist dynamic fields without edit permission", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockColumnConfigClient([{ ...seablyPrmColumn, is_checklist_item: false }]) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ seably_prm: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });

    expect(response.status).toBe(403);
    expect(employeeRepository.update).not.toHaveBeenCalled();
  });

  it("persists admin_limited checklist updates through the authorized service-role path", async () => {
    vi.mocked(auth.requireEmployeeEditorAPI).mockResolvedValue(mockAdminLimitedUser);
    const serviceRole = mockServiceRoleEmployeeClient({
      ...mockEmployee,
      seably_prm: true,
      updated_at: "2025-01-02T00:00:00Z",
    } as Employee);
    vi.mocked(createServiceRoleClient).mockReturnValue(serviceRole.client as never);

    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ seably_prm: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.seably_prm).toBe(true);
    expect(employeeRepository.update).not.toHaveBeenCalled();
    expect(createServiceRoleClient).toHaveBeenCalled();
    expect(serviceRole.query.update).toHaveBeenCalledWith(
      expect.objectContaining({ seably_prm: true })
    );
  });

  it("rejects admin_limited updates to dynamic masterdata columns that are not checklist items", async () => {
    vi.mocked(auth.requireEmployeeEditorAPI).mockResolvedValue(mockAdminLimitedUser);
    vi.mocked(createClient).mockResolvedValue(
      mockColumnConfigClient([{ ...seablyPrmColumn, is_checklist_item: false }]) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ seably_prm: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });

    expect(response.status).toBe(403);
    expect(employeeRepository.update).not.toHaveBeenCalled();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rejects admin_limited updates to static employee columns that are not checklist items", async () => {
    vi.mocked(auth.requireEmployeeEditorAPI).mockResolvedValue(mockAdminLimitedUser);
    vi.mocked(createClient).mockResolvedValue(
      mockColumnConfigClient([firstNameColumn]) as never
    );

    const request = new NextRequest("http://localhost:3000/api/employees/emp-1", {
      method: "PATCH",
      body: JSON.stringify({ first_name: "Janet" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "emp-1" }) });

    expect(response.status).toBe(403);
    expect(employeeRepository.update).not.toHaveBeenCalled();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});
