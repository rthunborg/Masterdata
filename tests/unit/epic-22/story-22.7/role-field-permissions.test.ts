import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { ColumnConfig } from "@/lib/types/column-config";
import { ALL_ROLES, UserRole } from "@/lib/types/user";
import {
  filterEmployeeForRole,
  visibleEmployeeFieldNamesForRole,
} from "@/lib/server/employee-field-access";
import { canEditField, getColumnViewRole } from "@/lib/utils/role-utils";
import type { Employee } from "@/lib/types/employee";

const repoRoot = resolve(process.cwd());
const fieldAccessMatrix = readFileSync(
  join(repoRoot, "docs", "commercial-readiness", "20_field_access_matrix.md"),
  "utf8"
);

const roleColumnLabels: Record<UserRole, string> = {
  [UserRole.HR_ADMIN]: "HR Admin",
  [UserRole.RECRUITER]: "Recruiter",
  [UserRole.ADMIN_LIMITED]: "admin_limited",
  [UserRole.SODEXO]: "Sodexo",
  [UserRole.OMC]: "OMC",
  [UserRole.PAYROLL]: "Payroll",
  [UserRole.TOPLUX]: "Toplux",
  [UserRole.CREWING]: "Crewing",
};

function parseMatrixRows(markdown: string) {
  const rows = new Map<string, Record<UserRole, string>>();

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("| ") || line.includes("| --- |")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 10) continue;
    if (cells[0] === "Field(s)" || cells[0] === "Field / payload") continue;

    const fieldCell = cells[0];
    rows.set(
      fieldCell,
      Object.fromEntries(
        ALL_ROLES.map((role) => {
          const label = roleColumnLabels[role];
          const columnIndex = [
            "HR Admin",
            "Recruiter",
            "admin_limited",
            "Sodexo",
            "OMC",
            "Payroll",
            "Toplux",
            "Crewing",
          ].indexOf(label);
          return [role, cells[columnIndex + 2]];
        })
      ) as Record<UserRole, string>
    );
  }

  return rows;
}

const matrixRows = parseMatrixRows(fieldAccessMatrix);

const allRolePermissions = Object.fromEntries(
  ALL_ROLES.map((role) => [role, { view: false, edit: false }])
) as Record<UserRole, { view: boolean; edit: boolean }>;

function column(
  dbColumnName: string,
  permissions: Partial<Record<UserRole, { view: boolean; edit: boolean }>>,
  overrides: Partial<ColumnConfig> = {}
): ColumnConfig {
  return {
    id: `col-${dbColumnName}`,
    column_name: dbColumnName,
    db_column_name: dbColumnName,
    column_type: "text",
    role_permissions: {
      ...allRolePermissions,
      ...permissions,
    },
    is_masterdata: true,
    category: null,
    category_color: null,
    display_order: 1,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
    ...overrides,
  };
}

const matrixDerivedColumns = [
  column("first_name", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: false },
    crewing: { view: true, edit: false },
    sodexo: { view: true, edit: false },
    omc: { view: true, edit: false },
    payroll: { view: true, edit: false },
    toplux: { view: true, edit: false },
  }),
  column("mobile", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: false },
    crewing: { view: true, edit: false },
    sodexo: { view: true, edit: false },
    omc: { view: true, edit: false },
    toplux: { view: true, edit: false },
  }),
  column("ssn", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: false },
    crewing: { view: true, edit: false },
    payroll: { view: true, edit: false },
  }),
  column("gender", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: false },
    crewing: { view: true, edit: false },
  }),
  column("termination_reason", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: false },
  }),
  column("comments", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: false },
  }),
  column("diet_details", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: false },
    admin_limited: { view: true, edit: false },
    crewing: { view: true, edit: false },
    sodexo: { view: true, edit: false },
    omc: { view: true, edit: false },
  }),
  column("loneiva", {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    admin_limited: { view: true, edit: false },
  }),
  column(
    "passport",
    {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: false },
      admin_limited: { view: true, edit: false },
    },
    { column_type: "boolean", is_checklist_item: true }
  ),
  column(
    "sodexo_uniform_size",
    {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: true },
    },
    { is_masterdata: false }
  ),
  column(
    "omc_medical_clearance",
    {
      hr_admin: { view: true, edit: true },
      omc: { view: true, edit: true },
    },
    { is_masterdata: false }
  ),
  column(
    "payroll_salary_code",
    {
      hr_admin: { view: true, edit: true },
      payroll: { view: true, edit: true },
    },
    { is_masterdata: false }
  ),
  column(
    "toplux_room_note",
    {
      hr_admin: { view: true, edit: true },
      toplux: { view: true, edit: true },
    },
    { is_masterdata: false }
  ),
  column(
    "crewing_staffing_note",
    {
      hr_admin: { view: true, edit: true },
      crewing: { view: true, edit: true },
    },
    { is_masterdata: false }
  ),
];

