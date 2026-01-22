/**
 * Component Tests for Talmundo Field
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC2: Talmundo Editability Tests (Component Tests)
 * 
 * Business Rule: Talmundo field can only be edited after 00:01 AM the calendar day
 * after the One field was marked as complete.
 */

import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";

describe("Talmundo Field - Component Tests", () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when One field is false", () => {
    it("should show lock icon and disable editing", () => {
      vi.setSystemTime(new Date('2025-01-16T15:00:00'));
      
      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={false}
          oneMarkedAt={null}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-gray-100");
      expect(cell).toHaveClass("cursor-not-allowed");

      // Field should be read-only
      fireEvent.click(cell);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("should show tooltip with lock message when clicked", async () => {
      vi.setSystemTime(new Date('2025-01-16T15:00:00'));
      
      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={false}
          oneMarkedAt={null}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      fireEvent.click(cell);

      // Use real timers for async operations
      vi.useRealTimers();
      await waitFor(() => {
        const tooltips = screen.getAllByText(/Kan endast redigeras efter One-fältet har slutfört 24-timmars synkronisering till Talmundo-systemet/i);
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });
  });

  describe("when One field is true but before unlock time (00:01 AM next day)", () => {
    it("should show lock icon and disable editing", () => {
      // Current time: Jan 16 at 10 PM
      vi.setSystemTime(new Date('2025-01-16T22:00:00'));
      // Marked at 3 PM today - unlock is Jan 17 00:01 AM
      const markedAt = '2025-01-16T15:00:00';

      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={markedAt}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("bg-gray-100");
      expect(cell).toHaveClass("cursor-not-allowed");

      // Field should be read-only
      fireEvent.click(cell);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("should show tooltip with timer countdown message", async () => {
      // Current time: Jan 16 at 10 PM
      vi.setSystemTime(new Date('2025-01-16T22:00:00'));
      // Marked at 3 PM today - unlock is Jan 17 00:01 AM
      const markedAt = '2025-01-16T15:00:00';

      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={markedAt}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      fireEvent.click(cell);

      // Use real timers for async operations
      vi.useRealTimers();
      await waitFor(() => {
        const tooltips = screen.getAllByText(/Kan endast redigeras efter One-fältet har slutfört 24-timmars synkronisering till Talmundo-systemet/i);
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });
  });

  describe("when One field is true and past unlock time (00:01 AM next day)", () => {
    it("should enable editing", () => {
      // Current time: Jan 17 at 10 AM
      vi.setSystemTime(new Date('2025-01-17T10:00:00'));
      // Marked yesterday at 3 PM - unlock was Jan 17 00:01 AM
      const markedAt = '2025-01-16T15:00:00';

      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={markedAt}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).not.toHaveClass("bg-gray-50");

      // Should be able to click and edit
      fireEvent.click(cell);
      // Check for combobox, allowing hidden just in case
      expect(screen.getByRole("combobox", { hidden: true })).toBeInTheDocument();
    });

    it("should allow value updates when editable", async () => {
      // Current time: Jan 17 at 10 AM
      vi.setSystemTime(new Date('2025-01-17T10:00:00'));
      // Marked yesterday at 3 PM - unlock was Jan 17 00:01 AM
      const markedAt = '2025-01-16T15:00:00';

      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={markedAt}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      fireEvent.click(cell);

      // Use hidden: true because sometimes Radix UI select trigger might be considered hidden when open
      const combobox = screen.getByRole("combobox", { hidden: true });
      fireEvent.click(combobox);

      // Use real timers for async operations
      vi.useRealTimers();
      const option = await screen.findByText("Klart");
      fireEvent.click(option);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith("emp-1", "talmundo", true);
      });
    });
  });
});

