import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyFilterState } from "@/components/dashboard/EmptyFilterState";
import type { FilterState } from "@/lib/types/filter";
import type { ColumnConfig } from "@/lib/types/column-config";

describe("EmptyFilterState - Story 20.5", () => {
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

  it("displays no employees found message", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "john",
      },
    ];

    render(
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={vi.fn()}
      />
    );

    expect(screen.getByText("No employees found")).toBeInTheDocument();
    expect(
      screen.getByText("No employees match your current filter criteria.")
    ).toBeInTheDocument();
  });

  it("displays active filters list", () => {
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
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={vi.fn()}
      />
    );

    expect(screen.getByText("Active filters:")).toBeInTheDocument();
    expect(screen.getByText(/First Name:/)).toBeInTheDocument();
    expect(screen.getByText(/"john"/)).toBeInTheDocument();
    expect(screen.getByText(/Active:/)).toBeInTheDocument();
    expect(screen.getByText(/Yes/)).toBeInTheDocument();
  });

  it("calls onClearFilters when button clicked", async () => {
    const handleClear = vi.fn();
    const user = userEvent.setup();
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "test",
      },
    ];

    render(
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={handleClear}
      />
    );

    const button = screen.getByRole("button", { name: /clear all filters/i });
    await user.click(button);

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("displays AlertCircle icon", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "text",
        textValue: "test",
      },
    ];

    render(
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={vi.fn()}
      />
    );

    const container = screen.getByTestId("empty-filter-state");
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
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
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={vi.fn()}
      />
    );

    // Check for "Active: No" specifically (the filter value, not the "No employees found" heading)
    expect(screen.getByText(/Active:/)).toBeInTheDocument();
    const filterItem = screen.getByText(/Active:/).closest('li');
    expect(filterItem).toHaveTextContent('No');
  });

  it("formats date filter values correctly with count fallback", () => {
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "date",
        selectedDateIds: ["date-1", "date-2"],
      },
    ];

    render(
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={vi.fn()}
      />
    );

    expect(screen.getByText(/2 date\(s\) selected/)).toBeInTheDocument();
  });

  it("displays actual date names when importantDates provided", () => {
    const mockDates: Partial<ImportantDate>[] = [
      { id: "date-1", date_description: "Week 15 - ÖMC" },
      { id: "date-2", date_description: "Week 16 - ÖMC" },
    ];
    
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "date",
        selectedDateIds: ["date-1"],
      },
    ];

    render(
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={vi.fn()}
        importantDates={mockDates}
      />
    );

    expect(screen.getByText(/Week 15 - ÖMC/)).toBeInTheDocument();
  });

  it("truncates date list with +N more for many dates", () => {
    const mockDates: Partial<ImportantDate>[] = [
      { id: "date-1", date_description: "Week 15" },
      { id: "date-2", date_description: "Week 16" },
      { id: "date-3", date_description: "Week 17" },
      { id: "date-4", date_description: "Week 18" },
    ];
    
    const filters: FilterState[] = [
      {
        columnId: "col-1",
        type: "date",
        selectedDateIds: ["date-1", "date-2", "date-3", "date-4"],
      },
    ];

    render(
      <EmptyFilterState
        activeFilters={filters}
        columnConfigs={mockColumnConfigs}
        onClearFilters={vi.fn()}
        importantDates={mockDates as ImportantDate[]}
      />
    );

    expect(screen.getByText(/Week 15, Week 16 \+2 more/)).toBeInTheDocument();
  });
});
