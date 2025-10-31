/**
 * Unit Tests for AddColumnModal Component
 * Story 6.6: Column Management UX Improvements - Add Column Modal
 *
 * Tests cover:
 * - Modal rendering and visibility
 * - Form field rendering and validation
 * - Submit success flow
 * - Error handling
 * - Cancel/close behavior
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddColumnModal } from "@/components/admin/add-column-modal";
import { columnService } from "@/lib/services/column-service";
import { toast } from "sonner";

// Mock dependencies
vi.mock("@/lib/services/column-service");
vi.mock("sonner");
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "addColumn": "Add Column",
      "addColumnDescription": "Create a new custom column for employee data",
      "columnName": "Column Name",
      "dataType": "Data Type",
      "category": "Category",
      "createColumn": "Create Column",
      "cancel": "Cancel",
      "text": "Text",
      "number": "Number",
      "date": "Date",
      "boolean": "Boolean",
    };
    return translations[key] || key;
  },
}));

describe("AddColumnModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when closed", () => {
    render(
      <AddColumnModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText("Add Column")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Add Column")).toBeInTheDocument();
    expect(screen.getByText(/create a new custom column/i)).toBeInTheDocument();
  });

  it("should render all form fields", () => {
    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText("Column Name")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /data type/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
  });

  it("should have Create and Cancel buttons", () => {
    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole("button", { name: /create column/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    
    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    
    vi.mocked(columnService.createColumn).mockResolvedValue({
      id: "new-col-1",
      column_name: "Test Column",
      column_type: "text",
      category: null,
      is_masterdata: false,
      display_order: 100,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      },
      created_at: new Date().toISOString(),
    });

    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill out form
    const columnNameInput = screen.getByLabelText("Column Name");
    await user.type(columnNameInput, "Test Column");

    // Submit form
    const submitButton = screen.getByRole("button", { name: /create column/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(columnService.createColumn).toHaveBeenCalledWith({
        column_name: "Test Column",
        column_type: "text",
        category: null,
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Column "Test Column" created successfully');
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should handle submission errors", async () => {
    const user = userEvent.setup();
    
    const errorMessage = "Column with name 'Test Column' already exists";
    vi.mocked(columnService.createColumn).mockRejectedValue(new Error(errorMessage));

    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const columnNameInput = screen.getByLabelText("Column Name");
    await user.type(columnNameInput, "Test Column");

    const submitButton = screen.getByRole("button", { name: /create column/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should validate required column name", async () => {
    const user = userEvent.setup();

    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Try to submit without filling column name
    const submitButton = screen.getByRole("button", { name: /create column/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/column name is required/i)).toBeInTheDocument();
    });

    expect(columnService.createColumn).not.toHaveBeenCalled();
  });

  it("should reset form after successful submission", async () => {
    const user = userEvent.setup();
    
    vi.mocked(columnService.createColumn).mockResolvedValue({
      id: "new-col-1",
      column_name: "Test Column",
      column_type: "text",
      category: null,
      is_masterdata: false,
      display_order: 100,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      },
      created_at: new Date().toISOString(),
    });

    const { rerender } = render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const columnNameInput = screen.getByLabelText("Column Name") as HTMLInputElement;
    await user.type(columnNameInput, "Test Column");

    const submitButton = screen.getByRole("button", { name: /create column/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    // Re-open modal
    rerender(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Form should be reset
    const resetInput = screen.getByLabelText("Column Name") as HTMLInputElement;
    expect(resetInput.value).toBe("");
  });

  it("should include category in submission if provided", async () => {
    const user = userEvent.setup();
    
    vi.mocked(columnService.createColumn).mockResolvedValue({
      id: "new-col-1",
      column_name: "Test Column",
      column_type: "text",
      category: "Test Category",
      is_masterdata: false,
      display_order: 100,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      },
      created_at: new Date().toISOString(),
    });

    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const columnNameInput = screen.getByLabelText("Column Name");
    await user.type(columnNameInput, "Test Column");

    const categoryInput = screen.getByLabelText("Category");
    await user.type(categoryInput, "Test Category");

    const submitButton = screen.getByRole("button", { name: /create column/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(columnService.createColumn).toHaveBeenCalledWith({
        column_name: "Test Column",
        column_type: "text",
        category: "Test Category",
      });
    });
  });

  it("should disable submit button while submitting", async () => {
    const user = userEvent.setup();
    
    // Mock a slow response
    vi.mocked(columnService.createColumn).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <AddColumnModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const columnNameInput = screen.getByLabelText("Column Name");
    await user.type(columnNameInput, "Test Column");

    const submitButton = screen.getByRole("button", { name: /create column/i });
    await user.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
  });
});