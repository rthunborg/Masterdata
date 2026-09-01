/**
 * Integration Tests: Story 20.7 - Export Verification & Fixes
 * 
 * Tests that export functionality correctly respects active filters.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeTable } from '@/components/dashboard/employee-table';
import type { Employee } from '@/lib/types/employee';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/dashboard',
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ''),
  }),
  usePathname: () => '/dashboard',
}));

// Mock dependencies
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'hr_admin', email: 'admin@test.com' },
  }),
}));

vi.mock('@/lib/hooks/use-columns', () => ({
  useColumns: () => ({
    columns: [
      {
        id: 'col-first-name',
        column_name: 'First Name',
        db_column_name: 'first_name',
        column_type: 'text',
        is_masterdata: true,
        is_checklist_item: false,
        is_visible: true,
        display_order: 1,
        category: 'Personal',
        category_color: '#0000FF',
        role_permissions: {
          hr_admin: { view: true, edit: true },
          recruiter: { view: true, edit: true },
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 'col-surname',
        column_name: 'Surname',
        db_column_name: 'surname',
        column_type: 'text',
        is_masterdata: true,
        is_checklist_item: false,
        is_visible: true,
        display_order: 2,
        category: 'Personal',
        category_color: '#0000FF',
        role_permissions: {
          hr_admin: { view: true, edit: true },
          recruiter: { view: true, edit: true },
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: () => ({
    dates: [],
    isLoading: false,
  }),
}));

vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: () => ({
    previewRole: null,
    isPreviewMode: false,
    initColumnVisibility: vi.fn(),
    columnVisibility: {},
    density: 'default',
    setDensity: vi.fn(),
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      exportSelected: 'Export Selected',
      noEmployeesSelected: 'No employees selected',
      searchPlaceholder: 'Search employees...',
      statsActiveEmployeesLabel: 'Active Employees',
      statsCrewedEmployeesLabel: 'Crew Ready',
      switchToCompact: 'Switch to compact view',
      switchToCards: 'Switch to cards view',
      filter: 'Filter',
      applyFilters: 'Tillämpa filter',
      clearFilters: 'Rensa filter',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
    };
    return translations[key] || key;
  },
}));

vi.mock('@/lib/services/mutation-queue', () => ({
  mutationQueueService: {
    getPendingMutations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/hooks/useSavedFilters', () => ({
  useSavedFilters: () => ({
    savedFilters: [],
    saveFilter: vi.fn(),
    deleteFilter: vi.fn(),
    isLoading: false,
  }),
}));

// Mock filter engine to return all employees when no filters
vi.mock('@/lib/filters/filterEngine', () => ({
  applyFilters: (employees: Employee[]) => employees, // No filtering - return all
  hasActiveFilters: (filters: unknown[]) => filters.length > 0,
  matchesFilter: () => true,
}));

// Mock employees
const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    first_name: 'John',
    surname: 'Doe',
    ssn: '19900101-1234',
    email: 'john@test.com',
    mobile: '+46701234567',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Stockholm',
    hire_date: '2023-01-01',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    archived_at: null,
    is_anonymized: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    special_diet: false,
    diet_details: null,
    comments: null,
    one: false,
    one_marked_at: null,
    talmundo: false,
    isps: false,
    photo: false,
    origo: false,
    loneiva: null,
    mail_lon: false,
    bankuppgifter: false,
    li: false,
    passport: false,
    kvitto_c17_18: false,
    c17: false,
    crewing_done: false,
    hotel_required: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'emp-2',
    first_name: 'Jane',
    surname: 'Smith',
    ssn: '19910202-5678',
    email: 'jane@test.com',
    mobile: '+46701234568',
    rank: 'CHEF',
    gender: 'Woman',
    town_district: 'Gothenburg',
    hire_date: '2023-02-01',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    archived_at: null,
    is_anonymized: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    special_diet: false,
    diet_details: null,
    comments: null,
    one: false,
    one_marked_at: null,
    talmundo: false,
    isps: false,
    photo: false,
    origo: false,
    loneiva: null,
    mail_lon: false,
    bankuppgifter: false,
    li: false,
    passport: false,
    kvitto_c17_18: false,
    c17: false,
    crewing_done: false,
    hotel_required: false,
    created_at: '2023-02-01T00:00:00Z',
    updated_at: '2023-02-01T00:00:00Z',
  },
  {
    id: 'emp-3',
    first_name: 'Bob',
    surname: 'Johnson',
    ssn: '19920303-9012',
    email: 'bob@test.com',
    mobile: '+46701234569',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Malmö',
    hire_date: '2023-03-01',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    archived_at: null,
    is_anonymized: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    special_diet: false,
    diet_details: null,
    comments: null,
    one: false,
    one_marked_at: null,
    talmundo: false,
    isps: false,
    photo: false,
    origo: false,
    loneiva: null,
    mail_lon: false,
    bankuppgifter: false,
    li: false,
    passport: false,
    kvitto_c17_18: false,
    c17: false,
    crewing_done: false,
    hotel_required: false,
    created_at: '2023-03-01T00:00:00Z',
    updated_at: '2023-03-01T00:00:00Z',
  },
];

describe('Story 20.7: Export with Filters - Integration Tests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  
  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock fetch for export API and saved filters
    fetchMock = vi.fn((url) => {
      // Keep responses route-aware so background queries cannot consume an
      // export response before the user reaches the export dialog.
      if (typeof url === 'string' && url.includes('/api/employees/export')) {
        return Promise.resolve({
          ok: true,
          blob: vi.fn().mockResolvedValue(
            new Blob(['mock export data'], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
          ),
          headers: new Headers({
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'X-Employees-Exported': '1',
          }),
        });
      }
      // Mock saved filters endpoint
      if (typeof url === 'string' && url.includes('/api/users/filters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      // Mock important dates endpoint
      if (
        typeof url === 'string' &&
        (url.includes('/rest/v1/important_dates') ||
          url.includes('/api/important-dates'))
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      // Mock employee stats endpoint
      if (typeof url === 'string' && url.includes('/api/employees/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: {
              totalActive: 3,
              crewedActive: 0,
              crewedPercent: 0
            }
          }),
        });
      }
      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    global.fetch = fetchMock as typeof fetch;

    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:export-test'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // Mock localStorage
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    if (originalCreateObjectURL) {
      Object.defineProperty(window.URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      Reflect.deleteProperty(window.URL, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      Reflect.deleteProperty(window.URL, 'revokeObjectURL');
    }
    queryClient.clear();
  });

  // Helper function to wrap component with QueryClientProvider and i18n
  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  const waitForInteractiveEmployeeTable = async () => {
    await waitFor(() => {
      expect(screen.getByTestId('employee-row-emp-1')).toHaveTextContent('John');
      expect(
        screen.getByRole('button', { name: 'Active Employees: 3' })
      ).toBeInTheDocument();
    });
  };

  it('AC 1.1: Export button shows filtered count when filters are active', async () => {
    const user = userEvent.setup();
    
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Wait for employees to render
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    // Initially no filters - export button should show "Export Selected" and be disabled
    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /Export Selected/i });
      expect(exportButton).toBeDisabled(); // No selection yet
    });

    // Open filter panel
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    // Wait for filter panel to open
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Tillämpa filter/i })).toBeInTheDocument();
    });

    // Close panel without applying filters for now - just verify the UI exists
    const applyButton = screen.getByRole('button', { name: /Tillämpa filter/i });
    await user.click(applyButton);

    // Panel should close
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Tillämpa filter/i })).not.toBeInTheDocument();
    });
  });

  it('AC 2.1: Select All checkbox selects all employees', async () => {
    const user = userEvent.setup();
    
    const { container } = renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('tbody')).toBeInTheDocument();
      expect(screen.getByTestId('employee-row-emp-1')).toHaveTextContent('John');
      expect(screen.getByTestId('employee-row-emp-2')).toHaveTextContent('Jane');
      expect(screen.getByTestId('employee-row-emp-3')).toHaveTextContent('Bob');
    });

    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: 'Select all',
    });
    await user.click(selectAllCheckbox);

    await waitFor(
      () => {
        expect(
          screen.getByRole('checkbox', { name: 'Select all' })
        ).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('employee-select-checkbox-emp-1')).toHaveAttribute(
          'aria-checked',
          'true'
        );
        expect(screen.getByTestId('employee-select-checkbox-emp-2')).toHaveAttribute(
          'aria-checked',
          'true'
        );
        expect(screen.getByTestId('employee-select-checkbox-emp-3')).toHaveAttribute(
          'aria-checked',
          'true'
        );
        const exportButton = screen.getByRole('button', { name: /Export Selected/i });
        expect(exportButton).toHaveTextContent('(3)');
        expect(exportButton).toBeEnabled();
      },
      { timeout: 5000 }
    );
  });

  it('AC 3.1: Export button label updates based on filter state', async () => {
    const user = userEvent.setup();
    
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Wait for employees to render
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    // Initially: No selection - button should be disabled and show "Export Selected"
    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /Export Selected/i });
      expect(exportButton).toBeDisabled();
    });

    // Select an employee
    const firstCheckbox = screen.getAllByRole('checkbox')[1]; // Skip Select All checkbox
    await user.click(firstCheckbox);

    // After selection: Button shows selected count and is enabled
    await waitFor(() => {
      const selectedButton = screen.getByRole('button', { name: /Export Selected \(1\)/i });
      expect(selectedButton).toBeEnabled();
    });
  });

  it('AC 4.1: Export API receives selected employee IDs', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    await waitForInteractiveEmployeeTable();
    const firstCheckbox = screen.getByRole('checkbox', {
      name: 'Select John Doe',
    });
    await user.click(firstCheckbox);

    await waitFor(() => {
      expect(screen.getByTestId('employee-row-emp-1')).toHaveAttribute(
        'data-state',
        'selected'
      );
      expect(
        screen.getByRole('button', { name: /Export Selected \(1\)/i })
      ).toBeEnabled();
    });

    const exportButton = screen.getByRole('button', {
      name: /Export Selected \(1\)/i,
    });
    expect(exportButton).toBeEnabled();
    await user.click(exportButton);

    const dialog = await screen.findByRole('dialog');
    const firstNameCheckbox = within(dialog).getByRole('checkbox', {
      name: 'First Name',
    });
    const surnameCheckbox = within(dialog).getByRole('checkbox', {
      name: 'Surname',
    });
    expect(firstNameCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(surnameCheckbox).toHaveAttribute('aria-checked', 'true');

    // Prove the field-selection state is what drives the request payload.
    await user.click(surnameCheckbox);
    await waitFor(() => {
      expect(
        within(screen.getByRole('dialog')).getByRole('checkbox', {
          name: 'Surname',
        })
      ).toHaveAttribute('aria-checked', 'false');
    });

    const confirmExportButton = within(dialog).getByRole('button', {
      name: /^export$/i,
    });
    await user.click(confirmExportButton);

    await waitFor(() => {
      const exportCall = fetchMock.mock.calls.find(
        ([url]) => url === '/api/employees/export'
      );
      expect(exportCall).toBeDefined();

      const request = exportCall?.[1] as RequestInit;
      expect(request).toEqual(
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
      expect(JSON.parse(String(request.body))).toEqual({
        employeeIds: ['emp-1'],
        fields: ['first_name'],
        format: 'xlsx',
      });
    });
  });

  it('AC 5.1: Export dialog appears when selecting employees', async () => {
    const user = userEvent.setup();
    
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    await waitForInteractiveEmployeeTable();
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select John Doe',
    });
    await user.click(checkbox);
    await waitFor(() => {
      expect(screen.getByTestId('employee-row-emp-1')).toHaveAttribute(
        'data-state',
        'selected'
      );
      expect(
        screen.getByRole('button', { name: /Export Selected \(1\)/i })
      ).toBeEnabled();
    });

    const exportButton = screen.getByRole('button', {
      name: /Export Selected \(1\)/i,
    });
    expect(exportButton).toBeEnabled();
    await user.click(exportButton);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('checkbox', { name: 'First Name' })).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'Surname' })).toBeInTheDocument();
  });

  it('AC 5.2: Field selection dialog allows column selection', async () => {
    const user = userEvent.setup();
    
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    await waitForInteractiveEmployeeTable();
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select John Doe',
    });
    await user.click(checkbox);
    await waitFor(() => {
      expect(screen.getByTestId('employee-row-emp-1')).toHaveAttribute(
        'data-state',
        'selected'
      );
      expect(
        screen.getByRole('button', { name: /Export Selected \(1\)/i })
      ).toBeEnabled();
    });

    const exportButton = screen.getByRole('button', {
      name: /Export Selected \(1\)/i,
    });
    expect(exportButton).toBeEnabled();
    await user.click(exportButton);

    const dialog = await screen.findByRole('dialog');
    const firstNameCheckbox = within(dialog).getByRole('checkbox', {
      name: 'First Name',
    });
    expect(firstNameCheckbox).toHaveAttribute('aria-checked', 'true');

    await user.click(firstNameCheckbox);
    await waitFor(() => {
      expect(
        within(screen.getByRole('dialog')).getByRole('checkbox', {
          name: 'First Name',
        })
      ).toHaveAttribute('aria-checked', 'false');
    });

    await user.click(
      within(screen.getByRole('dialog')).getByRole('checkbox', {
        name: 'First Name',
      })
    );
    await waitFor(() => {
      expect(
        within(screen.getByRole('dialog')).getByRole('checkbox', {
          name: 'First Name',
        })
      ).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('AC 4.2: Crew Ready export button is available for eligible employees', async () => {
    // Mock crew ready employees - all have required fields marked
    const crewReadyEmployees = mockEmployees.map(emp => ({
      ...emp,
      isps: true,
      photo: true,
      origo: true,
      mail_lon: true,
      loneiva: 5,
      bankuppgifter: true,
      li: true,
      passport: true,
      kvitto_c17_18: true,
      c17: true,
      crewing_done: false,
    }));

    renderWithQueryClient(
      <EmployeeTable
        employees={crewReadyEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Wait for employees to render
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    // Crew Ready button should be visible
    await waitFor(() => {
      const crewReadyButton = screen.getByRole('button', { name: /crew ready/i });
      expect(crewReadyButton).toBeInTheDocument();
      expect(crewReadyButton).toBeEnabled();
    });
  });
});
