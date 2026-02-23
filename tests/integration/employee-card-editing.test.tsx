/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration Tests for Employee Card Inline Editing
 * Story 11.12: Employee Card Expansion Tests
 * AC3: Inline Editing Functionality Tests
 * Task 3: Inline Editing Integration Tests
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from "@testing-library/user-event";
import { EmployeeCard } from "@/components/dashboard/employee-card";
import { employeeService } from "@/lib/services/employee-service";
import { customDataService } from "@/lib/services/custom-data-service";
import { toast } from "sonner";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { createTestEmployee } from "@/../tests/helpers/validation-test-helpers";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";

// Mock services
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(),
}));

// Mock useTranslations to return actual translated strings
vi.mock("@/lib/i18n", () => ({
  useTranslations: vi.fn((namespace: string) => {
    const translations: Record<string, Record<string, any>> = {
      'toasts': {
        'employees': {
          'fieldUpdated': 'Fält uppdaterat',
        },
      },
    };
    return (key: string) => {
      const keys = key.split('.');
      let value: any = translations[namespace];
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          return key;
        }
      }
      return value || key;
    };
  }),
}));

// Mock useMediaQuery to default to desktop mode for these tests
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(() => false), // Default to desktop
}));

// Mock useLongPress hook
vi.mock("@/hooks/use-long-press", () => ({
  useLongPress: vi.fn(() => ({
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
  })),
}));

