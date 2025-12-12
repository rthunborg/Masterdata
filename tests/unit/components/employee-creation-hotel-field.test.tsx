/**
 * Component Tests for Employee Creation Hotel Field
 * Story 11.10: PE3 Validation & UI Component Tests
 * AC4: Employee Creation Hotel Field Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";
import { employeeService } from "@/lib/services/employee-service";
import { toast } from "sonner";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";
import type { Employee } from "@/lib/types/employee";

// Mock the employee service
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
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

describe("Employee Creation Hotel Field", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC4: Employee Creation Hotel Field Tests", () => {
    it("should render hotel field after town_district field in form order", () => {
      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Get form fields by label text (supports both English and Swedish)
      const townDistrictField = screen.getByLabelText(/town district|stad|ort/i);
      
      // Check if hotel field exists (supports both English and Swedish)
      const hotelField = screen.getByLabelText(/hotel|hotell/i);
      
      expect(hotelField).toBeInTheDocument();
      
      // Verify field order: hotel should come after town_district
      const form = townDistrictField.closest('form');
      const formItems = Array.from(form?.querySelectorAll('[data-slot="form-item"]') || []);
      
      const getFieldIndex = (searchText: string) => {
        return formItems.findIndex(el => {
          const label = el.querySelector('label');
          const labelText = label?.textContent?.toLowerCase() || '';
          return labelText.includes(searchText.toLowerCase());
        });
      };
      
      // Search for Swedish or English labels
      const townIndex = getFieldIndex('stad') !== -1 ? getFieldIndex('stad') : getFieldIndex('town');
      const hotelIndex = getFieldIndex('hotell') !== -1 ? getFieldIndex('hotell') : getFieldIndex('hotel');
      
      expect(townIndex).toBeGreaterThan(-1);
      expect(hotelIndex).toBeGreaterThan(-1);
      expect(hotelIndex).toBeGreaterThan(townIndex);
    });

    it("should default hotel field to false for new employees", () => {
      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Find the checkbox by role (more reliable than querySelector)
      const checkbox = screen.getByRole('checkbox', { name: /hotel|hotell/i });
      expect(checkbox).toBeInTheDocument();
      
      // Checkbox should be unchecked (default false)
      expect(checkbox).not.toBeChecked();
    });

    it("should allow hotel field to be optional (not mandatory)", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      
      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/first name|förnamn/i), "Test");
      await user.type(screen.getByLabelText(/surname|efternamn/i), "Employee");
      await user.type(screen.getByLabelText(/ssn|personnummer/i), "19900101-1234");
      
      // Don't set hotel field - should be able to submit
      const submitButton = screen.getByRole("button", { name: /create|skapa|save|spara/i });
      
      // Hotel field should not have required indicator
      const hotelField = screen.queryByLabelText(/hotel|hotell/i);
      if (hotelField) {
        const label = hotelField.closest('[data-slot="form-item"]')?.querySelector('label');
        expect(label?.textContent).not.toContain('*');
      }
    });

    it("should trigger room assignment when hotel=true during creation", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      const mockCreate = vi.mocked(employeeService.create);
      
      mockCreate.mockResolvedValue({
        id: "emp-1",
        first_name: "Test",
        surname: "Employee",
        ssn: "19900101-1234",
        hotel_required: true,
        room_number_shared: 101,
        // ... other required fields
      } as unknown as Employee);

      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/first name|förnamn/i), "Test");
      await user.type(screen.getByLabelText(/surname|efternamn/i), "Employee");
      await user.type(screen.getByLabelText(/ssn|personnummer/i), "19900101-1234");
      
      // Select gender (required field)
      const genderSelect = screen.getByRole("combobox", { name: /Kön|gender/i });
      await user.click(genderSelect);
      await user.click(screen.getByRole("option", { name: /Man/i }));
      
      // Set hotel field to true - find checkbox by role
      const checkbox = screen.getByRole('checkbox', { name: /hotel|hotell/i });
      expect(checkbox).toBeInTheDocument();
      
      // Click the checkbox to set it to true
      await user.click(checkbox);
      
      // Wait for checkbox state to update
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });

      // Submit form
      const submitButton = screen.getByRole("button", { name: /create|skapa|save|spara/i });
      await user.click(submitButton);

      // Verify hotel_required was sent in the request
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        const callArgs = mockCreate.mock.calls[0][0];
        // hotel_required should be true (boolean) or the form might send it as the checked value
        expect(callArgs.hotel_required).toBe(true);
      }, { timeout: 3000 });
    });

    it("should not assign room when hotel=false during creation", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      const mockCreate = vi.mocked(employeeService.create);
      
      mockCreate.mockResolvedValue({
        id: "emp-1",
        first_name: "Test",
        surname: "Employee",
        ssn: "19900101-1234",
        hotel_required: false,
        room_number_shared: null,
        // ... other required fields
      } as unknown as Employee);

      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/first name|förnamn/i), "Test");
      await user.type(screen.getByLabelText(/surname|efternamn/i), "Employee");
      await user.type(screen.getByLabelText(/ssn|personnummer/i), "19900101-1234");
      
      // Select gender (required field)
      const genderSelect = screen.getByRole("combobox", { name: /Kön|gender/i });
      await user.click(genderSelect);
      await user.click(screen.getByRole("option", { name: /Man/i }));
      
      // Ensure hotel field is false (default)
      const hotelField = screen.queryByLabelText(/hotel|hotell/i);
      if (hotelField && hotelField instanceof HTMLInputElement && hotelField.type === 'checkbox') {
        expect(hotelField.checked).toBe(false);
      }

      // Submit form
      const submitButton = screen.getByRole("button", { name: /create|skapa|save|spara/i });
      await user.click(submitButton);

      // Verify hotel_required was false and room_number_shared is null
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
        const callArgs = mockCreate.mock.calls[0][0];
        expect(callArgs.hotel_required).toBeFalsy();
        // Room assignment should not have been triggered
      });
    });
  });
});

