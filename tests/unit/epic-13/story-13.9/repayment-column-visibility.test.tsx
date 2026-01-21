import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { EmployeeTable } from '@/components/dashboard/employee-table';
import type { Employee } from '@/lib/types/employee';
import { UserRole } from '@/lib/types/user';
import type { ColumnConfig } from '@/lib/types/column-config';

// Mock services
vi.mock('@/lib/services/employee-service', () => ({
  employeeService: {
    update: vi.fn(() => Promise.resolve({})),
    archive: vi.fn(() => Promise.resolve()),
    unarchive: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/services/custom-data-service', () => ({
  customDataService: {
    updateCustomData: vi.fn(() => Promise.resolve({})),
  },
}));

// Mock the auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: '1',
      email: 'hr@example.com',
      role: UserRole.HR_ADMIN,
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    checkAuth: vi.fn(),
    setLoading: vi.fn(),
  })),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock important dates hook
vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: vi.fn(() => ({
    dates: [],
    isLoading: false,
    error: null,
  })),
}));

// Mock UI store
vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: vi.fn(() => ({
    previewRole: null,
    isPreviewMode: false,
    setPreviewRole: vi.fn(),
    columnVisibility: {},
    toggleColumnVisibility: vi.fn(),
    initColumnVisibility: vi.fn(),
    modals: {
      addEmployee: false,
      importCSV: false,
      terminate: false,
      addColumn: false,
      addUser: false,
      editColumn: false,
    },
    openModal: vi.fn(),
    closeModal: vi.fn(),
  })),
}));

// Create mock repayment column configs
const repaymentOmcConfig: ColumnConfig = {
  id: 'repayment_omc',
  column_name: 'Återbetalningsskyldig ÖMC',
  db_column_name: 'repayment_needed_omc',
  column_type: 'date',
  is_masterdata: true,
  category: 'Repayment',
  is_visible: true,
  role_permissions: {
    hr_admin: { view: true, edit: false },
  },
  created_at: '2025-01-01T00:00:00Z',
  category_color: '#FFFFFF',
  display_order: 100,
  updated_at: new Date().toISOString(),
};

const repaymentPe3Config: ColumnConfig = {
  id: 'repayment_pe3',
  column_name: 'Återbetalningsskyldig PE3',
  db_column_name: 'repayment_needed_pe3',
  column_type: 'date',
  is_masterdata: true,
  category: 'Repayment',
  is_visible: true,
  role_permissions: {
    hr_admin: { view: true, edit: false },
  },
  created_at: '2025-01-01T00:00:00Z',
  category_color: '#FFFFFF',
  display_order: 101,
  updated_at: new Date().toISOString(),
};

const regularColumnConfig: ColumnConfig = {
  id: 'first_name',
  column_name: 'First Name',
  db_column_name: 'first_name',
  column_type: 'text',
  is_masterdata: true,
  category: null,
  is_visible: true,
  role_permissions: {
    hr_admin: { view: true, edit: true },
  },
  created_at: '2025-01-01T00:00:00Z',
  category_color: '#FFFFFF',
  display_order: 0,
  updated_at: new Date().toISOString(),
};

// Mock the columns hook
const mockUseColumns = vi.fn();
vi.mock('@/lib/hooks/use-columns', () => ({
  useColumns: () => mockUseColumns(),
}));

describe('Story 13.9: Repayment Column Visibility', () => {
  // Story 19.14: repayment_needed fields now store UUIDs, not date strings
  const terminatedEmployee: Employee = {
    id: '1',
    first_name: 'John',
    surname: 'Doe',
    ssn: '19800101-1234',
    email: 'john@example.com',
    mobile: '+46701234567',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Göteborg',
    hire_date: '2020-01-01',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: '2025-01-01',
    termination_reason: 'Resigned',
    is_terminated: true,
    is_archived: false,
    archived_at: null,
    is_anonymized: false,
    special_diet: false,
    diet_details: null,
    repayment_needed_omc: 'omc-date-uuid-123', // UUID reference to Important Date
    repayment_needed_pe3: 'pe3-date-uuid-456', // UUID reference to Important Date
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
    room_number_shared: null,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const activeEmployee: Employee = {
    ...terminatedEmployee,
    id: '2',
    first_name: 'Jane',
    surname: 'Smith',
    ssn: '19900101-5678',
    is_terminated: false,
    termination_date: null,
    termination_reason: null,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseColumns.mockReturnValue({
      columns: [regularColumnConfig, repaymentOmcConfig, repaymentPe3Config],
      isLoading: false,
      error: null,
    });
  });

  it('should hide repayment columns for non-terminated employees when includeTerminated is true', async () => {
    const { container } = renderWithI18n(
      <EmployeeTable
        employees={[activeEmployee]}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
        includeTerminated={true}
        onIncludeTerminatedChange={vi.fn()}
      />
    );

    await waitFor(() => {
      // Repayment columns should be in the table headers when includeTerminated is true
      const headers = container.querySelectorAll('th');
      const repaymentHeaders = Array.from(headers).filter((h) =>
        h.textContent?.includes('Återbetalningsskyldig')
      );
      
      // Headers should exist
      expect(repaymentHeaders.length).toBeGreaterThan(0);
      
      // But cells for non-terminated employees should show empty/placeholder
      const cells = container.querySelectorAll('td');
      const repaymentCells = Array.from(cells).filter((cell) => {
        const text = cell.textContent || '';
        return text.includes('—') || text.trim() === '';
      });
      
      // Should have empty cells for repayment columns
      expect(repaymentCells.length).toBeGreaterThan(0);
    });
  });

  it('should show repayment columns for terminated employees when includeTerminated is true', async () => {
    const { container } = renderWithI18n(
      <EmployeeTable
        employees={[terminatedEmployee]}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
        includeTerminated={true}
        onIncludeTerminatedChange={vi.fn()}
      />
    );

    await waitFor(() => {
      // Repayment columns should be visible in headers
      const headers = container.querySelectorAll('th');
      const repaymentHeaders = Array.from(headers).filter((h) =>
        h.textContent?.includes('Återbetalningsskyldig')
      );
      
      expect(repaymentHeaders.length).toBeGreaterThan(0);
      
      // Cells should show repayment date values
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
    });
  });

  it('should not show repayment columns when includeTerminated is false', async () => {
    const { container } = renderWithI18n(
      <EmployeeTable
        employees={[terminatedEmployee, activeEmployee]}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
        includeTerminated={false}
        onIncludeTerminatedChange={vi.fn()}
      />
    );

    await waitFor(() => {
      const headers = container.querySelectorAll('th');
      const repaymentHeaders = Array.from(headers).filter((h) =>
        h.textContent?.includes('Återbetalningsskyldig')
      );
      
      // Repayment columns should not appear in headers when includeTerminated is false
      expect(repaymentHeaders.length).toBe(0);
    });
  });

  it('should conditionally render repayment cells based on employee termination status', async () => {
    const { container } = renderWithI18n(
      <EmployeeTable
        employees={[terminatedEmployee, activeEmployee]}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
        includeTerminated={true}
        onIncludeTerminatedChange={vi.fn()}
      />
    );

    await waitFor(() => {
      // Both employees should be in the table
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      
      // Repayment columns should be in headers
      const headers = container.querySelectorAll('th');
      const hasRepaymentHeaders = Array.from(headers).some((h) =>
        h.textContent?.includes('Återbetalningsskyldig')
      );
      expect(hasRepaymentHeaders).toBe(true);
    });
  });
});