const expectedVisibleFields: Record<UserRole, string[]> = {
  hr_admin: [
    "id",
    "first_name",
    "mobile",
    "ssn",
    "gender",
    "termination_reason",
    "comments",
    "diet_details",
    "loneiva",
    "passport",
    "sodexo_uniform_size",
    "omc_medical_clearance",
    "payroll_salary_code",
    "toplux_room_note",
    "crewing_staffing_note",
  ],
  recruiter: [
    "id",
    "first_name",
    "mobile",
    "ssn",
    "gender",
    "termination_reason",
    "comments",
    "diet_details",
    "loneiva",
    "passport",
    "sodexo_uniform_size",
    "omc_medical_clearance",
    "payroll_salary_code",
    "toplux_room_note",
    "crewing_staffing_note",
  ],
  admin_limited: [
    "id",
    "first_name",
    "mobile",
    "ssn",
    "gender",
    "termination_reason",
    "comments",
    "diet_details",
    "loneiva",
    "passport",
    "sodexo_uniform_size",
    "omc_medical_clearance",
    "payroll_salary_code",
    "toplux_room_note",
    "crewing_staffing_note",
  ],
  crewing: [
    "id",
    "first_name",
    "mobile",
    "ssn",
    "gender",
    "diet_details",
    "crewing_staffing_note",
  ],
  sodexo: ["id", "first_name", "mobile", "diet_details", "sodexo_uniform_size"],
  omc: ["id", "first_name", "mobile", "diet_details", "omc_medical_clearance"],
  payroll: ["id", "first_name", "ssn", "payroll_salary_code"],
  toplux: ["id", "first_name", "mobile", "toplux_room_note"],
};

const expectedEditableFields: Record<UserRole, string[]> = {
  hr_admin: [
    "first_name",
    "mobile",
    "ssn",
    "gender",
    "termination_reason",
    "comments",
    "diet_details",
    "loneiva",
    "passport",
    "sodexo_uniform_size",
    "omc_medical_clearance",
    "payroll_salary_code",
    "toplux_room_note",
    "crewing_staffing_note",
  ],
  recruiter: [
    "first_name",
    "mobile",
    "ssn",
    "gender",
    "termination_reason",
    "comments",
    "loneiva",
    "passport",
  ],
  admin_limited: ["passport"],
  crewing: ["crewing_staffing_note"],
  sodexo: ["sodexo_uniform_size"],
  omc: ["omc_medical_clearance"],
  payroll: ["payroll_salary_code"],
  toplux: ["toplux_room_note"],
};

const employee = {
  id: "emp-1",
  first_name: "A",
  surname: "Tester",
  ssn: "990101-1234",
  mobile: "+46700000000",
  gender: "Woman",
  termination_reason: "Private",
  comments: "Private comment",
  diet_details: "Private diet note",
  loneiva: 4,
  passport: true,
  sodexo_uniform_size: "M",
  omc_medical_clearance: "Approved",
  payroll_salary_code: "P1",
  toplux_room_note: "Cabin A",
  crewing_staffing_note: "Ready",
} as Employee & {
  sodexo_uniform_size: string;
  omc_medical_clearance: string;
  payroll_salary_code: string;
  toplux_room_note: string;
  crewing_staffing_note: string;
};

