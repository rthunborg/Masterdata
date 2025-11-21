/**
 * Integration tests for view refresh prevention
 * Story 13.10: Prevent Unnecessary View Refreshes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableCell } from "@/components/dashboard/editable-cell";
import { EditableDateCell } from "@/components/dashboard/editable-date-cell";
import type { ImportantDate } from "@/lib/types/important-date";

describe("View Refresh Prevention - Integration Tests", () => {
  describe("EditableCell", () => {
    it("should not call onSave when value is unchanged", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditableCell
          value="test value"
          employeeId="emp-1"
          field="test_field"
          type="text"
          onSave={onSave}
        />
      );

      // Click to enter edit mode
      const cell = screen.getByText("test value");
      await user.click(cell);

      // Wait for input to appear
      const input = await screen.findByDisplayValue("test value");
      
      // Click outside without changing value
      await user.click(document.body);

      // Wait a bit for any async operations
      await waitFor(() => {
        expect(onSave).not.toHaveBeenCalled();
      });
    });

    it("should call onSave when value is changed", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditableCell
          value="original"
          employeeId="emp-1"
          field="test_field"
          type="text"
          onSave={onSave}
        />
      );

      // Click to enter edit mode
      const cell = screen.getByText("original");
      await user.click(cell);

      // Wait for input to appear and change value
      const input = await screen.findByDisplayValue("original");
      await user.clear(input);
      await user.type(input, "changed");

      // Click outside to save
      await user.click(document.body);

      // Wait for save to be called
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith("emp-1", "test_field", "changed");
      });
    });

    it("should cancel edit on Escape key without calling onSave", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditableCell
          value="original"
          employeeId="emp-1"
          field="test_field"
          type="text"
          onSave={onSave}
        />
      );

      // Click to enter edit mode
      const cell = screen.getByText("original");
      await user.click(cell);

      // Wait for input to appear
      const input = await screen.findByDisplayValue("original");
      
      // Press Escape
      await user.keyboard("{Escape}");

      // Wait a bit and verify onSave was not called
      await waitFor(() => {
        expect(onSave).not.toHaveBeenCalled();
      });
    });

    it("should handle whitespace-only changes as no change", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditableCell
          value="test"
          employeeId="emp-1"
          field="test_field"
          type="text"
          onSave={onSave}
        />
      );

      // Click to enter edit mode
      const cell = screen.getByText("test");
      await user.click(cell);

      // Wait for input to appear and add whitespace
      const input = await screen.findByDisplayValue("test");
      await user.clear(input);
      await user.type(input, "  test  ");

      // Click outside
      await user.click(document.body);

      // Wait and verify onSave was not called (whitespace trimmed)
      await waitFor(() => {
        expect(onSave).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe("EditableDateCell", () => {
    const mockDates: ImportantDate[] = [
      {
        id: "date-1",
        date_value: "2024-12-01",
        description: "Test Date 1",
        category: "Stena Dates",
        is_active: true,
        capacity: 10,
        remaining_spots: 5,
      },
      {
        id: "date-2",
        date_value: "2024-12-02",
        description: "Test Date 2",
        category: "Stena Dates",
        is_active: true,
        capacity: 10,
        remaining_spots: 5,
      },
    ];

    it("should not call onSave when same date is selected", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditableDateCell
          value="date-1"
          displayValue="Test Date 1"
          employeeId="emp-1"
          field="stena_date"
          dateCategory="Stena Dates"
          allDates={mockDates}
          onSave={onSave}
        />
      );

      // Click to enter edit mode
      const cell = screen.getByText("Test Date 1");
      await user.click(cell);

      // Wait for dropdown to appear and select the same date
      await waitFor(() => {
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
      });

      // Select the same date (date-1)
      const select = screen.getByRole("combobox");
      await user.click(select);
      
      // Wait for options and select the same value
      await waitFor(async () => {
        const option = screen.getByText("Test Date 1");
        await user.click(option);
      });

      // Wait a bit and verify onSave was not called
      await waitFor(() => {
        expect(onSave).not.toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it("should call onSave when different date is selected", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditableDateCell
          value="date-1"
          displayValue="Test Date 1"
          employeeId="emp-1"
          field="stena_date"
          dateCategory="Stena Dates"
          allDates={mockDates}
          onSave={onSave}
        />
      );

      // Click to enter edit mode
      const cell = screen.getByText("Test Date 1");
      await user.click(cell);

      // Wait for dropdown to appear
      await waitFor(() => {
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
      });

      // Select different date
      const select = screen.getByRole("combobox");
      await user.click(select);
      
      await waitFor(async () => {
        const option = screen.getByText("Test Date 2");
        await user.click(option);
      });

      // Wait for save to be called
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith("emp-1", "stena_date", "date-2");
      }, { timeout: 2000 });
    });
  });
});

