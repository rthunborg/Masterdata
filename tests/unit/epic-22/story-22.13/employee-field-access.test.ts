import { describe, expect, it } from "vitest";

import { applyFilters } from "@/lib/filters/filterEngine";
import { filterEmployeeForRole } from "@/lib/server/employee-field-access";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";

function customColumn(dbColumnName: string): ColumnConfig {
  return {
    id: `column-${dbColumnName}`,
    column_name: dbColumnName,
    db_column_name: dbColumnName,
    column_type: "text",
    role_permissions: {
      [UserRole.SODEXO]: { view: true, edit: false },
      [UserRole.HR_ADMIN]: { view: true, edit: true },
    },
    is_masterdata: false,
    category: null,
    category_color: null,
    display_order: 1,
    is_visible: true,
    is_checklist_item: false,
    created_at: "2026-07-13T00:00:00Z",
    updated_at: "2026-07-13T00:00:00Z",
  };
}

describe("Story 22.13 Round 3 employee field isolation", () => {
  it("preserves a permitted custom value for top-level filter and accessor consumers", () => {
    const column = customColumn("sodexo_uniform_size");
    const source = {
      id: "employee-1",
      sodexo_uniform_size: "Medium",
    } as Employee & { sodexo_uniform_size: string };

    const filtered = filterEmployeeForRole(
      source,
      [column],
      UserRole.SODEXO
    ) as Employee & { sodexo_uniform_size?: string };

    expect(filtered.sodexo_uniform_size).toBe("Medium");
    expect(filtered.customData).toEqual({ sodexo_uniform_size: "Medium" });
    expect(
      applyFilters(
        [filtered],
        [
          {
            columnId: column.id,
            type: "text",
            operator: "contains",
            textValue: "medium",
          },
        ],
        [],
        [column]
      )
    ).toEqual([filtered]);
  });

  it("reads an alias-like custom column by its physical name without exposing SSN", () => {
    const column = customColumn("social_security_no");
    const source = {
      id: "employee-2",
      ssn: "990101-1234",
      social_security_no: "custom-reference",
    } as Employee & { social_security_no: string };

    const filtered = filterEmployeeForRole(
      source,
      [column],
      UserRole.SODEXO
    ) as Record<string, unknown>;

    expect(filtered).not.toHaveProperty("ssn");
    expect(filtered).toHaveProperty("social_security_no", "custom-reference");
    expect(filtered.customData).toEqual({
      social_security_no: "custom-reference",
    });
  });
});
