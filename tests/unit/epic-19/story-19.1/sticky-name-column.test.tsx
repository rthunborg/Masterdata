/**
 * Story 19.1: Sticky/Frozen Name Column Tests
 *
 * Tests that verify the Name column remains sticky/frozen when scrolling horizontally.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock dependencies
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "test-user", role: "hr_admin" },
  }),
}));

vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: () => ({
    columns: mockColumnConfigs,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: () => ({
    dates: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: () => ({
    previewRole: null,
    isPreviewMode: false,
    initColumnVisibility: vi.fn(),
    columnVisibility: {},
    density: "default",
    setDensity: vi.fn(),
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => key,
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

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    reactivate: vi.fn(),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(),
  },
}));

vi.mock("@/lib/services/mutation-queue", () => ({
  mutationQueueService: {
    getPendingMutations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock column configs with First Name column
const mockColumnConfigs: ColumnConfig[] = [
  {
    id: "col-first-name",
    column_name: "First Name",
    db_column_name: "first_name",
    column_type: "text",
    is_masterdata: true,
    role_permissions: { hr_admin: { view: true, edit: true } },
    category: null,
    category_color: null,
    display_order: 0,
    is_visible: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "col-surname",
    column_name: "Surname",
    db_column_name: "surname",
    column_type: "text",
    is_masterdata: true,
    role_permissions: { hr_admin: { view: true, edit: true } },
    category: null,
    category_color: null,
    display_order: 1,
    is_visible: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "col-email",
    column_name: "Email",
    db_column_name: "email",
    column_type: "text",
    is_masterdata: true,
    role_permissions: { hr_admin: { view: true, edit: true } },
    category: null,
    category_color: null,
    display_order: 2,
    is_visible: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

// Mock employee data
const mockEmployees: Employee[] = [
  {
    id: "emp-1",
    first_name: "John",
    surname: "Doe",
    ssn: "900101-1234",
    email: "john.doe@example.com",
    mobile: "0701234567",
    rank: "SEV",
    gender: "Man",
    town_district: "Göteborg",
    is_archived: false,
    is_terminated: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  } as Employee,
];

describe("Story 19.1: Sticky Name Column", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe("Sticky Column Positioning", () => {
    it("should apply sticky positioning to the checkbox column", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Find checkbox cells (both header and body)
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);

      // Find the first checkbox in a table cell (data row checkbox)
      let checkboxCell: HTMLTableCellElement | null = null;
      for (const checkbox of checkboxes) {
        const cell = checkbox.closest("td");
        if (cell) {
          checkboxCell = cell as HTMLTableCellElement;
          break;
        }
      }

      // The checkbox cell should be within a sticky positioned element
      expect(checkboxCell).not.toBeNull();
      if (checkboxCell) {
        // Verify sticky class is applied (checking for 'sticky' in className)
        expect(checkboxCell.className).toContain("sticky");
        // Left position is now in style attribute for dynamic offsets
        expect(checkboxCell.style.left).toBe("0px");
      }
    });

    it("should apply sticky positioning to the First Name column cells", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // The employee table should render with employees
      expect(screen.getByText("John")).toBeInTheDocument();

      // Find the First Name cell (contains "John")
      const nameCell = screen.getByText("John").closest("td");
      expect(nameCell).not.toBeNull();
      if (nameCell) {
        // Verify sticky class is applied
        expect(nameCell.className).toContain("sticky");
        // Verify z-index class is applied
        expect(nameCell.className).toContain("z-10");
        // Verify bg-inherit class is applied for row state backgrounds
        expect(nameCell.className).toContain("bg-inherit");
      }
    });

    it("should apply sticky positioning to the Surname column cells", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // The employee table should render with employees
      expect(screen.getByText("Doe")).toBeInTheDocument();

      // Find the Surname cell (contains "Doe")
      const surnameCell = screen.getByText("Doe").closest("td");
      expect(surnameCell).not.toBeNull();
      if (surnameCell) {
        // Verify sticky class is applied
        expect(surnameCell.className).toContain("sticky");
        // Verify z-index class is applied
        expect(surnameCell.className).toContain("z-10");
        // Verify bg-inherit class is applied for row state backgrounds
        expect(surnameCell.className).toContain("bg-inherit");
      }
    });

    it("should apply shadow only to the last sticky name column (Surname)", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Find the First Name cell - should NOT have shadow
      const firstNameCell = screen.getByText("John").closest("td");
      if (firstNameCell) {
        expect(firstNameCell.className).not.toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
      }

      // Find the Surname cell - SHOULD have shadow
      const surnameCell = screen.getByText("Doe").closest("td");
      if (surnameCell) {
        // Verify shadow class is applied for visual separation
        expect(surnameCell.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
      }
    });

    it("should apply z-index for proper layering", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Find the First Name cell
      const nameCell = screen.getByText("John").closest("td");
      if (nameCell) {
        // Verify z-index class is applied
        expect(nameCell.className).toContain("z-10");
      }

      // Find the Surname cell
      const surnameCell = screen.getByText("Doe").closest("td");
      if (surnameCell) {
        // Verify z-index class is applied
        expect(surnameCell.className).toContain("z-10");
      }
    });

    it("should apply bg-inherit for proper background inheritance", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Find the First Name cell
      const nameCell = screen.getByText("John").closest("td");
      if (nameCell) {
        // Verify bg-inherit class is applied for row state backgrounds
        expect(nameCell.className).toContain("bg-inherit");
      }

      // Find the Surname cell
      const surnameCell = screen.getByText("Doe").closest("td");
      if (surnameCell) {
        // Verify bg-inherit class is applied for row state backgrounds
        expect(surnameCell.className).toContain("bg-inherit");
      }
    });
  });

  describe("Header Sticky Positioning", () => {
    it("should apply sticky positioning to the First Name header", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Find the First Name header
      const headers = document.querySelectorAll("th");
      let firstNameHeader: HTMLTableCellElement | null = null;
      
      headers.forEach((header) => {
        if (header.textContent?.includes("First Name")) {
          firstNameHeader = header as HTMLTableCellElement;
        }
      });

      expect(firstNameHeader).not.toBeNull();
      if (firstNameHeader) {
        expect(firstNameHeader.className).toContain("sticky");
        expect(firstNameHeader.className).toContain("z-20");
      }
    });

    it("should apply sticky positioning to the Surname header", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Find the Surname header
      const headers = document.querySelectorAll("th");
      let surnameHeader: HTMLTableCellElement | null = null;
      
      headers.forEach((header) => {
        if (header.textContent?.includes("Surname")) {
          surnameHeader = header as HTMLTableCellElement;
        }
      });

      expect(surnameHeader).not.toBeNull();
      if (surnameHeader) {
        expect(surnameHeader.className).toContain("sticky");
        expect(surnameHeader.className).toContain("z-20");
        // Shadow should only be on Surname (last sticky name column)
        expect(surnameHeader.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
      }
    });
  });

  describe("Compatibility with existing features", () => {
    it("should not make action column sticky (user preference)", async () => {
    renderWithQueryClient(
      <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Find the Actions header (for HR Admin)
      const headers = document.querySelectorAll("th");
      let actionsHeader: HTMLTableCellElement | null = null;
      
      headers.forEach((header) => {
        if (header.textContent?.includes("actions")) {
          actionsHeader = header as HTMLTableCellElement;
        }
      });

      // Action column should NOT be sticky (per user request)
      if (actionsHeader) {
        expect(actionsHeader.className).not.toContain("sticky");
        expect(actionsHeader.className).not.toContain("right-0");
      }
    });
  });
});
