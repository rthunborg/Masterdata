import { describe, it, expect } from "vitest";
import { groupColumnsByCategory } from "@/lib/utils/column-grouping";
import type { ColumnConfig } from "@/lib/types/column-config";

describe("groupColumnsByCategory", () => {
  it("groups columns by category correctly", () => {
    const columns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "First Name",
        column_type: "text",
        is_masterdata: true,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "2",
        column_name: "Team",
        column_type: "text",
        is_masterdata: false,
        category: "Recruitment Team",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "3",
        column_name: "Location",
        column_type: "text",
        is_masterdata: false,
        category: "Warehouse Team",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "4",
        column_name: "Notes",
        column_type: "text",
        is_masterdata: false,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const grouped = groupColumnsByCategory(columns);

    expect(grouped["Employee Information"]).toHaveLength(1);
    expect(grouped["Employee Information"][0].column_name).toBe("First Name");
    expect(grouped["Recruitment Team"]).toHaveLength(1);
    expect(grouped["Recruitment Team"][0].column_name).toBe("Team");
    expect(grouped["Warehouse Team"]).toHaveLength(1);
    expect(grouped["Warehouse Team"][0].column_name).toBe("Location");
    expect(grouped["Uncategorized"]).toHaveLength(1);
    expect(grouped["Uncategorized"][0].column_name).toBe("Notes");
  });

  it("handles null category as Uncategorized", () => {
    const columns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "Notes",
        column_type: "text",
        is_masterdata: false,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const grouped = groupColumnsByCategory(columns);

    expect(grouped["Uncategorized"]).toHaveLength(1);
    expect(grouped["Uncategorized"][0].column_name).toBe("Notes");
  });

  it("groups multiple columns with same category", () => {
    const columns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "Team A",
        column_type: "text",
        is_masterdata: false,
        category: "Recruitment",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "2",
        column_name: "Team B",
        column_type: "text",
        is_masterdata: false,
        category: "Recruitment",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "3",
        column_name: "Team C",
        column_type: "text",
        is_masterdata: false,
        category: "Recruitment",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const grouped = groupColumnsByCategory(columns);

    expect(grouped["Recruitment"]).toHaveLength(3);
    expect(grouped["Recruitment"][0].column_name).toBe("Team A");
    expect(grouped["Recruitment"][1].column_name).toBe("Team B");
    expect(grouped["Recruitment"][2].column_name).toBe("Team C");
  });

  it("separates masterdata from custom columns", () => {
    const columns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "First Name",
        column_type: "text",
        is_masterdata: true,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "2",
        column_name: "Email",
        column_type: "text",
        is_masterdata: true,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "3",
        column_name: "Custom Field",
        column_type: "text",
        is_masterdata: false,
        category: "Custom",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const grouped = groupColumnsByCategory(columns);

    expect(grouped["Employee Information"]).toHaveLength(2);
    expect(grouped["Employee Information"][0].column_name).toBe("First Name");
    expect(grouped["Employee Information"][1].column_name).toBe("Email");
    expect(grouped["Custom"]).toHaveLength(1);
    expect(grouped["Custom"][0].column_name).toBe("Custom Field");
  });

  it("handles empty columns array", () => {
    const columns: ColumnConfig[] = [];
    const grouped = groupColumnsByCategory(columns);

    expect(grouped["Employee Information"]).toEqual([]);
    expect(Object.keys(grouped)).toEqual(["Employee Information"]);
  });

  it("handles columns with empty string category as Uncategorized", () => {
    const columns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "Empty Category",
        column_type: "text",
        is_masterdata: false,
        category: "",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const grouped = groupColumnsByCategory(columns);

    // Empty string is truthy, so it will create a category with empty string key
    // But in our implementation, we use `col.category || "Uncategorized"`
    // which treats empty string as falsy
    expect(grouped["Uncategorized"]).toBeDefined();
  });
});
