import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { useColumns } from "@/lib/hooks/use-columns";
import { useAuth } from "@/lib/hooks/use-auth";
import { UserRole } from "@/lib/types/user";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock dependencies
vi.mock("@/lib/hooks/use-columns");
vi.mock("@/lib/hooks/use-auth");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEmployees: Employee[] = [
  {
    id: "1",
    first_name: "John",
    surname: "Doe",
    ssn: "123-45-6789",
    email: "john@example.com",
    mobile: "+1234567890",
    rank: "Manager",
    gender: "Male",
    town_district: "Downtown",
    hire_date: "2020-01-15",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: "Test employee",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

describe("EmployeeTable - Dynamic Column Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all columns for HR Admin role", () => {
    const hrAdminColumns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "First Name",
        column_type: "text",
        role_permissions: { hr_admin: { view: true, edit: true } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "2",
        column_name: "Surname",
        column_type: "text",
        role_permissions: { hr_admin: { view: true, edit: true } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "3",
        column_name: "SSN",
        column_type: "text",
        role_permissions: { hr_admin: { view: true, edit: true } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "4",
        column_name: "Email",
        column_type: "text",
        role_permissions: { hr_admin: { view: true, edit: true } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@test.com",
        role: UserRole.HR_ADMIN,
        is_active: true,
        auth_id: "auth1",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: hrAdminColumns,
      isLoading: false,
      error: null,
    });

    render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify all columns are present
    expect(screen.getByText("First Name")).toBeInTheDocument();
    expect(screen.getByText("Surname")).toBeInTheDocument();
    expect(screen.getByText("SSN")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();

    // Verify column count (4 data columns + 1 Actions column for HR Admin)
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(5); // 4 data columns + Actions
  });

  it("should render only permitted columns for Sodexo role", () => {
    const sodexoColumns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "First Name",
        column_type: "text",
        role_permissions: { sodexo: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "4",
        column_name: "Email",
        column_type: "text",
        role_permissions: { sodexo: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "5",
        column_name: "Mobile",
        column_type: "text",
        role_permissions: { sodexo: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "sodexo@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        auth_id: "auth2",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: sodexoColumns,
      isLoading: false,
      error: null,
    });

    render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify only permitted columns are present
    expect(screen.getByText("First Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Mobile")).toBeInTheDocument();

    // Verify SSN is not present
    expect(screen.queryByText("SSN")).not.toBeInTheDocument();

    // Verify columns are absent from DOM, not just hidden
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(3); // Only 3 columns in DOM
  });

  it("should render SSN for Payroll role but not Mobile", () => {
    const payrollColumns: ColumnConfig[] = [
      {
        id: "1",
        column_name: "First Name",
        column_type: "text",
        role_permissions: { payroll: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "3",
        column_name: "SSN",
        column_type: "text",
        role_permissions: { payroll: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "3",
        email: "payroll@test.com",
        role: UserRole.PAYROLL,
        is_active: true,
        auth_id: "auth3",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: payrollColumns,
      isLoading: false,
      error: null,
    });

    render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify SSN is visible
    expect(screen.getByText("SSN")).toBeInTheDocument();

    // Verify Mobile is not present
    expect(screen.queryByText("Mobile")).not.toBeInTheDocument();
  });

  it("should display error when zero columns are configured", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "4",
        email: "test@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        auth_id: "auth4",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: false,
      error: null,
    });

    render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify error message is displayed
    expect(
      screen.getByText("No columns configured for your role. Please contact HR.")
    ).toBeInTheDocument();
  });

  it("should display skeleton while loading columns", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@test.com",
        role: UserRole.HR_ADMIN,
        is_active: true,
        auth_id: "auth1",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: true,
      error: null,
    });

    const { container } = render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify skeleton is present (checking for the animation class)
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should display error alert when column fetch fails", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@test.com",
        role: UserRole.HR_ADMIN,
        is_active: true,
        auth_id: "auth1",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: false,
      error: new Error("Failed to load columns"),
    });

    render(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify error message is displayed
    expect(
      screen.getByText("Failed to load column configuration. Please refresh the page.")
    ).toBeInTheDocument();
  });
});
