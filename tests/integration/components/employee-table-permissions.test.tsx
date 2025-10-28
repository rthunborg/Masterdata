import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";

// Mock the hooks
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: vi.fn(),
}));

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    reactivate: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from "@/lib/hooks/use-auth";
import { useColumns } from "@/lib/hooks/use-columns";

describe("EmployeeTable Permission Rendering", () => {
  const mockEmployees: Employee[] = [
    {
      id: "emp-1",
      first_name: "John",
      surname: "Doe",
      ssn: "123-45-6789",
      email: "john.doe@example.com",
      mobile: "+1234567890",
      hire_date: "2020-01-15",
      gender: "Male",
      rank: "Senior",
      town_district: "Downtown",
      is_archived: false,
      is_terminated: false,
      termination_date: null,
      termination_reason: null,
      comments: null,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
    {
      id: "emp-2",
      first_name: "Jane",
      surname: "Smith",
      ssn: "987-65-4321",
      email: "jane.smith@example.com",
      mobile: "+0987654321",
      hire_date: "2021-03-10",
      gender: "Female",
      rank: "Manager",
      town_district: "Uptown",
      is_archived: false,
      is_terminated: false,
      termination_date: null,
      termination_reason: null,
      comments: null,
      created_at: "2021-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    },
  ];

  const mockColumnConfigs: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "First Name",
      column_type: "text",
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
      },
      is_masterdata: true,
      category: "Personal",
      created_at: "2020-01-01T00:00:00Z",
    },
    {
      id: "col-2",
      column_name: "Email",
      column_type: "text",
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
        payroll: { view: true, edit: false },
      },
      is_masterdata: true,
      category: "Contact",
      created_at: "2020-01-01T00:00:00Z",
    },
    {
      id: "col-3",
      column_name: "Hire Date",
      column_type: "date",
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: true, edit: false },
      },
      is_masterdata: true,
      category: "Employment",
      created_at: "2020-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for useColumns
    vi.mocked(useColumns).mockReturnValue({
      columns: mockColumnConfigs,
      isLoading: false,
      error: null,
    });
  });

  describe("HR Admin Role", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { 
          id: "user-1", 
          email: "admin@example.com", 
          role: UserRole.HR_ADMIN,
          auth_id: "auth-1",
          is_active: true,
          created_at: "2020-01-01T00:00:00Z",
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });
    });

    it("renders all masterdata columns as editable (no lock icons)", () => {
      render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

      // Check that column headers exist
      expect(screen.getByText("First Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Hire Date")).toBeInTheDocument();

      // No lock icons should be present (Lock icons have aria-hidden, so we check by SVG class)
      const headers = screen.getAllByRole("columnheader");
      headers.forEach((header) => {
        // Ensure no lock icon SVG is rendered
        expect(header.querySelector('.lucide-lock')).toBeNull();
      });
    });

    it("all cells should have editable styling (cursor-pointer)", async () => {
      render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

      const cells = screen.getAllByRole("gridcell");
      
      // Filter out the Actions column cells and check data cells
      const dataCells = cells.filter(cell => {
        return cell.textContent !== "" && !cell.querySelector("button");
      });

      dataCells.forEach((cell) => {
        // Editable cells should have cursor-pointer class
        expect(cell).toHaveClass("cursor-pointer");
        expect(cell).not.toHaveClass("bg-gray-50");
      });
    });
  });

  describe("External Party Role (Sodexo)", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { 
          id: "user-2", 
          email: "sodexo@example.com", 
          role: UserRole.SODEXO,
          auth_id: "auth-2",
          is_active: true,
          created_at: "2020-01-01T00:00:00Z",
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });
    });

    it("renders masterdata columns as read-only (with lock icons)", () => {
      render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

      // Column headers should exist
      const firstNameHeader = screen.getByText("First Name").closest("th");
      const emailHeader = screen.getByText("Email").closest("th");

      // Check for lock icons in headers (they have aria-hidden="true")
      expect(firstNameHeader?.querySelector("svg")).toBeInTheDocument();
      expect(emailHeader?.querySelector("svg")).toBeInTheDocument();
    });

    it("all cells should have read-only styling (bg-gray-50)", () => {
      render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

      const cells = screen.getAllByRole("gridcell");

      cells.forEach((cell) => {
        // Read-only cells should have gray background
        expect(cell).toHaveClass("bg-gray-50");
        expect(cell).toHaveClass("cursor-default");
      });
    });

    it("cells should have aria-readonly='true'", () => {
      render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

      const cells = screen.getAllByRole("gridcell");

      cells.forEach((cell) => {
        expect(cell).toHaveAttribute("aria-readonly", "true");
      });
    });

    it("clicking masterdata cell shows read-only tooltip", async () => {
      render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

      // Find a data cell (e.g., John's first name)
      const cells = screen.getAllByRole("gridcell");
      const firstNameCell = cells.find(cell => cell.textContent === "John");

      expect(firstNameCell).toBeDefined();
      if (firstNameCell) {
        fireEvent.click(firstNameCell);

        // Tooltip should appear (Radix renders it multiple times for a11y)
        await waitFor(() => {
          const tooltips = screen.queryAllByText("This field is read-only. Contact HR to update.");
          expect(tooltips.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe("Column Header Accessibility", () => {
    it("includes (read-only) in aria-label for read-only columns", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { 
          id: "user-2", 
          email: "sodexo@example.com", 
          role: UserRole.SODEXO,
          auth_id: "auth-2",
          is_active: true,
          created_at: "2020-01-01T00:00:00Z",
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

      // Find column header by role
      const headers = screen.getAllByRole("columnheader");
      
      // Check that headers have appropriate aria-labels
      const firstNameHeader = headers.find(h => h.textContent?.includes("First Name"));
      expect(firstNameHeader).toBeDefined();
      
      // The header should have sorting controls with (read-only) label
      const sortButton = firstNameHeader?.querySelector('[role="button"]');
      if (sortButton) {
        const ariaLabel = sortButton.getAttribute("aria-label");
        expect(ariaLabel).toContain("read-only");
      }
    });
  });

  describe("Empty State", () => {
    it("displays message when no employees exist", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { 
          id: "user-1", 
          email: "admin@example.com", 
          role: UserRole.HR_ADMIN,
          auth_id: "auth-1",
          is_active: true,
          created_at: "2020-01-01T00:00:00Z",
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      render(<EmployeeTable employees={[]} isLoading={false} />);

      expect(screen.getByText(/No employees found/i)).toBeInTheDocument();
    });
  });
});
