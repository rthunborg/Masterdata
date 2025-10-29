import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";

// Mock dependencies
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { role: "hr_admin", email: "admin@example.com" },
    isLoading: false,
  }),
}));

vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: () => ({
    columns: [
      {
        id: "1",
        column_name: "First Name",
        column_type: "text",
        is_masterdata: true,
        display_order: 1,
        is_visible: true,
        category: null,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
      },
      {
        id: "2",
        column_name: "Surname",
        column_type: "text",
        is_masterdata: true,
        display_order: 2,
        is_visible: true,
        category: null,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
        },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(() => Promise.resolve({})),
    archive: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(() => Promise.resolve({})),
  },
}));

const mockEmployees: Employee[] = [
  {
    id: "1",
    first_name: "John",
    surname: "Doe",
    ssn: "123456789",
    email: "john@example.com",
    mobile: "1234567890",
    rank: "Manager",
    gender: "Male",
    town_district: "District 1",
    hire_date: "2020-01-01",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  },
  {
    id: "2",
    first_name: "Jane",
    surname: "Smith",
    ssn: "987654321",
    email: "jane@example.com",
    mobile: "0987654321",
    rank: "Developer",
    gender: "Female",
    town_district: "District 2",
    hire_date: "2021-06-15",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2021-06-15T00:00:00Z",
    updated_at: "2021-06-15T00:00:00Z",
  },
];

describe("Real-time Employee Sync Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render employee table with real-time connection indicator", () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        isRealtimeConnected={true}
      />
    );

    // Check for connection status indicator
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("should show offline status when not connected", () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        isRealtimeConnected={false}
      />
    );

    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("should highlight updated employee row", () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        isRealtimeConnected={true}
        updatedEmployeeId="1"
      />
    );

    const row = screen.getByTestId("employee-row-1");
    expect(row).toHaveClass("animate-pulse");
    expect(row).toHaveClass("bg-blue-50");
    expect(row).toHaveClass("border-l-4");
    expect(row).toHaveClass("border-l-blue-400");
  });

  it("should not highlight non-updated rows", () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        isRealtimeConnected={true}
        updatedEmployeeId="1"
      />
    );

    const row = screen.getByTestId("employee-row-2");
    expect(row).not.toHaveClass("animate-pulse");
    expect(row).not.toHaveClass("bg-blue-50");
  });

  it("should display all employees in table", () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        isRealtimeConnected={true}
      />
    );

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Smith")).toBeInTheDocument();
  });

  it("should handle archived employee styling", () => {
    const archivedEmployees = [
      {
        ...mockEmployees[0],
        is_archived: true,
      },
    ];

    render(
      <EmployeeTable
        employees={archivedEmployees}
        isLoading={false}
        isRealtimeConnected={true}
      />
    );

    const row = screen.getByTestId("employee-row-1");
    expect(row).toHaveClass("bg-muted");
    expect(row).toHaveClass("opacity-60");
  });

  it("should handle terminated employee styling", () => {
    const terminatedEmployees = [
      {
        ...mockEmployees[0],
        is_terminated: true,
        termination_date: "2023-12-31",
        termination_reason: "Resigned",
      },
    ];

    render(
      <EmployeeTable
        employees={terminatedEmployees}
        isLoading={false}
        isRealtimeConnected={true}
      />
    );

    const row = screen.getByTestId("employee-row-1");
    expect(row).toHaveClass("bg-red-50");
    expect(row).toHaveClass("text-red-800");
  });

  it("should show loading state", () => {
    render(
      <EmployeeTable
        employees={[]}
        isLoading={true}
        isRealtimeConnected={false}
      />
    );

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("should show empty state when no employees", () => {
    render(
      <EmployeeTable
        employees={[]}
        isLoading={false}
        isRealtimeConnected={true}
      />
    );

    expect(
      screen.getByText(/No employees found/i)
    ).toBeInTheDocument();
  });

  it("should display search functionality", () => {
    render(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        isRealtimeConnected={true}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search employees...");
    expect(searchInput).toBeInTheDocument();
  });

  it("should combine highlight and archived styles correctly", () => {
    const archivedEmployees = [
      {
        ...mockEmployees[0],
        is_archived: true,
      },
    ];

    render(
      <EmployeeTable
        employees={archivedEmployees}
        isLoading={false}
        isRealtimeConnected={true}
        updatedEmployeeId="1"
      />
    );

    const row = screen.getByTestId("employee-row-1");
    // Highlight styles (bg-blue-50) take precedence over archived styles (bg-muted)
    // but should still have archived opacity and animation
    expect(row).toHaveClass("animate-pulse");
    expect(row).toHaveClass("bg-blue-50");
    expect(row).toHaveClass("opacity-60"); // from archived styling
  });
});
