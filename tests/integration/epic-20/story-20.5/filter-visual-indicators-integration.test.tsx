import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";

// Mock the auth hook
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user",
      email: "test@example.com",
      role: "hr_admin",
    },
  }),
}));

// Mock the columns hook
vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: () => ({
    columns: [
      {
        id: "col-1",
        display_name: "First Name",
        db_column_name: "first_name",
        column_name: "First Name",
        column_type: "text",
        is_visible: true,
        is_editable: true,
        is_masterdata: true,
        is_checklist_item: false,
        role_permissions: {},
        display_order: 1,
        category: "Personal",
        category_color: "#000000",
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock important dates hook
vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: () => ({
    dates: [],
    isLoading: false,
    error: null,
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
  usePathname: () => "/dashboard",
}));

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("Story 20.5: Filter Visual Indicators Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

  const mockEmployees: Employee[] = [
    {
      id: "1",
      first_name: "John",
      surname: "Doe",
      ssn: "123456",
      email: "john@example.com",
      mobile: "1234567890",
      is_archived: false,
      is_terminated: false,
    } as Employee,
    {
      id: "2",
      first_name: "Jane",
      surname: "Smith",
      ssn: "654321",
      email: "jane@example.com",
      mobile: "0987654321",
      is_archived: false,
      is_terminated: false,
    } as Employee,
  ];

  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  it("displays filter button without badge when no filters active", () => {
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
      />
    );

    const filterButton = screen.getByTestId("filter-button");
    expect(filterButton).toBeInTheDocument();
    
    const badge = screen.queryByTestId("filter-count-badge");
    expect(badge).not.toBeInTheDocument();
  });

  it("does not show ClearFilterButton when no filters active", () => {
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
      />
    );

    const clearButton = screen.queryByTestId("clear-filter-button");
    expect(clearButton).not.toBeInTheDocument();
  });

  it("does not show FilteredCountDisplay when no filters active", () => {
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
      />
    );

    const countDisplay = screen.queryByTestId("filtered-count-display");
    expect(countDisplay).not.toBeInTheDocument();
  });

  it("shows all employees when no filters applied", () => {
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
      />
    );

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("opens filter panel when filter button clicked", async () => {
    const user = userEvent.setup();
    
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
      />
    );

    const filterButton = screen.getByTestId("filter-button");
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    });
  });
});
