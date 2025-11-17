/**
 * Component Tests for Talmundo Field
 * Story 11.4: Field Validation & Prerequisites Tests
 * AC2: Talmundo Editability Tests (Component Tests)
 */

import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";
import { setOneDateWithTimer } from "@/../tests/helpers/validation-test-helpers";

describe("Talmundo Field - Component Tests", () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when One field is false", () => {
    it("should show lock icon and disable editing", () => {
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

      await waitFor(() => {
        const tooltips = screen.getAllByText(/Can only be edited after One field completes 24-hour sync/i);
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });
  });

  describe("when One field is true but <24h elapsed", () => {
    it("should show lock icon and disable editing", () => {
      const oneData = setOneDateWithTimer(12); // 12 hours ago
      
      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={oneData.one_marked_at}
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
      const oneData = setOneDateWithTimer(12); // 12 hours ago
      
      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={oneData.one_marked_at}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      fireEvent.click(cell);

      await waitFor(() => {
        const tooltips = screen.getAllByText(/Can only be edited after One field completes 24-hour sync/i);
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });
  });

  describe("when One field is true and ≥24h elapsed", () => {
    it("should enable editing", () => {
      const oneData = setOneDateWithTimer(25); // 25 hours ago
      
      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={oneData.one_marked_at}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      expect(cell).not.toHaveClass("bg-gray-50");
      
      // Should be able to click and edit
      fireEvent.click(cell);
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("should allow value updates when editable", async () => {
      const oneData = setOneDateWithTimer(25); // 25 hours ago
      
      renderWithI18n(
        <EditableCell
          value={false}
          employeeId="emp-1"
          field="talmundo"
          type="boolean"
          canEdit={true}
          oneValue={true}
          oneMarkedAt={oneData.one_marked_at}
          onSave={mockOnSave}
        />
      );

      const cell = screen.getByRole("gridcell");
      fireEvent.click(cell);

      const checkbox = await screen.findByRole("checkbox");
      fireEvent.click(checkbox);

      // Press Enter to save
      fireEvent.keyDown(checkbox, { key: "Enter" });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith("emp-1", "talmundo", true);
      });
    });
  });
});

