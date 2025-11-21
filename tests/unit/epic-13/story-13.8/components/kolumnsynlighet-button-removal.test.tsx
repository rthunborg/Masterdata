import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { EmployeeTable } from '@/components/dashboard/employee-table';
import type { Employee } from '@/lib/types/employee';
import { UserRole } from '@/lib/types/user';

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

// Mock Supabase client for hooks
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
    removeChannel: vi.fn(),
  })),
}));

// Mock fetch for hooks
global.fetch = vi.fn();

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
    columns: [
      { 
        id: 'first_name', 
        column_name: 'First Name', 
        column_type: 'text', 
        is_masterdata: true, 
        category: null, 
        is_visible: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
        },
        created_at: '2025-01-01T00:00:00Z',
        db_column_name: 'first_name',
        category_color: '#FFFFFF',
        display_order: 0,
        updated_at: new Date().toISOString(),
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// Mock important dates hook
vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: vi.fn(() => ({
    dates: [],
    isLoading: false,
    error: null,
  })),
}));

// Mock network status hook
vi.mock('@/lib/hooks/use-network-status', () => ({
  useNetworkStatus: vi.fn(() => ({
    isOnline: true,
  })),
}));

// Mock mutation queue service
vi.mock('@/lib/services/mutation-queue', () => ({
  mutationQueueService: {
    getPendingMutations: vi.fn(() => Promise.resolve([])),
  },
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

describe('Kolumnsynlighet Button Removal', () => {
  const mockEmployees: Employee[] = [
    {
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      role: UserRole.HR_ADMIN,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render the Kolumnsynlighet button', async () => {
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
      columns: [
        { 
          id: 'first_name', 
          column_name: 'First Name', 
          column_type: 'text', 
          is_masterdata: true, 
          category: null, 
          is_visible: true,
          role_permissions: {
            hr_admin: { view: true, edit: true },
          },
          created_at: '2025-01-01T00:00:00Z',
          db_column_name: 'first_name',
          category_color: '#FFFFFF',
          display_order: 0,
          updated_at: new Date().toISOString(),
        },
      ],
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
      // Verify the button with "Kolumnsynlighet" text is not present
      const button = screen.queryByText('Kolumnsynlighet');
      expect(button).not.toBeInTheDocument();
    });
  });

  it('should not have broken references or errors', async () => {
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
      columns: [
        { 
          id: 'first_name', 
          column_name: 'First Name', 
          column_type: 'text', 
          is_masterdata: true, 
          category: null, 
          is_visible: true,
          role_permissions: {
            hr_admin: { view: true, edit: true },
          },
          created_at: '2025-01-01T00:00:00Z',
          db_column_name: 'first_name',
          category_color: '#FFFFFF',
          display_order: 0,
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Should not throw any errors
    expect(() => {
      renderWithI18n(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
          onEmployeeUpdated={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it('should render dashboard correctly without the button', async () => {
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
      columns: [
        { 
          id: 'first_name', 
          column_name: 'First Name', 
          column_type: 'text', 
          is_masterdata: true, 
          category: null, 
          is_visible: true,
          role_permissions: {
            hr_admin: { view: true, edit: true },
          },
          created_at: '2025-01-01T00:00:00Z',
          db_column_name: 'first_name',
          category_color: '#FFFFFF',
          display_order: 0,
          updated_at: new Date().toISOString(),
        },
      ],
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
      // Dashboard should still render - check for employee data or table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('should not use columnVisibility translation key for button', async () => {
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
      columns: [
        { 
          id: 'first_name', 
          column_name: 'First Name', 
          column_type: 'text', 
          is_masterdata: true, 
          category: null, 
          is_visible: true,
          role_permissions: {
            hr_admin: { view: true, edit: true },
          },
          created_at: '2025-01-01T00:00:00Z',
          db_column_name: 'first_name',
          category_color: '#FFFFFF',
          display_order: 0,
          updated_at: new Date().toISOString(),
        },
      ],
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
      // Verify no button uses the removed translation key
      // The columnVisibility state is still used for filtering, but not for a button label
      const buttons = screen.queryAllByRole('button');
      const kolumnsynlighetButtons = buttons.filter(
        (btn) => btn.textContent?.includes('Kolumnsynlighet')
      );
      expect(kolumnsynlighetButtons).toHaveLength(0);
    });
  });
});

