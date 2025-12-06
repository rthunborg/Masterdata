/**
 * Unit tests for Field Highlighting feature
 * 
 * Story: 16.5 - Field Highlighting in Employee Table
 */

import { screen, fireEvent } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";
import { EditableDateCell } from "@/components/dashboard/editable-date-cell";

describe("Story 16.5: Field Highlighting", () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC1: Field Highlighting - EditableCell", () => {
    it("applies amber background when isChanged is true", () => {
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      const { rerender } = renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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
      renderWithI18n(
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

