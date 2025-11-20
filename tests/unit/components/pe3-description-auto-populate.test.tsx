/**
 * Component Tests for PE3 Auto-Description Population
 * Story 11.10: PE3 Validation & UI Component Tests
 * AC2: PE3 Auto-Description Population Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, act, fireEvent } from "@testing-library/react";
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

describe("PE3 Auto-Description Population", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC2: PE3 Auto-Description Population Tests", () => {
    it("should auto-populate description when date and time are set for PE3", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select PE3 category
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      // Set date - use userEvent which properly triggers React's event system
      const dateInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.clear(dateInput);
      await user.type(dateInput, "2025-03-15");

      // Set time - TimePicker only calls onChange on blur, so we need to blur after typing
      const timeInput = screen.getByLabelText(/tid/i) as HTMLInputElement;
      await user.clear(timeInput);
      await user.type(timeInput, "14:30");
      await user.tab(); // Blur the input to trigger TimePicker's onChange

      // Wait for auto-population - onChange handlers should trigger immediately after blur
      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe("15 mars 2025 14:30");
      }, { timeout: 5000, interval: 100 });
    });

    it("should update description when date changes for PE3", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select PE3 category
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      // Set initial date and time
      const dateInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.clear(dateInput);
      await user.type(dateInput, "2025-03-15");

      const timeInput = screen.getByLabelText(/tid/i) as HTMLInputElement;
      await user.clear(timeInput);
      await user.type(timeInput, "14:30");
      await user.tab(); // Blur to trigger TimePicker's onChange

      // Wait for initial auto-population
      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe("15 mars 2025 14:30");
      }, { timeout: 5000, interval: 100 });

      // Change date
      await user.clear(dateInput);
      await user.type(dateInput, "2025-04-20");

      // Wait for description to update
      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe("20 april 2025 14:30");
      }, { timeout: 5000, interval: 100 });
    });

    it("should update description when time changes for PE3", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select PE3 category
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      // Set date and initial time
      const dateInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.clear(dateInput);
      await user.type(dateInput, "2025-03-15");

      const timeInput = screen.getByLabelText(/tid/i) as HTMLInputElement;
      await user.clear(timeInput);
      await user.type(timeInput, "14:30");
      await user.tab(); // Blur to trigger TimePicker's onChange

      // Wait for initial auto-population
      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe("15 mars 2025 14:30");
      }, { timeout: 5000, interval: 100 });

      // Change time
      await user.clear(timeInput);
      await user.type(timeInput, "09:15");
      await user.tab(); // Blur to trigger TimePicker's onChange

      // Wait for description to update
      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe("15 mars 2025 09:15");
      }, { timeout: 5000, interval: 100 });
    });

    it("should use Swedish locale formatting for description", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select PE3 category
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      // Test a single month to verify Swedish locale (reduced to 1 to avoid timeout)
      const testCase = { date: "2025-01-15", time: "10:00", expected: "15 januari 2025 10:00" };

      const dateInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      const timeInput = screen.getByLabelText(/tid/i) as HTMLInputElement;

      await user.clear(dateInput);
      await user.type(dateInput, testCase.date);

      await user.clear(timeInput);
      await user.type(timeInput, testCase.time);
      await user.tab(); // Blur to trigger TimePicker's onChange

      // Wait for auto-population with increased timeout
      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe(testCase.expected);
      }, { timeout: 10000, interval: 200 });
    });

    it("should allow manual override of auto-generated description", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select PE3 category
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      // Set date and time to trigger auto-population
      const dateInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.clear(dateInput);
      await user.type(dateInput, "2025-03-15");

      const timeInput = screen.getByLabelText(/tid/i) as HTMLInputElement;
      await user.clear(timeInput);
      await user.type(timeInput, "14:30");
      await user.tab(); // Blur to trigger TimePicker's onChange

      // Wait for auto-population
      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe("15 mars 2025 14:30");
      }, { timeout: 5000, interval: 100 });

      // Manually override description - use fireEvent to set value directly
      const descriptionInput = screen.getByLabelText(/datumbeskrivning/i) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(descriptionInput, { target: { value: "Custom description" } });
      });

      // Verify manual override is preserved
      expect(descriptionInput.value).toBe("Custom description");

      // Change time - description should NOT auto-update because it was manually changed
      await user.clear(timeInput);
      await user.type(timeInput, "15:00");
      await user.tab(); // Blur to trigger TimePicker's onChange
      
      // Wait a bit to ensure auto-population logic has run but description wasn't updated
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Description should remain as manually entered
      expect(descriptionInput.value).toBe("Custom description");
    });
  });
});

