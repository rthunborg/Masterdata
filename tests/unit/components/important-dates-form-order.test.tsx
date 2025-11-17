/**
 * Component Tests for Important Dates Form Field Order
 * Story 11.10: PE3 Validation & UI Component Tests
 * AC3: Important Dates Form Field Order Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddImportantDateModal } from "@/components/dashboard/add-important-date-modal";
import { importantDateService } from "@/lib/services/important-date-service";
import { toast } from "sonner";
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

describe("Important Dates Form Field Order", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC3: Important Dates Form Field Order Tests", () => {
    it("should render category dropdown first", () => {
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Get all form fields
      const categoryField = screen.getByLabelText(/kategori/i);
      const dateField = screen.getByLabelText(/datumvärde/i);
      
      // Check that category appears before date in DOM order
      const form = categoryField.closest('form');
      expect(form).toBeTruthy();
      
      const formElements = Array.from(form?.querySelectorAll('label, input, select, [role="combobox"]') || []);
      const categoryIndex = formElements.findIndex(el => 
        el.textContent?.includes('Kategori') || 
        (el as HTMLElement).getAttribute('for')?.includes('category')
      );
      const dateIndex = formElements.findIndex(el => 
        el.textContent?.includes('Datumvärde') || 
        (el as HTMLElement).getAttribute('for')?.includes('date_value')
      );
      
      expect(categoryIndex).toBeGreaterThan(-1);
      expect(dateIndex).toBeGreaterThan(-1);
      expect(categoryIndex).toBeLessThan(dateIndex);
    });

    it("should render date picker second", () => {
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categoryField = screen.getByLabelText(/kategori/i);
      const dateField = screen.getByLabelText(/datumvärde/i);
      const timeField = screen.queryByLabelText(/tid/i);
      
      // Date should be after category
      const form = categoryField.closest('form');
      const formElements = Array.from(form?.querySelectorAll('[data-slot="form-item"]') || []);
      
      const categoryItem = formElements.find(el => 
        el.querySelector('label')?.textContent?.includes('Kategori')
      );
      const dateItem = formElements.find(el => 
        el.querySelector('label')?.textContent?.includes('Datumvärde')
      );
      
      expect(categoryItem).toBeTruthy();
      expect(dateItem).toBeTruthy();
      
      const categoryIndex = formElements.indexOf(categoryItem!);
      const dateIndex = formElements.indexOf(dateItem!);
      
      expect(dateIndex).toBeGreaterThan(categoryIndex);
    });

    it("should render time picker third (after date picker) for PE3 category", async () => {
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

      // Wait for time field to appear
      const timeField = await screen.findByLabelText(/tid/i);
      
      // Get all form items
      const form = categorySelect.closest('form');
      const formItems = Array.from(form?.querySelectorAll('[data-slot="form-item"]') || []);
      
      const categoryItem = formItems.find(el => 
        el.querySelector('label')?.textContent?.includes('Kategori')
      );
      const dateItem = formItems.find(el => 
        el.querySelector('label')?.textContent?.includes('Datumvärde')
      );
      const timeItem = formItems.find(el => 
        el.querySelector('label')?.textContent?.includes('Tid')
      );
      
      expect(categoryItem).toBeTruthy();
      expect(dateItem).toBeTruthy();
      expect(timeItem).toBeTruthy();
      
      const categoryIndex = formItems.indexOf(categoryItem!);
      const dateIndex = formItems.indexOf(dateItem!);
      const timeIndex = formItems.indexOf(timeItem!);
      
      // Category < Date < Time
      expect(dateIndex).toBeGreaterThan(categoryIndex);
      expect(timeIndex).toBeGreaterThan(dateIndex);
    });

    it("should only show time picker for PE3 category", async () => {
      const user = userEvent.setup();
      
      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Initially, time picker should not be visible (default is Stena Dates)
      expect(screen.queryByLabelText(/tid/i)).not.toBeInTheDocument();

      // Select PE3 category
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      // Time picker should now be visible
      const timeField = await screen.findByLabelText(/tid/i);
      expect(timeField).toBeInTheDocument();

      // Switch to another category
      await user.click(categorySelect);
      const stenaOption = screen.getByRole("option", { name: "Stena Dates" });
      await user.click(stenaOption);

      // Time picker should be hidden again
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.queryByLabelText(/tid/i)).not.toBeInTheDocument();
    });

    it("should render description field after time picker for PE3", async () => {
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

      // Wait for time field to appear
      await screen.findByLabelText(/tid/i);
      
      // Get all form items
      const form = categorySelect.closest('form');
      const formItems = Array.from(form?.querySelectorAll('[data-slot="form-item"]') || []);
      
      const timeItem = formItems.find(el => 
        el.querySelector('label')?.textContent?.includes('Tid')
      );
      const descriptionItem = formItems.find(el => 
        el.querySelector('label')?.textContent?.includes('Datumbeskrivning')
      );
      
      expect(timeItem).toBeTruthy();
      expect(descriptionItem).toBeTruthy();
      
      const timeIndex = formItems.indexOf(timeItem!);
      const descriptionIndex = formItems.indexOf(descriptionItem!);
      
      // Description should come after time
      expect(descriptionIndex).toBeGreaterThan(timeIndex);
    });

    it("should maintain correct field order: Category -> Date -> Time -> Description", async () => {
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

      // Wait for all fields
      await screen.findByLabelText(/tid/i);
      
      // Get all form items in order
      const form = categorySelect.closest('form');
      const formItems = Array.from(form?.querySelectorAll('[data-slot="form-item"]') || []);
      
      const getFieldIndex = (labelText: string) => {
        return formItems.findIndex(el => 
          el.querySelector('label')?.textContent?.toLowerCase().includes(labelText.toLowerCase())
        );
      };
      
      const categoryIndex = getFieldIndex('kategori');
      const dateIndex = getFieldIndex('datumvärde');
      const timeIndex = getFieldIndex('tid');
      const descriptionIndex = getFieldIndex('datumbeskrivning');
      
      // Verify all fields exist
      expect(categoryIndex).toBeGreaterThan(-1);
      expect(dateIndex).toBeGreaterThan(-1);
      expect(timeIndex).toBeGreaterThan(-1);
      expect(descriptionIndex).toBeGreaterThan(-1);
      
      // Verify order: Category < Date < Time < Description
      expect(dateIndex).toBeGreaterThan(categoryIndex);
      expect(timeIndex).toBeGreaterThan(dateIndex);
      expect(descriptionIndex).toBeGreaterThan(timeIndex);
    });
  });
});

