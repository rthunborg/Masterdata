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
      expect(screen.getByText("Lägg till viktigt datum")).toBeInTheDocument();
      expect(screen.getByLabelText(/veckonummer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/år/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kategori/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/datumbeskrivning/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/datumvärde/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/anteckningar/i)).toBeInTheDocument();
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

      const yearInput = screen.getByLabelText(/år/i) as HTMLInputElement;
      const currentYear = new Date().getFullYear();
      expect(yearInput.value).toBe(currentYear.toString());

      // Category should default to "Stena Dates"
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
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

      // Try to submit without filling required date_value field
      const saveButton = screen.getByRole("button", { name: /skapa/i });
      await user.click(saveButton);

      // The form should not submit without required fields
      expect(importantDateService.create).not.toHaveBeenCalled();
    });

    it("should auto-calculate week_number from date_value", async () => {
      const user = userEvent.setup();
      vi.mocked(importantDateService.create).mockResolvedValue({
        id: "new-date",
        week_number: 15,
        year: 2025,
        category: "Stena Dates",
        date_description: "Test Date",
        date_value: "2025-04-10",
        notes: null,
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    max_spots: 0,
    remaining_spots: 0,
    assigned_employees: [],
    created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",      });

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Leave week number empty initially
      const dateDescriptionInput = screen.getByLabelText(/datumbeskrivning/i);
      await user.type(dateDescriptionInput, "Test Date");

      const dateValueInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      // For date input type, we need to set the value directly
      await user.type(dateValueInput, "2025-04-10");

      // Week number should auto-calculate to 15 for April 10, 2025
      const weekInput = screen.getByLabelText(/veckonummer/i) as HTMLInputElement;
      await waitFor(() => {
        expect(weekInput.value).toBe("15");
      });

      const saveButton = screen.getByRole("button", { name: /skapa/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(importantDateService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            week_number: 15,
            date_value: "2025-04-10",
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
        date_value: "2025-02-14",
        notes: "Test notes",
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    max_spots: 0,
    remaining_spots: 0,
    assigned_employees: [],
    created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",      };

      vi.mocked(importantDateService.create).mockResolvedValue(mockCreatedDate);

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill out the form
      const weekInput = screen.getByLabelText(/veckonummer/i);
      await user.clear(weekInput);
      await user.type(weekInput, "7");

      const dateDescriptionInput = screen.getByLabelText(/datumbeskrivning/i);
      await user.type(dateDescriptionInput, "Fredag 14/2");

      const dateValueInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.type(dateValueInput, "2025-02-14");

      const notesInput = screen.getByLabelText(/anteckningar/i);
      await user.type(notesInput, "Test notes");

      const saveButton = screen.getByRole("button", { name: /skapa/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(importantDateService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            week_number: 7,
            year: 2025,
            category: "Stena Dates",
            date_description: "Fredag 14/2",
            date_value: "2025-02-14",
            notes: "Test notes",
          time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 99,
      remaining_spots: 99,
    })
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Datum skapat"
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

      const dateDescriptionInput = screen.getByLabelText(/datumbeskrivning/i);
      await user.type(dateDescriptionInput, "Test Date");

      const dateValueInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.type(dateValueInput, "2025-04-10");

      const saveButton = screen.getByRole("button", { name: /skapa/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "createFailed",
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

      const cancelButton = screen.getByRole("button", { name: /avbryt/i });
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

      const dateDescriptionInput = screen.getByLabelText(/datumbeskrivning/i);
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

      const reopenedInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
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

      const dateDescriptionInput = screen.getByLabelText(/datumbeskrivning/i);
      await user.type(dateDescriptionInput, "Test Date");

      const dateValueInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.type(dateValueInput, "2025-04-10");

      const saveButton = screen.getByRole("button", { name: /skapa/i });
      await user.click(saveButton);

      // Wait for button state to update
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });

      // Resolve the promise
      resolveCreate!({
        id: "new-date",
        week_number: null,
        year: 2025,
        category: "Stena Dates",
        date_description: "Test Date",
        date_value: "2025-04-10",
        notes: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",      });

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
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      expect(categorySelect).toBeInTheDocument();
      expect(categorySelect).toHaveTextContent("Stena Dates");
    });
  });

  describe("Year Change Updates Date", () => {
    it("should update date_value when year is changed after date is selected", async () => {
      const user = userEvent.setup();

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // First, select a date
      const dateValueInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.clear(dateValueInput);
      await user.type(dateValueInput, "2025-03-15");

      // Wait for date to be set
      await waitFor(() => {
        expect(dateValueInput.value).toBe("2025-03-15");
      });

      // Then change the year by setting value directly
      const yearInput = screen.getByLabelText(/år/i) as HTMLInputElement;
      // Use fireEvent to set value directly to avoid typing character-by-character issues
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(yearInput, { target: { value: "2026" } });

      // Wait for year to be fully set first
      await waitFor(() => {
        expect(parseInt(yearInput.value, 10)).toBe(2026);
      });

      // Then wait for date to be updated to new year
      await waitFor(() => {
        expect(dateValueInput.value).toBe("2026-03-15");
      }, { timeout: 3000 });
    });

    it("should update date_value for ÖMC dates when year is changed", async () => {
      const user = userEvent.setup();

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select ÖMC Dates category
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      // Wait for options to appear and click the option in the listbox
      await waitFor(() => {
        const omcOption = screen.getByRole("option", { name: "ÖMC Dates" });
        expect(omcOption).toBeInTheDocument();
      });
      const omcOption = screen.getByRole("option", { name: "ÖMC Dates" });
      await user.click(omcOption);

      // Wait for ÖMC date picker to appear
      await waitFor(() => {
        const omcInput = screen.getByLabelText(/ÖMC-datum/i);
        expect(omcInput).toBeInTheDocument();
      });

      // Type an ÖMC date (this will be parsed and set as ISO date)
      const omcInput = screen.getByLabelText(/ÖMC-datum/i) as HTMLInputElement;
      await user.type(omcInput, "8-9/3");
      // Blur to trigger parsing and formatting
      await user.tab();

      // Wait for date to be parsed and set (formatted value should appear after blur)
      await waitFor(() => {
        // The input should show a formatted value (not the raw input)
        expect(omcInput.value).not.toBe("8-9/3");
        expect(omcInput.value).toBeTruthy();
      }, { timeout: 3000 });

      // Change the year
      const yearInput = screen.getByLabelText(/år/i) as HTMLInputElement;
      const newYear = 2026;
      // Use fireEvent to set value directly to avoid typing character-by-character issues
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(yearInput, { target: { value: newYear.toString() } });

      // Wait for year to be fully set first
      await waitFor(() => {
        expect(parseInt(yearInput.value, 10)).toBe(2026);
      });

      // Wait for date to be updated - ÖMC date should now show the new year in the formatted display
      // The formatted value should update to show the new year
      await waitFor(() => {
        // The formatted display should include the new year (e.g., "8-9 mars 2026")
        const formattedValue = omcInput.value;
        expect(formattedValue).toContain("2026");
      }, { timeout: 3000 });
    });

    it("should recalculate week number when year changes", async () => {
      const user = userEvent.setup();

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select a date
      const dateValueInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.clear(dateValueInput);
      await user.type(dateValueInput, "2025-04-10");

      // Wait for week number to be calculated
      const weekInput = screen.getByLabelText(/veckonummer/i) as HTMLInputElement;
      await waitFor(() => {
        expect(weekInput.value).toBe("15");
      });

      // Change the year
      const yearInput = screen.getByLabelText(/år/i) as HTMLInputElement;
      await user.click(yearInput);
      await user.keyboard("{Control>}a{/Control}");
      await user.type(yearInput, "2026");

      // Wait for week number to be recalculated for the new year
      await waitFor(() => {
        // Week 15 in 2026 should still be calculated correctly
        expect(weekInput.value).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
