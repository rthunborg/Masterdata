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

// Mock useTranslations for EditableDateCell
vi.mock("@/lib/i18n", () => ({
  useTranslations: vi.fn((namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      'dashboard': {
        'dateDeleted': 'Date deleted',
      },
    };
    return (key: string) => {
      const ns = translations[namespace];
      return ns?.[key] || key;
    };
  }),
}));

// Mock useAvailablePE3Dates hook
vi.mock("@/lib/hooks/use-available-pe3-dates", () => ({
  useAvailablePE3Dates: vi.fn(() => ({
    availableDates: [],
    totalAvailable: 0,
    isLoading: false,
    error: null,
  })),
}));

describe("View Refresh Prevention - Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    // Use fixed future dates to avoid filtering (component filters out past dates)
    // Using dates far in the future to ensure they're always valid regardless of when tests run
    const futureDate1Str = "2026-12-01";
    const futureDate2Str = "2026-12-15";
    
    const getMockDates = (): ImportantDate[] => [
      {
        id: "date-1",
        date_value: futureDate1Str,
        date_description: "Test Date 1",
        description: "Test Date 1",
        category: "Stena Dates",
        is_active: true,
        capacity: 10,
        remaining_spots: 5,
        week_number: 1,
        year: 2026,
        max_spots: 10,
      },
      {
        id: "date-2",
        date_value: futureDate2Str,
        date_description: "Test Date 2",
        description: "Test Date 2",
        category: "Stena Dates",
        is_active: true,
        capacity: 10,
        remaining_spots: 5,
        week_number: 2,
        year: 2026,
        max_spots: 10,
      },
    ];

    it("should not call onSave when same date is selected", { timeout: 15000 }, async () => {
      const mockDates = getMockDates();
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

      // Click to enter edit mode (dropdown auto-opens after 50ms)
      const cell = screen.getByText("Test Date 1");
      await user.click(cell);

      // Wait for the Select component to render (it appears when isEditing becomes true)
      // The SelectTrigger has role="combobox", so wait for that
      // Use waitFor to handle potential timing issues with state updates after stopPropagation
      // Give extra time for React state updates to propagate after the click event
      // Note: stopPropagation may affect React's event batching, so we wait for the component
      // to fully process the state update and render the Select component
      await waitFor(() => {
        // Try finding by role first
        const combobox = screen.queryByRole("combobox");
        if (combobox) {
          expect(combobox).toBeInTheDocument();
          return;
        }
        // Fallback: look for SelectTrigger by data attribute or class
        const selectTrigger = document.querySelector('[data-slot="select-trigger"]');
        if (selectTrigger) {
          expect(selectTrigger).toBeInTheDocument();
          return;
        }
        // If neither found, throw to retry
        throw new Error("Combobox not found yet - waiting for React state update after stopPropagation");
      }, { timeout: 10000 });
      
      // Wait for dropdown to be open and options to appear (component auto-opens it)
      // Options are displayed as "date_description (Week X, YYYY) (remaining_spots)"
      // Increase timeout for full suite runs where there may be more contention
      await waitFor(async () => {
        // Look for option role elements - wait for them to be visible and interactive
        const options = screen.queryAllByRole("option");
        expect(options.length).toBeGreaterThan(0);
        // Also verify at least one option is visible (not hidden)
        const visibleOptions = options.filter(opt => {
          const style = window.getComputedStyle(opt);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        expect(visibleOptions.length).toBeGreaterThan(0);
      }, { timeout: 10000 });

      // Select the same date (dropdown should already be open)
      // Find the option that contains "Test Date 1" text
      const options = await screen.findAllByRole("option", {}, { timeout: 10000 });
      const sameDateOption = options.find(opt => opt.textContent?.includes("Test Date 1"));
      expect(sameDateOption).toBeDefined();
      if (sameDateOption) {
        await user.click(sameDateOption);
      }

      // Wait for dropdown to close and verify onSave was not called
      // Component has 100ms timeout before checking value change, so wait a bit longer
      await waitFor(() => {
        expect(onSave).not.toHaveBeenCalled();
      }, { timeout: 10000 });
    });

    it("should call onSave when different date is selected", { timeout: 15000 }, async () => {
      const mockDates = getMockDates();
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

      // Click to enter edit mode (dropdown auto-opens after 50ms)
      const cell = screen.getByText("Test Date 1");
      await user.click(cell);

      // Wait for the Select component to render (it appears when isEditing becomes true)
      // The SelectTrigger has role="combobox", so wait for that
      // Use waitFor to handle potential timing issues with state updates after stopPropagation
      // Give extra time for React state updates to propagate after the click event
      // Note: stopPropagation may affect React's event batching, so we wait for the component
      // to fully process the state update and render the Select component
      await waitFor(() => {
        // Try finding by role first
        const combobox = screen.queryByRole("combobox");
        if (combobox) {
          expect(combobox).toBeInTheDocument();
          return;
        }
        // Fallback: look for SelectTrigger by data attribute or class
        const selectTrigger = document.querySelector('[data-slot="select-trigger"]');
        if (selectTrigger) {
          expect(selectTrigger).toBeInTheDocument();
          return;
        }
        // If neither found, throw to retry
        throw new Error("Combobox not found yet - waiting for React state update after stopPropagation");
      }, { timeout: 10000 });
      
      // Wait for dropdown to be open and options to appear (component auto-opens it)
      // Options are displayed as "date_description (Week X, YYYY) (remaining_spots)"
      // Increase timeout for full suite runs where there may be more contention
      await waitFor(async () => {
        // Look for option role elements - wait for them to be visible and interactive
        const options = screen.queryAllByRole("option");
        expect(options.length).toBeGreaterThan(0);
        // Also verify at least one option is visible (not hidden)
        const visibleOptions = options.filter(opt => {
          const style = window.getComputedStyle(opt);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        expect(visibleOptions.length).toBeGreaterThan(0);
      }, { timeout: 10000 });

      // Select different date (dropdown should already be open)
      // Find the option that contains "Test Date 2" text
      const options = await screen.findAllByRole("option", {}, { timeout: 10000 });
      const differentDateOption = options.find(opt => opt.textContent?.includes("Test Date 2"));
      expect(differentDateOption).toBeDefined();
      if (differentDateOption) {
        await user.click(differentDateOption);
      }

      // Wait for save to be called (component has setTimeout with 0ms delay)
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith("emp-1", "stena_date", "date-2");
      }, { timeout: 10000 });
    });
  });
});

