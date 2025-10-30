import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddImportantDateModal } from "@/components/dashboard/add-important-date-modal";
import { importantDateService } from "@/lib/services/important-date-service";
import { toast } from "sonner";
import type { ImportantDate } from "@/lib/types/important-date";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";

// Mock the important date service
vi.mock("@/lib/services/important-date-service", () => ({
  importantDateService: {
    create: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AddImportantDateModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render modal with all form fields when open", () => {
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Add Important Date")).toBeInTheDocument();
      expect(screen.getByLabelText(/week number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it("should not render modal when isOpen is false", () => {
      renderWithI18n(
        <AddImportantDateModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should have default values for year and category", () => {
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const yearInput = screen.getByLabelText(/year/i) as HTMLInputElement;
      const currentYear = new Date().getFullYear();
      expect(yearInput.value).toBe(currentYear.toString());

      // Category should default to "Stena Dates"
      const categorySelect = screen.getByRole("combobox", { name: /category/i });
      expect(categorySelect).toHaveTextContent("Stena Dates");
    });
  });

  describe("Form Validation", () => {
    it("should display validation errors for required fields", async () => {
      const user = userEvent.setup();

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const saveButton = screen.getByRole("button", { name: /create/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/date description is required/i)).toBeInTheDocument();
        expect(screen.getByText(/date value is required/i)).toBeInTheDocument();
      });

      expect(importantDateService.create).not.toHaveBeenCalled();
    });

    it("should accept null week_number", async () => {
      const user = userEvent.setup();
      vi.mocked(importantDateService.create).mockResolvedValue({
        id: "new-date",
        week_number: null,
        year: 2025,
        category: "Stena Dates",
        date_description: "Test Date",
        date_value: "10/4",
        notes: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      });

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Leave week number empty
      const dateDescriptionInput = screen.getByLabelText(/date description/i);
      await user.type(dateDescriptionInput, "Test Date");

      const dateValueInput = screen.getByLabelText(/date value/i);
      await user.type(dateValueInput, "10/4");

      const saveButton = screen.getByRole("button", { name: /create/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(importantDateService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            week_number: null,
            date_description: "Test Date",
            date_value: "10/4",
          })
        );
      });
    });
  });

  describe("Form Submission", () => {
    it("should call importantDateService.create with correct data on successful submission", async () => {
      const user = userEvent.setup();
      const mockCreatedDate = {
        id: "new-date",
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Fredag 14/2",
        date_value: "15-16/2",
        notes: "Test notes",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.mocked(importantDateService.create).mockResolvedValue(mockCreatedDate);

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill out the form
      const weekInput = screen.getByLabelText(/week number/i);
      await user.clear(weekInput);
      await user.type(weekInput, "7");

      const dateDescriptionInput = screen.getByLabelText(/date description/i);
      await user.type(dateDescriptionInput, "Fredag 14/2");

      const dateValueInput = screen.getByLabelText(/date value/i);
      await user.type(dateValueInput, "15-16/2");

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, "Test notes");

      const saveButton = screen.getByRole("button", { name: /create/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(importantDateService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            week_number: 7,
            year: 2025,
            category: "Stena Dates",
            date_description: "Fredag 14/2",
            date_value: "15-16/2",
            notes: "Test notes",
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Important date "Fredag 14/2" created successfully'
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should display error toast on submission failure", async () => {
      const user = userEvent.setup();
      vi.mocked(importantDateService.create).mockRejectedValue(
        new Error("Network error")
      );

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const dateDescriptionInput = screen.getByLabelText(/date description/i);
      await user.type(dateDescriptionInput, "Test Date");

      const dateValueInput = screen.getByLabelText(/date value/i);
      await user.type(dateValueInput, "10/4");

      const saveButton = screen.getByRole("button", { name: /create/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to create important date",
          expect.objectContaining({
            description: "Network error",
          })
        );
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Modal Behavior", () => {
    it("should close modal on cancel button click", async () => {
      const user = userEvent.setup();

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("should reset form when modal is closed and reopened", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const dateDescriptionInput = screen.getByLabelText(/date description/i);
      await user.type(dateDescriptionInput, "Test input");

      // Close modal
      rerender(
        <AddImportantDateModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Reopen modal
      rerender(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const reopenedInput = screen.getByLabelText(/date description/i) as HTMLInputElement;
      expect(reopenedInput.value).toBe("");
    });

    it("should disable save button while submitting", async () => {
      const user = userEvent.setup();
      let resolveCreate: (value: unknown) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });

      vi.mocked(importantDateService.create).mockReturnValue(createPromise as Promise<ImportantDate>);

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const dateDescriptionInput = screen.getByLabelText(/date description/i);
      await user.type(dateDescriptionInput, "Test Date");

      const dateValueInput = screen.getByLabelText(/date value/i);
      await user.type(dateValueInput, "10/4");

      const saveButton = screen.getByRole("button", { name: /create/i });
      await user.click(saveButton);

      // Button should be disabled during submission
      expect(saveButton).toBeDisabled();

      // Resolve the promise
      resolveCreate!({
        id: "new-date",
        week_number: null,
        year: 2025,
        category: "Stena Dates",
        date_description: "Test Date",
        date_value: "10/4",
        notes: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Category Selection", () => {
    it("should render category field with default value", () => {
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Verify category field is present with default value "Stena Dates"
      const categorySelect = screen.getByRole("combobox", { name: /category/i });
      expect(categorySelect).toBeInTheDocument();
      expect(categorySelect).toHaveTextContent("Stena Dates");
    });
  });
});