describe("Story 22.7 role-visible and editable field evidence", () => {
  it("uses the current eight-role model referenced by the field matrix", () => {
    expect(ALL_ROLES).toEqual([
      UserRole.HR_ADMIN,
      UserRole.RECRUITER,
      UserRole.ADMIN_LIMITED,
      UserRole.SODEXO,
      UserRole.OMC,
      UserRole.PAYROLL,
      UserRole.TOPLUX,
      UserRole.CREWING,
    ]);

    for (const matrixHeader of [
      "HR Admin",
      "Recruiter",
      "admin_limited",
      "Sodexo",
      "OMC",
      "Payroll",
      "Toplux",
      "Crewing",
    ]) {
      expect(fieldAccessMatrix).toContain(matrixHeader);
    }

    expect(
      matrixRows.get("`first_name`, `surname`, `email`, `rank`")
    ).toMatchObject({
      [UserRole.HR_ADMIN]: "Y / Y / Y",
      [UserRole.RECRUITER]: "Y / API-Y / Y",
      [UserRole.ADMIN_LIMITED]: "Y / N / Y, RLS?",
      [UserRole.SODEXO]: "Y / N / Y",
      [UserRole.OMC]: "Y / N / Y",
      [UserRole.PAYROLL]: "Y / N / Y",
      [UserRole.TOPLUX]: "Y / N / Y",
      [UserRole.CREWING]: "Y / N / Y",
    });
    expect(matrixRows.get("`ssn`")).toMatchObject({
      [UserRole.SODEXO]: "N / N / N",
      [UserRole.OMC]: "N / N / N",
      [UserRole.PAYROLL]: "Y / N / Y",
      [UserRole.TOPLUX]: "N / N / N",
      [UserRole.CREWING]: "Y / N / Y",
    });
    expect(matrixRows.get("`gender`")).toMatchObject({
      [UserRole.SODEXO]: "N / N / N",
      [UserRole.OMC]: "N / N / N",
      [UserRole.PAYROLL]: "N / N / N",
      [UserRole.TOPLUX]: "N / N / N",
      [UserRole.CREWING]: "Y / N / Y",
    });
    expect(
      matrixRows.get("Dynamic custom columns where `is_masterdata = false`")
    ).toMatchObject({
      [UserRole.HR_ADMIN]: "Y / Y / Y",
      [UserRole.SODEXO]: "Cfg / Cfg / Cfg",
      [UserRole.OMC]: "Cfg / Cfg / Cfg",
      [UserRole.PAYROLL]: "Cfg / Cfg / Cfg",
      [UserRole.TOPLUX]: "Cfg / Cfg / Cfg",
      [UserRole.CREWING]: "Cfg / Cfg / Cfg",
    });
  });

  it("derives visible sensitive fields from the Story 22.6 field matrix fixture for every role", () => {
    for (const role of ALL_ROLES) {
      const visibleFields = visibleEmployeeFieldNamesForRole(
        matrixDerivedColumns,
        role
      );

      expect([...visibleFields].sort()).toEqual(expectedVisibleFields[role].sort());
    }
  });

  it("verifies editable field expectations for every role", () => {
    expect(getColumnViewRole(UserRole.HR_ADMIN)).toBe(UserRole.HR_ADMIN);
    expect(getColumnViewRole(UserRole.RECRUITER)).toBe(UserRole.HR_ADMIN);
    expect(getColumnViewRole(UserRole.ADMIN_LIMITED)).toBe(UserRole.HR_ADMIN);
    expect(getColumnViewRole(UserRole.SODEXO)).toBe(UserRole.SODEXO);

    for (const role of ALL_ROLES) {
      const editableFields = matrixDerivedColumns
        .filter((candidate) => canEditField(role, candidate))
        .map((candidate) => candidate.db_column_name);

      expect(editableFields.sort()).toEqual(expectedEditableFields[role].sort());
    }
  });

  it("filters external employee API records to visible fields and customData only", () => {
    const sodexoRecord = filterEmployeeForRole(
      employee,
      matrixDerivedColumns,
      UserRole.SODEXO
    ) as Record<string, unknown>;
    const payrollRecord = filterEmployeeForRole(
      employee,
      matrixDerivedColumns,
      UserRole.PAYROLL
    ) as Record<string, unknown>;
    const hrAdminRecord = filterEmployeeForRole(
      employee,
      matrixDerivedColumns,
      UserRole.HR_ADMIN
    ) as Record<string, unknown>;

    expect(sodexoRecord).toMatchObject({
      id: "emp-1",
      first_name: "A",
      diet_details: "Private diet note",
      customData: { sodexo_uniform_size: "M" },
    });
    expect(sodexoRecord).not.toHaveProperty("ssn");
    expect(sodexoRecord).not.toHaveProperty("gender");
    expect(sodexoRecord).not.toHaveProperty("comments");
    expect(sodexoRecord).not.toHaveProperty("sodexo_uniform_size");

    expect(payrollRecord).toMatchObject({ id: "emp-1", first_name: "A", ssn: "990101-1234" });
    expect(payrollRecord).not.toHaveProperty("mobile");
    expect(payrollRecord).not.toHaveProperty("diet_details");

    expect(hrAdminRecord).toHaveProperty("ssn", "990101-1234");
    expect(hrAdminRecord).toHaveProperty("comments", "Private comment");
  });
});
