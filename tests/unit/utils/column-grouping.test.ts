import { describe, it, expect } from "vitest";
import { groupColumnsByCategory, extractCategoryMetadata } from "@/lib/utils/column-grouping";
import type { ColumnConfig } from "@/lib/types/column-config";

// Helper to create test column configs with required fields
const createColumnConfig = (overrides: Partial<ColumnConfig>): ColumnConfig => ({
  id: "test-id",
  column_name: "Test Column",
  db_column_name: "test_column",
  column_type: "text",
  is_masterdata: false,
  category: null,
  category_color: null,
  role_permissions: {},
  display_order: 0,
  is_visible: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("groupColumnsByCategory", () => {
  it("groups columns by category correctly", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "First Name",
        db_column_name: "first_name",
        is_masterdata: true,
      }),
      createColumnConfig({
        id: "2",
        column_name: "Team",
        db_column_name: "team",
        category: "Recruitment Team",
      }),
      createColumnConfig({
        id: "3",
        column_name: "Location",
        db_column_name: "location",
        category: "Warehouse Team",
      }),
      createColumnConfig({
        id: "4",
        column_name: "Notes",
        db_column_name: "notes",
      }),
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
      createColumnConfig({
        id: "1",
        column_name: "Notes",
        column_type: "text",
        is_masterdata: false,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
    ];

    const grouped = groupColumnsByCategory(columns);

    expect(grouped["Uncategorized"]).toHaveLength(1);
    expect(grouped["Uncategorized"][0].column_name).toBe("Notes");
  });

  it("groups multiple columns with same category", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "Team A",
        column_type: "text",
        is_masterdata: false,
        category: "Recruitment",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
      createColumnConfig({
        id: "2",
        column_name: "Team B",
        column_type: "text",
        is_masterdata: false,
        category: "Recruitment",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
      createColumnConfig({
        id: "3",
        column_name: "Team C",
        column_type: "text",
        is_masterdata: false,
        category: "Recruitment",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
    ];

    const grouped = groupColumnsByCategory(columns);

    expect(grouped["Recruitment"]).toHaveLength(3);
    expect(grouped["Recruitment"][0].column_name).toBe("Team A");
    expect(grouped["Recruitment"][1].column_name).toBe("Team B");
    expect(grouped["Recruitment"][2].column_name).toBe("Team C");
  });

  it("separates masterdata from custom columns", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "First Name",
        column_type: "text",
        is_masterdata: true,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
      createColumnConfig({
        id: "2",
        column_name: "Email",
        column_type: "text",
        is_masterdata: true,
        category: null,
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
      createColumnConfig({
        id: "3",
        column_name: "Custom Field",
        column_type: "text",
        is_masterdata: false,
        category: "Custom",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
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
      createColumnConfig({
        id: "1",
        column_name: "Empty Category",
        column_type: "text",
        is_masterdata: false,
        category: "",
        role_permissions: {},
        created_at: "2025-01-01T00:00:00Z",
      db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),
    }),
    ];

    const grouped = groupColumnsByCategory(columns);

    // Empty string is truthy, so it will create a category with empty string key
    // But in our implementation, we use `col.category || "Uncategorized"`
    // which treats empty string as falsy
    expect(grouped["Uncategorized"]).toBeDefined();
  });
});

describe("extractCategoryMetadata", () => {
  it("extracts category names, colors, and counts", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "Team Field",
        category: "Recruitment",
        category_color: "#3B82F6",
      }),
      createColumnConfig({
        id: "2",
        column_name: "Team Size",
        category: "Recruitment",
        category_color: "#3B82F6",
      }),
      createColumnConfig({
        id: "3",
        column_name: "Location",
        category: "Warehouse",
        category_color: "#10B981",
      }),
    ];

    const metadata = extractCategoryMetadata(columns);

    expect(metadata).toHaveLength(2);
    
    const recruitment = metadata.find((m) => m.name === "Recruitment");
    expect(recruitment).toBeDefined();
    expect(recruitment?.color).toBe("#3B82F6");
    expect(recruitment?.columnCount).toBe(2);

    const warehouse = metadata.find((m) => m.name === "Warehouse");
    expect(warehouse).toBeDefined();
    expect(warehouse?.color).toBe("#10B981");
    expect(warehouse?.columnCount).toBe(1);
  });

  it("ignores masterdata columns", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "First Name",
        is_masterdata: true,
        category: null,
      }),
      createColumnConfig({
        id: "2",
        column_name: "Team",
        category: "Recruitment",
        category_color: "#3B82F6",
      }),
    ];

    const metadata = extractCategoryMetadata(columns);

    expect(metadata).toHaveLength(1);
    expect(metadata[0].name).toBe("Recruitment");
  });

  it("handles columns without colors", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "Team",
        category: "Recruitment",
        category_color: null,
      }),
    ];

    const metadata = extractCategoryMetadata(columns);

    expect(metadata).toHaveLength(1);
    expect(metadata[0].name).toBe("Recruitment");
    expect(metadata[0].color).toBeNull();
    expect(metadata[0].columnCount).toBe(1);
  });

  it("uses first non-null color when columns have different colors", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "Team A",
        category: "Recruitment",
        category_color: null,
      }),
      createColumnConfig({
        id: "2",
        column_name: "Team B",
        category: "Recruitment",
        category_color: "#3B82F6",
      }),
      createColumnConfig({
        id: "3",
        column_name: "Team C",
        category: "Recruitment",
        category_color: "#EF4444",
      }),
    ];

    const metadata = extractCategoryMetadata(columns);

    expect(metadata).toHaveLength(1);
    expect(metadata[0].color).toBe("#3B82F6"); // First non-null color
    expect(metadata[0].columnCount).toBe(3);
  });

  it("ignores columns without category", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "Notes",
        category: null,
      }),
      createColumnConfig({
        id: "2",
        column_name: "Team",
        category: "Recruitment",
        category_color: "#3B82F6",
      }),
    ];

    const metadata = extractCategoryMetadata(columns);

    expect(metadata).toHaveLength(1);
    expect(metadata[0].name).toBe("Recruitment");
  });

  it("returns empty array when no custom columns with categories exist", () => {
    const columns: ColumnConfig[] = [
      createColumnConfig({
        id: "1",
        column_name: "First Name",
        is_masterdata: true,
      }),
      createColumnConfig({
        id: "2",
        column_name: "Notes",
        category: null,
      }),
    ];

    const metadata = extractCategoryMetadata(columns);

    expect(metadata).toHaveLength(0);
  });
});
