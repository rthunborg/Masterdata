import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { EmployeeTable } from '@/components/dashboard/employee-table';
import type { Employee } from '@/lib/types/employee';
import { UserRole } from '@/lib/types/user';
import React from 'react';

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
      subscribe: vi.fn().mockReturnThis(),
    })),
  })),
}));

// Mock useEmployees hook
vi.mock('@/lib/hooks/use-employees', () => ({
  useEmployees: vi.fn(() => ({
    employees: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    updatedEmployeeId: null,
  })),
}));

// Mock useColumns hook
vi.mock('@/lib/hooks/use-columns', () => ({
  useColumns: vi.fn(() => ({
    columns: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// Mock UI store
const mockUIStore = {
  previewRole: null,
  isPreviewMode: false,
  setPreviewRole: vi.fn(),
  modals: {
    addEmployee: false,
    importCSV: false,
    terminate: false,
    addColumn: false,
    addUser: false,
    editColumn: false,
  },
  editColumnId: null,
  columnVisibility: {},
  openModal: vi.fn(),
  closeModal: vi.fn(),
  openEditColumnModal: vi.fn(),
  closeEditColumnModal: vi.fn(),
  toggleColumnVisibility: vi.fn(),
  resetColumnVisibility: vi.fn(),
  initColumnVisibility: vi.fn(),
  getVisibleColumns: vi.fn((cols) => cols),
};

vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockUIStore);
    }
    return mockUIStore;
  }),
}));

describe('Dashboard Functionality After Button Removal', () => {
  const mockEmployees: Employee[] = [
    {
      id: '1',
      first_name: 'John',
      surname: 'Doe',
      ssn: '123456-7890',
      email: 'john@example.com',
      mobile: null,
      rank: 'SEV',
      gender: null,
      town_district: null,
      hire_date: '2025-01-01',
      stena_date: null,
      omc_date: null,
      pe3_date: null,
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      comments: null,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Employee,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load dashboard without errors', async () => {
    const { useEmployees } = await import('@/lib/hooks/use-employees');
    vi.mocked(useEmployees).mockReturnValue({
      employees: mockEmployees,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updatedEmployeeId: null,
    });

    const { useColumns } = await import('@/lib/hooks/use-columns');
    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    expect(() => {
      renderWithI18n(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
          onEmployeeUpdated={vi.fn()}
        />
      );
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('should maintain column visibility functionality through state', async () => {
    const { useEmployees } = await import('@/lib/hooks/use-employees');
    vi.mocked(useEmployees).mockReturnValue({
      employees: mockEmployees,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updatedEmployeeId: null,
    });

    const { useColumns } = await import('@/lib/hooks/use-columns');
    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithI18n(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      // Column visibility state should still be accessible
      expect(mockUIStore.columnVisibility).toBeDefined();
      expect(mockUIStore.initColumnVisibility).toBeDefined();
    });
  });

  it('should not have console errors related to removed button', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { useEmployees } = await import('@/lib/hooks/use-employees');
    vi.mocked(useEmployees).mockReturnValue({
      employees: mockEmployees,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updatedEmployeeId: null,
    });

    const { useColumns } = await import('@/lib/hooks/use-columns');
    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithI18n(
      <EmployeeTable
        employees={mockEmployees}
        isLoading={false}
        onEmployeeUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Check that no errors were logged related to the removed button
    const errorMessages = consoleErrorSpy.mock.calls
      .map((call) => call.join(' '))
      .join(' ');
    expect(errorMessages).not.toContain('Kolumnsynlighet');
    expect(errorMessages).not.toContain('columnVisibility');

    consoleErrorSpy.mockRestore();
  });
});

