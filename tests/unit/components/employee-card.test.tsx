/**
 * Component Tests for Employee Card Expansion Behavior
 * Story 11.12: Employee Card Expansion Tests
 * AC1: Employee Card Expansion Behavior Tests
 * Task 1: Employee Card Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
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
import { renderWithI18n, I18nWrapper } from "@/../tests/utils/i18n-test-wrapper";

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

// Mock useImportantDates hook
vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
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

describe("EmployeeCard - Expansion Behavior", () => {
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
  let mockColumnConfigs: ColumnConfig[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEmployee = createTestEmployee({
      first_name: "John",
      surname: "Doe",
      email: "john.doe@example.com",
      mobile: "+46701234567",
    });

    mockColumnConfigs = [
      createTestColumnConfig({
        column_name: "First Name",
        db_column_name: "first_name",
        display_order: 1,
      }),
      createTestColumnConfig({
        column_name: "Surname",
        db_column_name: "surname",
        display_order: 2,
      }),
      createTestColumnConfig({
        column_name: "Email",
        db_column_name: "email",
        display_order: 3,
      }),
    ];

    // Mock useImportantDates to return empty array
    vi.mocked(useImportantDates).mockReturnValue({
      dates: [],
      isLoading: false,
    });
  });

  describe("AC1: Expansion Behavior Tests", () => {
    it('should show "More" button when card is collapsed', () => {
      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      expect(moreButton).toBeInTheDocument();
      expect(screen.queryByText("Less")).not.toBeInTheDocument();
    });

    it('should expand card to show all fields when "More" button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      // Should show "Less" button
      expect(screen.getByLabelText(/Collapse details/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Expand details/i)).not.toBeInTheDocument();

      // Should show expanded fields
      await waitFor(() => {
        expect(screen.getByText("First Name")).toBeInTheDocument();
        expect(screen.getByText("Surname")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
      });
    });

    it('should show "Less" button when card is expanded', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Collapse details/i)).toBeInTheDocument();
      });
    });

    it('should collapse card back to summary view when "Less" button is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      // Expand first
      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Collapse details/i)).toBeInTheDocument();
      });

      // Collapse
      const lessButton = screen.getByLabelText(/Collapse details/i);
      await user.click(lessButton);

      // Should show "More" button again
      await waitFor(() => {
        expect(screen.getByLabelText(/Expand details/i)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /less/i })).not.toBeInTheDocument();
      });

      // Expanded fields should not be visible
      expect(screen.queryByText("First Name")).not.toBeInTheDocument();
    });

    it("should maintain expansion state during re-renders", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      // Expand card
      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Collapse details/i)).toBeInTheDocument();
      });

      // Re-render with same props - must match the structure passed to initial render
      rerender(
        <QueryClientProvider client={queryClient}>
          <EmployeeCard
            employee={mockEmployee}
            isHRAdmin={true}
            columnConfigs={mockColumnConfigs}
            onEmployeeUpdated={mockOnEmployeeUpdated}
          />
        </QueryClientProvider>
      );

      // State should be maintained (expanded)
      expect(screen.getByLabelText(/Collapse details/i)).toBeInTheDocument();
      expect(screen.getByText("First Name")).toBeInTheDocument();
    });

    it("should display all employee fields in expanded view", async () => {
      const user = userEvent.setup();
      
      const manyColumns = Array.from({ length: 10 }, (_, i) =>
        createTestColumnConfig({
          column_name: `Field ${i + 1}`,
          db_column_name: `field_${i + 1}`,
          display_order: i + 1,
        })
      );

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={manyColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        // All fields should be visible
        for (let i = 1; i <= 10; i++) {
          expect(screen.getByText(`Field ${i}`)).toBeInTheDocument();
        }
      });
    });

    it("should not cut off or hide fields in expanded state", async () => {
      const user = userEvent.setup();
      
      const manyColumns = Array.from({ length: 20 }, (_, i) =>
        createTestColumnConfig({
          column_name: `Test Field ${i + 1}`,
          db_column_name: `test_field_${i + 1}`,
          display_order: i + 1,
        })
      );

      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={manyColumns}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        // All fields should be in the DOM (even if scrolled)
        for (let i = 1; i <= 20; i++) {
          expect(screen.getByText(`Test Field ${i}`)).toBeInTheDocument();
        }
      });

      // Check that expanded container has scrolling enabled
      // Find the container with max-h-[70vh] class (the expanded fields container)
      const expandedContainer = screen.getByText("Test Field 1").closest('.max-h-\\[70vh\\]');
      expect(expandedContainer).toBeInTheDocument();
      expect(expandedContainer).toHaveClass("max-h-[70vh]");
      expect(expandedContainer).toHaveClass("overflow-y-auto");
    });

    it("should apply correct CSS classes for expansion and scrolling", async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const moreButton = screen.getByLabelText(/Expand details/i);
      await user.click(moreButton);

      await waitFor(() => {
        // Find the expanded content container with max-h-[70vh] class
        const expandedContent = screen.getByText("First Name").closest('.max-h-\\[70vh\\]');
        expect(expandedContent).toBeInTheDocument();
        expect(expandedContent).toHaveClass("max-h-[70vh]");
        expect(expandedContent).toHaveClass("overflow-y-auto");
      });
    });
  });
});

