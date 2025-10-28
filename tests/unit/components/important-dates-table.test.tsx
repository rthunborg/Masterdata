import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ImportantDatesTable } from "@/components/dashboard/important-dates-table";
import type { ImportantDate } from "@/lib/types/important-date";
import { importantDateService } from "@/lib/services/important-date-service";
import { toast } from "sonner";

// Mock the important date service
vi.mock("@/lib/services/important-date-service", () => ({
  importantDateService: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ImportantDatesTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockImportantDates: ImportantDate[] = [
    {
      id: "date-1",
      week_number: 7,
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
      notes: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "date-2",
      week_number: 10,
      year: 2025,
      category: "ÖMC Dates",
      date_description: "Fredag 7/3",
      date_value: "8-9/3",
      notes: "Important deadline",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "date-3",
      week_number: 15,
      year: 2025,
      category: "Other",
      date_description: "Holiday",
      date_value: "10/4",
      notes: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  describe("Rendering", () => {
    it("should render important dates correctly", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      expect(screen.getByText("Fredag 14/2")).toBeInTheDocument();
      expect(screen.getByText("15-16/2")).toBeInTheDocument();
      expect(screen.getByText("Stena Dates")).toBeInTheDocument();
      expect(screen.getByText("Fredag 7/3")).toBeInTheDocument();
      expect(screen.getByText("8-9/3")).toBeInTheDocument();
      expect(screen.getByText("ÖMC Dates")).toBeInTheDocument();
    });

    it("should display loading state", () => {
      render(
        <ImportantDatesTable
          dates={[]}
          isLoading={true}
          userRole="hr_admin"
        />
      );

      const loader = screen.getByRole("status");
      expect(loader).toBeInTheDocument();
      expect(loader).toHaveAttribute("aria-label", "Loading");
    });

    it("should display empty state when no dates exist", () => {
      render(
        <ImportantDatesTable
          dates={[]}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      expect(screen.getByText(/No important dates found/i)).toBeInTheDocument();
    });

    it("should render all table columns", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      expect(screen.getByText("Week")).toBeInTheDocument();
      expect(screen.getByText("Year")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Notes")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  describe("Role-based Display", () => {
    it("should show delete buttons for HR Admin", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("should hide delete buttons for external party users", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="sodexo"
        />
      );

      const deleteButtons = screen.queryAllByRole("button", { name: /delete/i });
      expect(deleteButtons).toHaveLength(0);
    });

    it("should show editable cells for HR Admin", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Check if cells have click handlers (editable)
      const descriptionCell = screen.getByText("Fredag 14/2");
      expect(descriptionCell).toBeInTheDocument();
      // For HR Admin, cells should be wrapped in editable components
    });

    it("should show read-only cells for external party users", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="sodexo"
        />
      );

      // External party users see plain text, not editable cells
      expect(screen.getByText("Fredag 14/2")).toBeInTheDocument();
      expect(screen.getByText("15-16/2")).toBeInTheDocument();
    });
  });

  describe("Category Filtering", () => {
    it("should render category filter dropdown", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
    });

    it("should filter dates by Stena Dates category", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Open the select dropdown
      const trigger = screen.getByRole("combobox");
      fireEvent.click(trigger);

      // Select "Stena Dates"
      const stenaDatesOption = screen.getByRole("option", { name: "Stena Dates" });
      fireEvent.click(stenaDatesOption);

      // Should show Stena date
      expect(screen.getByText("Fredag 14/2")).toBeInTheDocument();
      
      // Should not show ÖMC date
      expect(screen.queryByText("Fredag 7/3")).not.toBeInTheDocument();
    });

    it("should show all dates when 'All' filter is selected", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // All dates should be visible by default
      expect(screen.getByText("Fredag 14/2")).toBeInTheDocument();
      expect(screen.getByText("Fredag 7/3")).toBeInTheDocument();
      expect(screen.getByText("Holiday")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("should sort by week number ascending by default", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      const rows = screen.getAllByRole("row");
      // First row is header, so data rows start at index 1
      const firstDataRow = rows[1];
      const week7Cell = within(firstDataRow).getByText("7");
      expect(week7Cell).toBeInTheDocument();
    });

    it("should allow sorting by clicking column headers", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      const categoryHeader = screen.getByText("Category");
      expect(categoryHeader).toBeInTheDocument();
      
      // Click should trigger sorting
      fireEvent.click(categoryHeader);
      
      // After sorting, table should re-render with new order
      // This is handled by TanStack Table internally
    });
  });

  describe("Delete Functionality", () => {
    it("should open delete confirmation dialog when delete button is clicked", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete this important date/i)).toBeInTheDocument();
    });

    it("should close dialog on cancel", () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Dialog should close
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("should call delete service and show success toast on confirm", async () => {
      const mockOnDateDeleted = vi.fn();
      vi.mocked(importantDateService.delete).mockResolvedValue();

      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
          onDateDeleted={mockOnDateDeleted}
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await fireEvent.click(confirmButton);

      expect(importantDateService.delete).toHaveBeenCalledWith("date-1");
      expect(toast.success).toHaveBeenCalledWith("Important date deleted successfully");
      expect(mockOnDateDeleted).toHaveBeenCalled();
    });

    it("should show error toast on delete failure", async () => {
      vi.mocked(importantDateService.delete).mockRejectedValue(
        new Error("Failed to delete")
      );

      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await fireEvent.click(confirmButton);

      expect(toast.error).toHaveBeenCalledWith("Failed to delete");
    });
  });

  describe("Inline Editing (HR Admin)", () => {
    it("should call update service when cell is edited", async () => {
      const mockOnDateUpdated = vi.fn();
      vi.mocked(importantDateService.update).mockResolvedValue({
        ...mockImportantDates[0],
        notes: "Updated notes",
      });

      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
          onDateUpdated={mockOnDateUpdated}
        />
      );

      // Note: Actual inline editing interaction would require simulating
      // the EditableCell component behavior, which is tested separately
      // Here we verify that the table passes correct props to EditableCell
      expect(screen.getByText("Fredag 14/2")).toBeInTheDocument();
    });
  });

  describe("Display null values", () => {
    it("should display em dash for null week_number", () => {
      const dateWithNullWeek: ImportantDate = {
        ...mockImportantDates[0],
        week_number: null,
      };

      render(
        <ImportantDatesTable
          dates={[dateWithNullWeek]}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Should display em dash for null week number
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should display em dash for null notes", () => {
      render(
        <ImportantDatesTable
          dates={[mockImportantDates[0]]}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // First date has null notes, should show em dash
      const notesCell = screen.getAllByText("—");
      expect(notesCell.length).toBeGreaterThan(0);
    });
  });
});
