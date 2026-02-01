/**
 * Integration Tests: Story 20.7 - Export Verification & Fixes
 * 
 * Tests that export functionality correctly respects active filters.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeTable } from '@/components/dashboard/employee-table';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';

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
    columns: mockColumnConfigs,
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
  useTranslations: () => (key: string) => key,
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

// Mock column configs
const mockColumnConfigs: ColumnConfig[] = [
  {
    id: 'col-first-name',
    column_name: 'First Name',
    db_column_name: 'first_name',
    column_type: 'text',
    is_masterdata: true,
    is_checklist_item: false,
    display_order: 1,
    category: 'Personal',
    category_color: '#0000FF',
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: true },
    },
  },
  {
    id: 'col-surname',
    column_name: 'Surname',
    db_column_name: 'surname',
    column_type: 'text',
    is_masterdata: true,
    is_checklist_item: false,
    display_order: 2,
    category: 'Personal',
    category_color: '#0000FF',
    role_permissions: {
      hr_admin: { view: true, edit: true },
      recruiter: { view: true, edit: true },
    },
  },
];

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
    is_archived: false,
    is_terminated: false,
    crewing_done: false,
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
    is_archived: false,
    is_terminated: false,
    crewing_done: false,
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
    is_archived: false,
    is_terminated: false,
    crewing_done: false,
    created_at: '2023-03-01T00:00:00Z',
    updated_at: '2023-03-01T00:00:00Z',
  },
];

describe('Story 20.7: Export with Filters - Integration Tests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;
  
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
      // Mock saved filters endpoint
      if (typeof url === 'string' && url.includes('/api/users/filters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      // Mock important dates endpoint
      if (typeof url === 'string' && url.includes('/rest/v1/important_dates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    global.fetch = fetchMock as typeof fetch;

    // Mock localStorage
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  // Helper function to wrap component with QueryClientProvider
  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
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

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Initially no filters - find the general export button (not crew ready)
    const exportButtons = screen.getAllByRole('button', { name: /export/i });
    const exportButton = exportButtons.find(btn => btn.textContent?.includes('exportSelected'));
    expect(exportButton).toBeDefined();

    // Open filter panel
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    // Apply a text filter on First Name
    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'John');

    // Apply the filter
    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    // Wait for filter to be applied
    await waitFor(() => {
      const updatedButton = screen.getByRole('button', { name: /export filtered/i });
      expect(updatedButton).toHaveTextContent(/1/); // 1 employee matches
    });
  });

  it('AC 2.1: Select All checkbox selects only filtered employees', async () => {
    const user = userEvent.setup();
    
    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Open filter panel and apply filter
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'J'); // Matches John and Jane

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    // Wait for filter to be applied
    await waitFor(() => {
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(2); // Only John and Jane visible
    });

    // Click Select All checkbox
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    // Export button should show count of 2 (only filtered employees)
    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export selected/i });
      expect(exportButton).toHaveTextContent('(2)');
    });
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

    const exportButton = screen.getByRole('button', { name: /export/i });

    // Initially: No filters, no selection
    expect(exportButton).toHaveTextContent(/export/i);

    // Apply filter
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'John');

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    // After filter: Button shows filtered count
    await waitFor(() => {
      const updatedButton = screen.getByRole('button', { name: /export filtered/i });
      expect(updatedButton).toHaveTextContent('(1)');
    });

    // Select an employee
    const firstCheckbox = screen.getAllByRole('checkbox')[1]; // Skip Select All checkbox
    await user.click(firstCheckbox);

    // After selection: Button shows selected count
    await waitFor(() => {
      const selectedButton = screen.getByRole('button', { name: /export selected/i });
      expect(selectedButton).toHaveTextContent('(1)');
    });
  });

  it('AC 4.1: Export API receives filtered employee IDs', async () => {
    const user = userEvent.setup();
    
    // Mock successful export response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['mock csv data'], { type: 'text/csv' })),
      headers: new Headers({ 'X-Employees-Exported': '1' }),
    });

    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Apply filter to show only John
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'John');

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    // Wait for filter to apply
    await waitFor(() => {
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);
    });

    // Select the filtered employee
    const checkbox = screen.getAllByRole('checkbox')[1];
    await user.click(checkbox);

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export selected/i });
    await user.click(exportButton);

    // Should show field selection dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Select fields and confirm export
    const firstNameCheckbox = screen.getByLabelText(/First Name/i);
    await user.click(firstNameCheckbox);

    const confirmExportButton = screen.getByRole('button', { name: /export/i });
    await user.click(confirmExportButton);

    // Verify fetch was called with correct employee IDs (only John)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/employees/export',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('emp-1'), // Only John's ID
        })
      );

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.employeeIds).toEqual(['emp-1']);
      expect(callBody.employeeIds).not.toContain('emp-2');
      expect(callBody.employeeIds).not.toContain('emp-3');
    });
  });

  it('AC 5.1: Shows confirmation dialog when exporting filtered data', async () => {
    const user = userEvent.setup();
    
    // Ensure confirmation is not dismissed
    (Storage.prototype.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Apply filter
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'John');

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    // Select filtered employee
    await waitFor(() => {
      const checkbox = screen.getAllByRole('checkbox')[1];
      user.click(checkbox);
    });

    // Click export
    const exportButton = screen.getByRole('button', { name: /export selected/i });
    await user.click(exportButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/Export Filtered Employees/i)).toBeInTheDocument();
      expect(screen.getByText(/1 of 3/i)).toBeInTheDocument();
    });
  });

  it('AC 5.2: Remembers "Don\'t ask again" preference', async () => {
    const user = userEvent.setup();
    
    // Mock localStorage initially returning null
    (Storage.prototype.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

    renderWithQueryClient(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Apply filter and select employee
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'John');

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    await waitFor(() => {
      const checkbox = screen.getAllByRole('checkbox')[1];
      user.click(checkbox);
    });

    // Click export
    const exportButton = screen.getByRole('button', { name: /export selected/i });
    await user.click(exportButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/Export Filtered Employees/i)).toBeInTheDocument();
    });

    // Check "Don't ask again"
    const dontAskCheckbox = screen.getByLabelText(/don't ask/i);
    await user.click(dontAskCheckbox);

    // Confirm export
    const confirmButton = screen.getByRole('button', { name: /export \d+ employees/i });
    await user.click(confirmButton);

    // Verify localStorage was set
    await waitFor(() => {
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'export-confirmation-dismissed',
        'true'
      );
    });
  });

  it('AC 4.2: Crew Ready export respects filtered state', async () => {
    const user = userEvent.setup();
    
    // Mock crew ready employees
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

    // Mock successful crew ready export
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['crew ready csv'], { type: 'text/csv' })),
      headers: new Headers({ 'X-Employees-Exported': '1' }),
    });

    renderWithQueryClient(
      <EmployeeTable
        employees={crewReadyEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    // Apply filter to show only John
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'John');

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    // Click crew ready export
    await waitFor(() => {
      const crewReadyButton = screen.getByRole('button', { name: /crew ready/i });
      expect(crewReadyButton).toBeInTheDocument();
      user.click(crewReadyButton);
    });

    // Verify API was called with filtered employee IDs
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/employees/export-crew-ready',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('emp-1'),
        })
      );

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.selectedEmployeeIds).toHaveLength(1);
      expect(callBody.selectedEmployeeIds).toContain('emp-1');
    });
  });
});
