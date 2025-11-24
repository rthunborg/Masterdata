/**
 * Integration Tests for Form Validation Workflows
 * Story 11.10: PE3 Validation & UI Component Tests
 * AC6: Form Validation Integration Tests
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddImportantDateModal } from "@/components/dashboard/add-important-date-modal";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";
import { importantDateService } from "@/lib/services/important-date-service";
import { employeeService } from "@/lib/services/employee-service";
import { toast } from "sonner";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";

// Mock services
vi.mock("@/lib/services/important-date-service", () => ({
  importantDateService: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    create: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase client for hooks
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock fetch for hooks that use it
global.fetch = vi.fn();

describe("Form Validation Integration Workflows", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return empty data for hooks
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
      text: async () => "",
      status: 200,
      statusText: "OK",
    } as Response);
  });

  describe("AC6: Form Validation Integration Tests", () => {
    it("should validate PE3 time before submission", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      const mockCreate = vi.mocked(importantDateService.create);
      mockCreate.mockRejectedValue(new Error("Validation failed"));

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

      // Set date but NOT time
      const dateInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.type(dateInput, "2025-03-15");

      // Try to submit without time
      const submitButton = screen.getByRole("button", { name: /skapa|create/i });
      await user.click(submitButton);

      // Should show validation error, not call API
      await waitFor(() => {
        const errors = screen.queryAllByText(/time is required|tid.*obligatorisk/i);
        expect(errors.length).toBeGreaterThan(0);
      });

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should validate all required fields in employee creation", async () => {
      const user = userEvent.setup();

      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Try to submit without filling required fields
      // Button text is "Spara" (Save) in Swedish, not "Create"
      const submitButton = screen.getByRole("button", { name: /spara|save/i });
      await user.click(submitButton);

      // Should show validation errors for required fields
      await waitFor(() => {
        // Check for common required field errors
        const errors = screen.queryAllByText(/required|obligatorisk|krävs/i);
        expect(errors.length).toBeGreaterThan(0);
      });

      expect(employeeService.create).not.toHaveBeenCalled();
    });

    it("should display validation errors in correct locations", { timeout: 15000 }, async () => {
      const user = userEvent.setup();

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select PE3 and try to submit without time
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      const dateInput = screen.getByLabelText(/datumvärde/i);
      await user.type(dateInput, "2025-03-15");

      const submitButton = screen.getByRole("button", { name: /skapa|create/i });
      await user.click(submitButton);

      // Error should be displayed near the time field
      await waitFor(() => {
        const timeField = screen.queryByLabelText(/tid/i);
        if (timeField) {
          const errorMessage = timeField.closest('[data-slot="form-item"]')?.querySelector('[role="alert"], .text-destructive');
          expect(errorMessage).toBeTruthy();
        }
      });
    });

    it("should block invalid submissions before API calls", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      const mockCreate = vi.mocked(importantDateService.create);

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Select PE3 and set invalid data (no time)
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      const dateInput = screen.getByLabelText(/datumvärde/i);
      await user.type(dateInput, "2025-03-15");

      const submitButton = screen.getByRole("button", { name: /skapa|create/i });
      await user.click(submitButton);

      // Wait a bit to ensure API is not called
      await new Promise(resolve => setTimeout(resolve, 500));

      // API should not be called for invalid data
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should trigger correct API calls for valid submissions", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      const mockCreate = vi.mocked(importantDateService.create);
      
      const mockCreatedDate = {
        id: "date-1",
        category: "PE3 Dates",
        date_value: "2025-03-15",
        time_value: "14:30",
        year: 2025,
        date_description: "15 mars 14:30",
        // ... other fields
      } as any;

      mockCreate.mockResolvedValue(mockCreatedDate);

      renderWithI18n(
        <AddImportantDateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill all required fields correctly
      const categorySelect = screen.getByRole("combobox", { name: /kategori/i });
      await user.click(categorySelect);
      const pe3Option = screen.getByRole("option", { name: "PE3 Dates" });
      await user.click(pe3Option);

      const dateInput = screen.getByLabelText(/datumvärde/i) as HTMLInputElement;
      await user.type(dateInput, "2025-03-15");

      const timeInput = await screen.findByLabelText(/tid/i) as HTMLInputElement;
      await user.type(timeInput, "14:30");

      // Submit form
      const submitButton = screen.getByRole("button", { name: /skapa|create/i });
      await user.click(submitButton);

      // API should be called with correct data
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            category: "PE3 Dates",
            date_value: "2025-03-15",
            time_value: "14:30",
          })
        );
      });

      // Success callback should be called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});

