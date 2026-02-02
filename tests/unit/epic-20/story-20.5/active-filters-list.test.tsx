import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveFiltersList } from "@/components/dashboard/FilterPanel/ActiveFiltersList";
import type { FilterState } from "@/lib/types/filter";
import type { ColumnConfig } from "@/lib/types/column-config";


vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
}));

describe("ActiveFiltersList - Story 20.5", () => {
  const mockColumnConfigs: ColumnConfig[] = [
    {
      id: "col-1",
      display_name: "First Name",
      db_column_name: "first_name",
      column_name: "First Name",
      column_type: "text",
      is_visible: true,
      is_editable: true,
      is_masterdata: true,
      is_checklist_item: false,
      role_permissions: {},
      display_order: 1,
      category: "Personal",
      category_color: "#000000",
    },
    {
      id: "col-2",
      display_name: "Active",
      db_column_name: "is_active",
      column_name: "Active",
      column_type: "boolean",
      is_visible: true,
      is_editable: true,
      is_masterdata: true,
      is_checklist_item: false,
      role_permissions: {},
      display_order: 2,
      category: "Status",
      category_color: "#000000",
    },
  ];

  it("does not render when filters array is empty", () => {
    render(
      <ActiveFiltersList
        filters={[]}
        columnConfigs={mockColumnConfigs}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const list = screen.queryByTestId("active-filters-list");
    expect(list).not.toBeInTheDocument();
  });

  it("renders active filters with count", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "john",
      },
      {
        columnId: "col-2",
        type: "boolean",
        boolValue: true,
      },
    ];

    render(
      <ActiveFiltersList
        filters={filters}
        columnConfigs={mockColumnConfigs}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText("Active Filters (2)")).toBeInTheDocument();
  });

  it("displays each filter with column name and value", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "john",
      },
    ];

    render(
      <ActiveFiltersList
        filters={filters}
        columnConfigs={mockColumnConfigs}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/First Name:/)).toBeInTheDocument();
    expect(screen.getByText(/"john"/)).toBeInTheDocument();
  });

  it("calls onRemove when individual filter X button clicked", async () => {
    const handleRemove = vi.fn();
    const user = userEvent.setup();
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "test",
      },
    ];

    render(
      <ActiveFiltersList
        filters={filters}
        columnConfigs={mockColumnConfigs}
        onRemove={handleRemove}
        onClearAll={vi.fn()}
      />
    );

    const removeButton = screen.getByTestId("remove-filter-col-1");
    await user.click(removeButton);

    expect(handleRemove).toHaveBeenCalledWith("col-1");
  });

  it("calls onClearAll when Clear All button clicked", async () => {
    const handleClearAll = vi.fn();
    const user = userEvent.setup();
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "test",
      },
    ];

    render(
      <ActiveFiltersList
        filters={filters}
        columnConfigs={mockColumnConfigs}
        onRemove={vi.fn()}
        onClearAll={handleClearAll}
      />
    );

    const clearAllButton = screen.getByTestId("clear-all-filters-button");
    await user.click(clearAllButton);

    expect(handleClearAll).toHaveBeenCalledTimes(1);
  });

  it("formats boolean filter values correctly", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-2",
        type: "boolean",
        boolValue: false,
      },
    ];

    render(
      <ActiveFiltersList
        filters={filters}
        columnConfigs={mockColumnConfigs}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/No/)).toBeInTheDocument();
  });

  it("formats date filter values correctly", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "date",
        selectedDateIds: ["date-1", "date-2", "date-3"],
      },
    ];

    render(
      <ActiveFiltersList
        filters={filters}
        columnConfigs={mockColumnConfigs}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/3 date\(s\)/)).toBeInTheDocument();
  });

  it("renders multiple filters correctly", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "john",
      },
      {
        columnId: "col-2",
        type: "boolean",
        boolValue: true,
      },
    ];

    render(
      <ActiveFiltersList
        filters={filters}
        columnConfigs={mockColumnConfigs}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByTestId("active-filter-col-1")).toBeInTheDocument();
    expect(screen.getByTestId("active-filter-col-2")).toBeInTheDocument();
  });
});