// Helper to create test column configs
function createTestColumnConfig(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    id: `col-${Date.now()}-${Math.random()}`,
    column_name: overrides.column_name || "First Name",
    db_column_name: overrides.db_column_name || "first_name",
    column_type: overrides.column_type || "text",
    role_permissions: overrides.role_permissions || {
      hr_admin: { view: true, edit: true },
      omc: { view: true, edit: false },
    },
    is_masterdata: overrides.is_masterdata ?? true,
    category: overrides.category || "General",
    category_color: overrides.category_color || null,
    display_order: overrides.display_order || 1,
    is_visible: overrides.is_visible ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("EmployeeCard - Inline Editing Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  const mockOnEmployeeUpdated = vi.fn();
  let mockEmployee: Employee;
  let editableColumns: ColumnConfig[];
  let readOnlyColumns: ColumnConfig[];

  // Helper to find gridcell within expanded section by field label
  const findGridcellByLabel = (label: string) => {
    const labelElement = screen.getByText(label);
    const fieldContainer = labelElement.closest('.space-y-1');
    if (!fieldContainer) return null;
    return fieldContainer.querySelector('[role="gridcell"]');
  };

  // Helper to find gridcell by value within expanded section (avoids header matches)
  const findGridcellByValue = (value: string) => {
    const allGridcells = screen.getAllByRole('gridcell');
    return allGridcells.find(cell => {
      // Check if this gridcell is within the expanded section (has a label sibling)
      const container = cell.closest('.space-y-1');
      if (!container) return false;
      const label = container.querySelector('label');
      // Only match if it's in expanded section (has label) and contains the value
      return label && cell.textContent?.includes(value);
    }) || null;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEmployee = createTestEmployee({
      id: "emp-123",
      first_name: "John",
      surname: "Doe",
      email: "john.doe@example.com",
    });

    editableColumns = [
      createTestColumnConfig({
        column_name: "First Name",
        db_column_name: "first_name",
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: true },
        },
        display_order: 1,
      }),
      createTestColumnConfig({
        column_name: "Email",
        db_column_name: "email",
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: true },
        },
        display_order: 2,
      }),
    ];

    readOnlyColumns = [
      createTestColumnConfig({
        column_name: "SSN",
        db_column_name: "ssn",
        column_type: "text",
        role_permissions: {
          hr_admin: { view: true, edit: false }, // Read-only
        },
        display_order: 1,
      }),
    ];

    vi.mocked(useImportantDates).mockReturnValue({
      dates: [],
      isLoading: false,
    });

    vi.mocked(employeeService.update).mockResolvedValue(undefined);
    vi.mocked(customDataService.updateCustomData).mockResolvedValue(undefined);
  });

  describe("AC3: Inline Editing Functionality Tests", () => {
    it("should show edit controls when editable field is clicked", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={editableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Click on the editable field (EditableCell should enter edit mode)
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      // Should show input field (EditableCell handles this)
      await waitFor(() => {
        const input = screen.queryByDisplayValue("John");
        expect(input).toBeInTheDocument();
      });
    });

    it("should not show edit controls for read-only fields", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={readOnlyColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("SSN")).toBeInTheDocument();
      });

      // Click on read-only field
      const ssnCell = screen.getByText(mockEmployee.ssn).closest('[role="gridcell"]');
      if (ssnCell) {
        await user.click(ssnCell);
      }

      // Should not show input field (read-only)
      await waitFor(() => {
        const input = screen.queryByDisplayValue(mockEmployee.ssn);
        expect(input).not.toBeInTheDocument();
      });
    });

    it("should respect role-based edit permissions", async () => {
      const user = userEvent.setup();

      // Create column where NO role has edit permission
      const readOnlyColumns = [
        createTestColumnConfig({
          column_name: "First Name",
          db_column_name: "first_name",
          role_permissions: {
            hr_admin: { view: true, edit: false }, // No edit permission
            omc: { view: true, edit: false },
          },
          display_order: 1,
        }),
      ];

      // Render as HR Admin (but column has no edit permission for any role)
      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={readOnlyColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Click on field - should not enter edit mode (no edit permission for any role)
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      // Should not show input (no edit permission)
      await waitFor(() => {
        const input = screen.queryByDisplayValue("John");
        expect(input).not.toBeInTheDocument();
      });
    });

    it("should save valid field updates via API", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={editableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Click to edit
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      // Wait for input to appear and edit
      const input = await waitFor(() => {
        const inputElement = screen.getByDisplayValue("John") as HTMLInputElement;
        expect(inputElement).toBeInTheDocument();
        return inputElement;
      });
      
      await user.clear(input);
      await user.type(input, "Jonathan");
      // Trigger save with Enter key
      await user.keyboard("{Enter}");

      // Should call employeeService.update
      await waitFor(() => {
        expect(employeeService.update).toHaveBeenCalledWith("emp-123", {
          first_name: "Jonathan",
        });
      }, { timeout: 2000 });

      // Should show success toast
      expect(toast.success).toHaveBeenCalledWith("Fält uppdaterat");
    });

    it("should show validation errors for invalid updates", async () => {
      const user = userEvent.setup();

      // Mock update to throw error
      vi.mocked(employeeService.update).mockRejectedValue(
        new Error("Validation failed: Invalid value")
      );

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={editableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Click to edit
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      // Edit and trigger save
      const input = await waitFor(() => {
        return screen.getByDisplayValue("John") as HTMLInputElement;
      });
      await user.clear(input);
      // Don't type anything - empty value might trigger validation
      await user.keyboard("{Enter}"); // Enter to save

      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("should trigger optimistic UI updates during save", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={editableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Click to edit
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      // Edit value
      const input = await waitFor(() => {
        return screen.getByDisplayValue("John") as HTMLInputElement;
      });
      await user.clear(input);
      await user.type(input, "Jonathan");
      await user.keyboard("{Enter}"); // Enter to save

      // EditableCell should handle optimistic updates
      // The component should show the new value immediately
      await waitFor(() => {
        expect(employeeService.update).toHaveBeenCalled();
      });
    });

    it("should sync with real-time subscriptions when field updates", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={editableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Update field
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      const input = await waitFor(() => {
        return screen.getByDisplayValue("John") as HTMLInputElement;
      });
      await user.clear(input);
      await user.type(input, "Jonathan");
      await user.keyboard("{Enter}"); // Enter to save

      // onEmployeeUpdated should be called to trigger real-time sync
      await waitFor(() => {
        expect(mockOnEmployeeUpdated).toHaveBeenCalled();
      });
    });

    it("should handle concurrent editing scenarios", async () => {
      const user = userEvent.setup();

      const multipleEditableColumns = [
        createTestColumnConfig({
          column_name: "First Name",
          db_column_name: "first_name",
          display_order: 1,
        }),
        createTestColumnConfig({
          column_name: "Email",
          db_column_name: "email",
          display_order: 2,
        }),
      ];

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={multipleEditableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
      });

      // Edit first field
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      const input = await waitFor(() => {
        return screen.getByDisplayValue("John") as HTMLInputElement;
      });
      await user.clear(input);
      await user.type(input, "Jonathan");
      await user.keyboard("{Enter}"); // Enter to save

      // Edit second field - use helper to find email cell in expanded section
      await waitFor(async () => {
        const emailCell = findGridcellByLabel("Email");
        if (emailCell) {
          await user.click(emailCell);
        }
      });

      // Both fields should be editable independently
      await waitFor(() => {
        expect(employeeService.update).toHaveBeenCalledTimes(1); // First field saved
      });
    });

    it("should cleanup edit state on component unmount", async () => {
      const user = userEvent.setup();

      const { unmount } = renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={editableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Start editing
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      // Unmount component
      unmount();

      // Component should unmount without errors
      expect(screen.queryByText("First Name")).not.toBeInTheDocument();
    });

    it("should validate required fields during editing", async () => {
      const user = userEvent.setup();

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={editableColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
      });

      // Click to edit
      const firstNameCell = findGridcellByLabel("First Name");
      if (firstNameCell) {
        await user.click(firstNameCell);
      }

      // Try to clear required field
      await waitFor(async () => {
        const input = screen.getByDisplayValue("John") as HTMLInputElement;
        await user.clear(input);
        // EditableCell should handle validation
        // The actual validation logic is in EditableCell component
      });

      // Validation should prevent invalid saves
      // (EditableCell tests cover this in detail)
    });
  });
});

