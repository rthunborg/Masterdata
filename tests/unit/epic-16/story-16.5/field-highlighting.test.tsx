/**
 * Unit tests for Field Highlighting feature
 * 
 * Story: 16.5 - Field Highlighting in Employee Table
 */

import { screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";
import { EditableDateCell } from "@/components/dashboard/editable-date-cell";


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

describe("Story 16.5: Field Highlighting", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC1: Field Highlighting - EditableCell", () => {
    it("applies amber background when isChanged is true", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-amber-50");
      expect(cell).toHaveClass("dark:bg-amber-950/20");
    });

    it("does not apply highlight when isChanged is false", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={false}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).not.toHaveClass("bg-amber-50");
      expect(cell).not.toHaveClass("dark:bg-amber-950/20");
    });

    it("applies highlight to entire cell, not just text", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      // The background class should be on the cell container, not just text
      expect(cell).toHaveClass("bg-amber-50");
    });

    it("highlight does not interfere with hover state", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      // Should have both highlight and hover classes
      expect(cell).toHaveClass("bg-amber-50");
      expect(cell).toHaveClass("hover:bg-blue-50");
    });
  });

  describe("AC1: Field Highlighting - EditableDateCell", () => {
    const mockDates = [
      {
        id: "date-1",
        date_value: "2025-06-15",
        category: "Stena Dates",
        week_number: 24,
        year: 2025,
        is_active: true,
      },
    ];

    it("applies amber background when isChanged is true (read-only)", () => {
      renderWithQueryClient(
        <EditableDateCell
          value="date-1"
          displayValue="Week 24, 2025, Stena Dates"
          employeeId="emp-1"
          field="stena_date"
          dateCategory="Stena Dates"
          allDates={mockDates}
          canEdit={false}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-amber-50");
      expect(cell).toHaveClass("dark:bg-amber-950/20");
    });

    it("applies amber background when isChanged is true (editable)", () => {
      renderWithQueryClient(
        <EditableDateCell
          value="date-1"
          displayValue="Week 24, 2025, Stena Dates"
          employeeId="emp-1"
          field="stena_date"
          dateCategory="Stena Dates"
          allDates={mockDates}
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-amber-50");
      expect(cell).toHaveClass("dark:bg-amber-950/20");
    });

    it("does not apply highlight when isChanged is false", () => {
      renderWithQueryClient(
        <EditableDateCell
          value="date-1"
          displayValue="Week 24, 2025, Stena Dates"
          employeeId="emp-1"
          field="stena_date"
          dateCategory="Stena Dates"
          allDates={mockDates}
          canEdit={true}
          isChanged={false}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).not.toHaveClass("bg-amber-50");
      expect(cell).not.toHaveClass("dark:bg-amber-950/20");
    });
  });

  describe("AC5: No Highlight for Unchanged", () => {
    it("unchanged fields have normal styling", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={false}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-white");
      expect(cell).not.toHaveClass("bg-amber-50");
    });
  });

  describe("AC8: Inline Editing Compatibility", () => {
    it("highlight does not interfere with edit mode", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      // Click to enter edit mode
      fireEvent.click(cell);

      // Input should appear (edit mode takes precedence)
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      // The cell container should still exist but input is now the focus
      expect(cell).toBeInTheDocument();
    });

    it("highlight remains after saving if field still changed", () => {
      const { rerender } = renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      let cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-amber-50");

      // Simulate save - field still changed
      rerender(
        <EditableCell
          value="New Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-amber-50");
    });
  });

  describe("AC6: Highlight Styling", () => {
    it("uses soft amber color (bg-amber-50) in light mode", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-amber-50");
    });

    it("uses subtle amber in dark mode (bg-amber-950/20)", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("dark:bg-amber-950/20");
    });

    it("text remains readable with highlight", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          isChanged={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      // Cell should still display text content
      expect(cell).toHaveTextContent("Test Value");
      // Should not have text color classes that would make it unreadable
      expect(cell).not.toHaveClass("text-white");
    });
  });

  describe("Backward Compatibility", () => {
    it("works when isChanged prop is not provided (defaults to false)", () => {
      renderWithQueryClient(
        <EditableCell
          value="Test Value"
          employeeId="emp-1"
          field="first_name"
          type="text"
          canEdit={true}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).not.toHaveClass("bg-amber-50");
      expect(cell).toHaveClass("bg-white");
    });
  });
});

