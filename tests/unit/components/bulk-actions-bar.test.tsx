/**
 * BulkActionsBar Component Tests
 *
 * Tests that the archive/restore buttons are only visible to HR Admin users.
 */

import { screen, fireEvent } from "@testing-library/react";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import { describe, it, expect, vi } from "vitest";
import { BulkActionsBar } from "@/components/dashboard/bulk-actions-bar";

describe("BulkActionsBar", () => {
  const mockOnArchive = vi.fn();
  const mockOnRestore = vi.fn();
  const mockOnClear = vi.fn();

  describe("Visibility", () => {
    it("should not render when no employees are selected", () => {
      const { container } = renderWithI18n(
        <BulkActionsBar
          selectedCount={0}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={true}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render when employees are selected", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={3}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={true}
        />
      );

      expect(screen.getByText("3 selected")).toBeInTheDocument();
    });
  });

  describe("HR Admin Only - Archive/Restore Buttons", () => {
    it("should show Archive button for HR Admin in normal view", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={true}
        />
      );

      expect(screen.getByText("Archive Selected")).toBeInTheDocument();
      expect(screen.queryByText("Restore Selected")).not.toBeInTheDocument();
    });

    it("should show Restore button for HR Admin in archived view", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={true}
          isHRAdmin={true}
        />
      );

      expect(screen.getByText("Restore Selected")).toBeInTheDocument();
      expect(screen.queryByText("Archive Selected")).not.toBeInTheDocument();
    });

    it("should NOT show Archive button for non-HR Admin users", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={false}
        />
      );

      expect(screen.getByText("2 selected")).toBeInTheDocument();
      expect(screen.queryByText("Archive Selected")).not.toBeInTheDocument();
      expect(screen.queryByText("Restore Selected")).not.toBeInTheDocument();
    });

    it("should NOT show Restore button for non-HR Admin users in archived view", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={true}
          isHRAdmin={false}
        />
      );

      expect(screen.getByText("2 selected")).toBeInTheDocument();
      expect(screen.queryByText("Archive Selected")).not.toBeInTheDocument();
      expect(screen.queryByText("Restore Selected")).not.toBeInTheDocument();
    });

    it("should default isHRAdmin to false when not provided", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
        />
      );

      // Without isHRAdmin prop, should default to false and hide buttons
      expect(screen.getByText("2 selected")).toBeInTheDocument();
      expect(screen.queryByText("Archive Selected")).not.toBeInTheDocument();
    });
  });

  describe("Clear Selection", () => {
    it("should always show clear button regardless of isHRAdmin", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={false}
        />
      );

      // Clear button should be visible for all users
      const clearButton = screen.getByRole("button", { name: /clear selection/i });
      expect(clearButton).toBeInTheDocument();
    });

    it("should call onClear when clear button is clicked", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={false}
        />
      );

      const clearButton = screen.getByRole("button", { name: /clear selection/i });
      fireEvent.click(clearButton);

      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  describe("Button Callbacks", () => {
    it("should call onArchive when Archive button is clicked", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={true}
        />
      );

      const archiveButton = screen.getByText("Archive Selected");
      fireEvent.click(archiveButton);

      expect(mockOnArchive).toHaveBeenCalled();
    });

    it("should call onRestore when Restore button is clicked", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={true}
          isHRAdmin={true}
        />
      );

      const restoreButton = screen.getByText("Restore Selected");
      fireEvent.click(restoreButton);

      expect(mockOnRestore).toHaveBeenCalled();
    });
  });

  describe("Processing State", () => {
    it("should disable Archive button when processing", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={false}
          isHRAdmin={true}
          isProcessing={true}
        />
      );

      const archiveButton = screen.getByText("Archive Selected").closest("button");
      expect(archiveButton).toBeDisabled();
    });

    it("should disable Restore button when processing", () => {
      renderWithI18n(
        <BulkActionsBar
          selectedCount={2}
          onArchive={mockOnArchive}
          onRestore={mockOnRestore}
          onClear={mockOnClear}
          isArchivedView={true}
          isHRAdmin={true}
          isProcessing={true}
        />
      );

      const restoreButton = screen.getByText("Restore Selected").closest("button");
      expect(restoreButton).toBeDisabled();
    });
  });
});
