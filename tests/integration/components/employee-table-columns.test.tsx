import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { useColumns } from "@/lib/hooks/use-columns";
import { useAuth } from "@/lib/hooks/use-auth";
import { UserRole } from "@/lib/types/user";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import { setViewportSize, resetViewport } from '@/../tests/helpers/responsive-test-helpers';

// Mock dependencies
vi.mock("@/lib/hooks/use-columns");
vi.mock("@/lib/hooks/use-auth");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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


const mockEmployees: Employee[] = [
  {
    id: "1",
    first_name: "John",
    surname: "Doe",
    ssn: "123-45-6789",
    email: "john@example.com",
    mobile: "+1234567890",
    rank: 'SEV',
    gender: 'Man',
    town_district: "Trelleborg",
    hire_date: "2020-01-15",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    comments: "Test employee",
    one: null,
    one_marked_at: null,
    talmundo: null,
    isps: null,
    photo: null,
    origo: null,
    loneiva: null,
    mail_lon: null,
    bankuppgifter: null,
    li: null,
    passport: null,
    kvitto_c17_18: null,
    c17: null,
    crewing_done: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

describe("EmployeeTable - Dynamic Column Rendering", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    resetViewport();
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
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "2",
        column_name: "Surname",
        column_type: "text",
        role_permissions: { hr_admin: { view: true, edit: true } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "3",
        column_name: "SSN",
        column_type: "text",
        role_permissions: { hr_admin: { view: true, edit: true } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "4",
        column_name: "Email",
        column_type: "text",
        role_permissions: { hr_admin: { view: true, edit: true } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
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
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify all columns are present
    expect(screen.getByText("First Name")).toBeInTheDocument();
    expect(screen.getByText("Surname")).toBeInTheDocument();
    expect(screen.getByText("SSN")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();

    // Verify column count (Selection + 4 data columns + Actions column for HR Admin)
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(6); // Selection + 4 data columns + Actions
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
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "4",
        column_name: "Email",
        column_type: "text",
        role_permissions: { sodexo: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "5",
        column_name: "Mobile",
        column_type: "text",
        role_permissions: { sodexo: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
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
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify only permitted columns are present
    expect(screen.getByText("First Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Mobile")).toBeInTheDocument();

    // Verify SSN is not present
    expect(screen.queryByText("SSN")).not.toBeInTheDocument();

    // Verify columns are absent from DOM, not just hidden
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(4); // Selection + 3 columns in DOM
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
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "3",
        column_name: "SSN",
        column_type: "text",
        role_permissions: { payroll: { view: true, edit: false } },
        is_masterdata: true,
        category: null,
        created_at: "2025-01-01T00:00:00Z",
        db_column_name: 'test_column',
        category_color: '#FFFFFF',
        display_order: 0,
        is_visible: true,
        updated_at: new Date().toISOString(),
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
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

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
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

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
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

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
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify error message is displayed
    expect(
      screen.getByText("Failed to load column configuration. Please refresh the page.")
    ).toBeInTheDocument();
  });
});

describe("EmployeeTable - Column Alignment (Story 17.7)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    resetViewport();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  /**
   * Helper function to create column configs
   */
  const createColumnConfig = (
    id: string,
    columnName: string,
    rolePermissions: Record<string, { view: boolean; edit: boolean }>
  ): ColumnConfig => ({
    id,
    column_name: columnName,
    column_type: "text",
    role_permissions: rolePermissions,
    is_masterdata: true,
    category: null,
    created_at: "2025-01-01T00:00:00Z",
    db_column_name: 'test_column',
    category_color: '#FFFFFF',
    display_order: 0,
    is_visible: true,
    updated_at: new Date().toISOString(),
  });

  /**
   * Helper function to get header and cell elements for a column
   */
  const getColumnElements = (columnName: string) => {
    const headers = screen.getAllByRole("columnheader");
    const header = headers.find((h) => h.textContent?.includes(columnName));
    
    if (!header) return { header: null, cell: null };
    
    // Get the table structure
    const table = header.closest("table");
    if (!table) return { header: null, cell: null };
    
    // Find the header's column index within the header row
    const headerRow = header.closest("tr");
    if (!headerRow) return { header: null, cell: null };
    
    const headerCells = Array.from(headerRow.querySelectorAll("th"));
    const headerIndex = headerCells.indexOf(header as HTMLTableCellElement);
    
    // Find first data row (tbody > tr)
    const tbody = table.querySelector("tbody");
    if (!tbody) return { header: header as HTMLElement, cell: null };
    
    const dataRows = tbody.querySelectorAll("tr");
    if (dataRows.length === 0) return { header: header as HTMLElement, cell: null };
    
    const firstDataRow = dataRows[0];
    const dataCells = Array.from(firstDataRow.querySelectorAll("td"));
    const cell = dataCells[headerIndex] as HTMLElement | null;
    
    return { header: header as HTMLElement, cell };
  };

  it("should match header and cell widths for external user with few columns (2-3)", () => {
    // Story 17.7 AC1, AC2, AC4: Test alignment with few columns
    const sodexoColumns: ColumnConfig[] = [
      createColumnConfig("1", "First Name", { sodexo: { view: true, edit: false } }),
      createColumnConfig("2", "Email", { sodexo: { view: true, edit: false } }),
      createColumnConfig("3", "Mobile", { sodexo: { view: true, edit: false } }),
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "sodexo@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        auth_id: "auth2",
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify table has table-fixed class (Story 17.7 implementation)
    const table = container.querySelector("table");
    expect(table).toHaveClass("table-fixed");

    // Check each column for width matching
    sodexoColumns.forEach((column) => {
      const { header, cell } = getColumnElements(column.column_name);
      
      if (header && cell) {
        const headerWidth = window.getComputedStyle(header).width;
        const cellWidth = window.getComputedStyle(cell).width;
        
        // Widths should match (allowing 1px tolerance for rounding)
        const headerWidthNum = parseFloat(headerWidth);
        const cellWidthNum = parseFloat(cellWidth);
        expect(Math.abs(headerWidthNum - cellWidthNum)).toBeLessThanOrEqual(1);
      }
    });
  });

  it("should match header and cell widths for HR Admin with many columns (10+)", () => {
    // Story 17.7 AC1, AC2, AC4: Test alignment with many columns
    const hrAdminColumns: ColumnConfig[] = Array.from({ length: 12 }, (_, i) =>
      createColumnConfig(
        String(i + 1),
        `Column ${i + 1}`,
        { hr_admin: { view: true, edit: true } }
      )
    );

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@test.com",
        role: UserRole.HR_ADMIN,
        is_active: true,
        auth_id: "auth1",
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Verify table has table-fixed class
    const table = container.querySelector("table");
    expect(table).toHaveClass("table-fixed");

    // Check first 5 columns for width matching (checking all 12 would be excessive)
    const columnsToCheck = hrAdminColumns.slice(0, 5);
    columnsToCheck.forEach((column) => {
      const { header, cell } = getColumnElements(column.column_name);
      
      if (header && cell) {
        const headerWidth = window.getComputedStyle(header).width;
        const cellWidth = window.getComputedStyle(cell).width;
        
        // Widths should match (allowing 1px tolerance for rounding)
        const headerWidthNum = parseFloat(headerWidth);
        const cellWidthNum = parseFloat(cellWidth);
        expect(Math.abs(headerWidthNum - cellWidthNum)).toBeLessThanOrEqual(1);
      }
    });
  });

  it("should maintain column alignment at desktop breakpoint (1024px)", () => {
    // Story 17.7 AC5: Responsive behavior at critical breakpoint
    setViewportSize(1024, 768);

    const sodexoColumns: ColumnConfig[] = [
      createColumnConfig("1", "First Name", { sodexo: { view: true, edit: false } }),
      createColumnConfig("2", "Email", { sodexo: { view: true, edit: false } }),
      createColumnConfig("3", "Mobile", { sodexo: { view: true, edit: false } }),
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "sodexo@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        auth_id: "auth2",
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    const table = container.querySelector("table");
    expect(table).toHaveClass("table-fixed");

    // Verify alignment at desktop breakpoint
    sodexoColumns.forEach((column) => {
      const { header, cell } = getColumnElements(column.column_name);
      
      if (header && cell) {
        const headerWidth = window.getComputedStyle(header).width;
        const cellWidth = window.getComputedStyle(cell).width;
        const headerWidthNum = parseFloat(headerWidth);
        const cellWidthNum = parseFloat(cellWidth);
        expect(Math.abs(headerWidthNum - cellWidthNum)).toBeLessThanOrEqual(1);
      }
    });
  });

  it("should maintain column alignment at tablet breakpoint (768px)", () => {
    // Story 17.7 AC5: Responsive behavior at tablet breakpoint
    setViewportSize(768, 1024);

    const sodexoColumns: ColumnConfig[] = [
      createColumnConfig("1", "First Name", { sodexo: { view: true, edit: false } }),
      createColumnConfig("2", "Email", { sodexo: { view: true, edit: false } }),
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "sodexo@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        auth_id: "auth2",
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    const table = container.querySelector("table");
    expect(table).toHaveClass("table-fixed");

    // Verify alignment at tablet breakpoint
    sodexoColumns.forEach((column) => {
      const { header, cell } = getColumnElements(column.column_name);
      
      if (header && cell) {
        const headerWidth = window.getComputedStyle(header).width;
        const cellWidth = window.getComputedStyle(cell).width;
        const headerWidthNum = parseFloat(headerWidth);
        const cellWidthNum = parseFloat(cellWidth);
        expect(Math.abs(headerWidthNum - cellWidthNum)).toBeLessThanOrEqual(1);
      }
    });
  });

  it("should maintain column alignment when viewport is resized", () => {
    // Story 17.7 AC5: Responsive behavior - alignment maintained on resize
    const sodexoColumns: ColumnConfig[] = [
      createColumnConfig("1", "First Name", { sodexo: { view: true, edit: false } }),
      createColumnConfig("2", "Email", { sodexo: { view: true, edit: false } }),
      createColumnConfig("3", "Mobile", { sodexo: { view: true, edit: false } }),
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "sodexo@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        auth_id: "auth2",
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    const { container, rerender } = renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    // Test at desktop size
    setViewportSize(1280, 720);
    rerender(
      <QueryClientProvider client={queryClient}>
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      </QueryClientProvider>
    );
    
    let { header, cell } = getColumnElements("First Name");
    if (header && cell) {
      const headerWidth = parseFloat(window.getComputedStyle(header).width);
      const cellWidth = parseFloat(window.getComputedStyle(cell).width);
      expect(Math.abs(headerWidth - cellWidth)).toBeLessThanOrEqual(1);
    }

    // Test at tablet size
    setViewportSize(768, 1024);
    rerender(
      <QueryClientProvider client={queryClient}>
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      </QueryClientProvider>
    );
    
    ({ header, cell } = getColumnElements("First Name"));
    if (header && cell) {
      const headerWidth = parseFloat(window.getComputedStyle(header).width);
      const cellWidth = parseFloat(window.getComputedStyle(cell).width);
      expect(Math.abs(headerWidth - cellWidth)).toBeLessThanOrEqual(1);
    }

    // Test at critical breakpoint (1024px)
    setViewportSize(1024, 768);
    rerender(
      <QueryClientProvider client={queryClient}>
        <EmployeeTable employees={mockEmployees} isLoading={false} />
      </QueryClientProvider>
    );
    
    ({ header, cell } = getColumnElements("First Name"));
    if (header && cell) {
      const headerWidth = parseFloat(window.getComputedStyle(header).width);
      const cellWidth = parseFloat(window.getComputedStyle(cell).width);
      expect(Math.abs(headerWidth - cellWidth)).toBeLessThanOrEqual(1);
    }
  });

  it("should have consistent table layout with table-layout: fixed", () => {
    // Story 17.7 AC3: Table layout consistency
    const sodexoColumns: ColumnConfig[] = [
      createColumnConfig("1", "First Name", { sodexo: { view: true, edit: false } }),
      createColumnConfig("2", "Email", { sodexo: { view: true, edit: false } }),
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "sodexo@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        auth_id: "auth2",
        created_at: "2025-01-01T00:00:00Z",
        last_active_at: new Date().toISOString(),
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
      refetch: vi.fn(),
    });

    const { container } = renderWithQueryClient(<EmployeeTable employees={mockEmployees} isLoading={false} />);

    const table = container.querySelector("table");
    expect(table).toHaveClass("table-fixed");
    
    // Verify table-layout: fixed is applied via Tailwind class
    // Note: In jsdom, computed styles may not reflect Tailwind classes,
    // so we verify the class is present which applies table-layout: fixed
    expect(table).toHaveClass("table-fixed");
  });
});
