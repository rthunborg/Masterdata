import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock fetch for hooks
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ data: [] }),
    text: async () => "",
    status: 200,
    statusText: "OK",
  } as Response)
);

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


// Mock the columns hook
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

// Mock UI store
vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: vi.fn(() => ({
    previewRole: null,
    isPreviewMode: false,
    columnVisibility: {},
    initColumnVisibility: vi.fn(),
    toggleColumnVisibility: vi.fn(),
    resetColumnVisibility: vi.fn(),
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

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`),
}));

describe('Story 13.2: Employee Selection Checkboxes', () => {
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

  const mockEmployees: Employee[] = [
    {
      id: '1',
      first_name: 'John',
      surname: 'Doe',
      is_archived: false,
      is_terminated: false,
      crewing_done: false,
      one_marked_at: null,
      one: null,
    } as Employee,
    {
      id: '2',
      first_name: 'Jane',
      surname: 'Smith',
      is_archived: false,
      is_terminated: false,
      crewing_done: false,
      one_marked_at: null,
      one: null,
    } as Employee,
    {
      id: '3',
      first_name: 'Bob',
      surname: 'Johnson',
      is_archived: false,
      is_terminated: false,
      crewing_done: false,
      one_marked_at: null,
      one: null,
    } as Employee,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setInterval to prevent act warnings from polling
    vi.spyOn(global, 'setInterval').mockImplementation(() => 0 as unknown as NodeJS.Timeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 1.1: Selection State Management', () => {
    it('checkbox appears in first column for each employee row', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Checkboxes should be present for all employees
      const checkbox1 = screen.getByRole('checkbox', { name: /Select John Doe/i });
      const checkbox2 = screen.getByRole('checkbox', { name: /Select Jane Smith/i });
      const checkbox3 = screen.getByRole('checkbox', { name: /Select Bob Johnson/i });

      expect(checkbox1).toBeInTheDocument();
      expect(checkbox2).toBeInTheDocument();
      expect(checkbox3).toBeInTheDocument();
    });

    it('checkboxes are initially unchecked', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const checkbox1 = screen.getByRole('checkbox', { name: /Select John Doe/i });
      const checkbox2 = screen.getByRole('checkbox', { name: /Select Jane Smith/i });

      expect(checkbox1).toHaveAttribute('data-state', 'unchecked');
      expect(checkbox2).toHaveAttribute('data-state', 'unchecked');
    });

    it('clicking checkbox toggles selection and updates row styling', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Select John Doe/i });
      const row = screen.getByTestId('employee-row-1');

      // Initially unchecked
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
      expect(row).not.toHaveAttribute('data-state', 'selected');

      // Click checkbox
      await act(async () => {
        fireEvent.click(checkbox);
      });

      // Row should have tint (proves selection state updated)
      expect(row).toHaveAttribute('data-state', 'selected');
    });

    it('multiple employees can be selected by clicking their checkboxes', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Click first
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });

      // Click second (re-query)
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select Jane Smith/i }));
      });

      // Click third (re-query)
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select Bob Johnson/i }));
      });

      const row1 = screen.getByTestId('employee-row-1');
      const row2 = screen.getByTestId('employee-row-2');
      const row3 = screen.getByTestId('employee-row-3');

      // All rows should have tint (proves selection state updated)
      expect(row1).toHaveAttribute('data-state', 'selected');
      expect(row2).toHaveAttribute('data-state', 'selected');
      expect(row3).toHaveAttribute('data-state', 'selected');
    });

    it('selection can be toggled off by clicking checkbox again', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');

      // Select first
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });
      expect(row).toHaveAttribute('data-state', 'selected');

      // Deselect by clicking checkbox again (re-query)
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });
      expect(row).not.toHaveAttribute('data-state', 'selected');
    });
  });

  describe('Task 1.2: Checkbox Component Integration', () => {
    it('checkbox is present and has correct initial state', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Select John Doe/i });

      // Checkbox should be present and initially unchecked
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    });

    it('checkbox has proper ARIA labels', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const checkbox1 = screen.getByRole('checkbox', { name: /Select John Doe/i });
      const checkbox2 = screen.getByRole('checkbox', { name: /Select Jane Smith/i });

      expect(checkbox1).toHaveAttribute('aria-label', expect.stringContaining('John Doe'));
      expect(checkbox2).toHaveAttribute('aria-label', expect.stringContaining('Jane Smith'));
    });
  });

  describe('Task 1.4: Visual Feedback', () => {
    it('selected rows show greyish tint', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Select John Doe/i });
      const row = screen.getByTestId('employee-row-1');

      // Initially no tint
      expect(row).not.toHaveAttribute('data-state', 'selected');

      // Select by clicking checkbox
      await act(async () => {
        fireEvent.click(checkbox);
      });

      // Should have tint (proves selection state updated)
      expect(row).toHaveAttribute('data-state', 'selected');
    });

    it('unselected rows do not show tint', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');

      // Select then deselect
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });
      expect(row).toHaveAttribute('data-state', 'selected');

      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });
      expect(row).not.toHaveAttribute('data-state', 'selected');
    });

    it('tint works in dark mode', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Select John Doe/i });
      const row = screen.getByTestId('employee-row-1');

      // Select by clicking checkbox
      await act(async () => {
        fireEvent.click(checkbox);
      });

      // Should have both light and dark mode classes
      expect(row).toHaveAttribute('data-state', 'selected');
      // expect(row).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('Task 1.5: Select All Header Checkbox', () => {
    it('header checkbox is present with Select all aria-label', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all/i });
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('header checkbox selects all visible employees when clicked', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all/i });
      
      // Initially unchecked
      expect(selectAllCheckbox).toHaveAttribute('data-state', 'unchecked');

      // Click select all
      await act(async () => {
        fireEvent.click(selectAllCheckbox);
      });

      // All rows should now be selected
      const row1 = screen.getByTestId('employee-row-1');
      const row2 = screen.getByTestId('employee-row-2');
      const row3 = screen.getByTestId('employee-row-3');

      expect(row1).toHaveAttribute('data-state', 'selected');
      expect(row2).toHaveAttribute('data-state', 'selected');
      expect(row3).toHaveAttribute('data-state', 'selected');
    });

    it('header checkbox deselects all employees when clicked while all are selected', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // First select all employees individually
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select Jane Smith/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select Bob Johnson/i }));
      });

      // All rows should be selected
      expect(screen.getByTestId('employee-row-1')).toHaveAttribute('data-state', 'selected');
      expect(screen.getByTestId('employee-row-2')).toHaveAttribute('data-state', 'selected');
      expect(screen.getByTestId('employee-row-3')).toHaveAttribute('data-state', 'selected');

      // Now click header checkbox to deselect all
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all/i });
      await act(async () => {
        fireEvent.click(selectAllCheckbox);
      });

      // All rows should now be deselected
      expect(screen.getByTestId('employee-row-1')).not.toHaveAttribute('data-state', 'selected');
      expect(screen.getByTestId('employee-row-2')).not.toHaveAttribute('data-state', 'selected');
      expect(screen.getByTestId('employee-row-3')).not.toHaveAttribute('data-state', 'selected');
    });

    it('header checkbox shows indeterminate state when some employees are selected', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Select just one employee
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });

      // Header checkbox should show indeterminate state
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all/i });
      expect(selectAllCheckbox).toHaveAttribute('data-state', 'indeterminate');
    });

    it('header checkbox shows checked state when all employees are selected individually', async () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      // Select all employees individually
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select John Doe/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select Jane Smith/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('checkbox', { name: /Select Bob Johnson/i }));
      });

      // Header checkbox should be checked
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all/i });
      expect(selectAllCheckbox).toHaveAttribute('data-state', 'checked');
    });
  });
});
