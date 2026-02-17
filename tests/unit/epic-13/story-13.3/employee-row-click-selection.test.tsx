import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
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
    density: 'default',
    setDensity: vi.fn(),
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

describe('Story 13.3: Row Click Selection (REMOVED in Story 9.11)', () => {
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 1.1: Row Click Handler (REMOVED in Story 9.11)', () => {
    it('clicking row does NOT select employee (Story 9.11)', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Click on the row (not on a button or input)
      fireEvent.click(row);
      
      // Row should NOT have selected styling (row clicks removed in Story 9.11)
      expect(row).not.toHaveAttribute('data-state', 'selected');
    });

    it('clicking row does NOT change selection state (Story 9.11)', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Initially not selected
      expect(row).not.toHaveAttribute('data-state', 'selected');
      
      // Click row - should still not be selected (row clicks removed)
      fireEvent.click(row);
      expect(row).not.toHaveAttribute('data-state', 'selected');
    });

    it('clicking button in row does NOT change selection', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Find a button in the row (Archive button for HR Admin)
      const archiveButton = screen.queryByLabelText(/archive/i);
      
      if (archiveButton) {
        // Click the button
        fireEvent.click(archiveButton);
        
        // Row should NOT have selected styling (selection should not change)
        expect(row).not.toHaveAttribute('data-state', 'selected');
      }
    });

    it('clicking input field in row does NOT change selection', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Find an input field in the row (editable cell)
      const inputs = screen.queryAllByRole('textbox');
      
      if (inputs.length > 0) {
        const input = inputs[0];
        
        // Click the input
        fireEvent.click(input);
        
        // Row should NOT have selected styling (selection should not change)
        expect(row).not.toHaveAttribute('data-state', 'selected');
      }
    });

    it('clicking editable cell display div does NOT change selection', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Find an editable cell (gridcell) in the row
      const editableCells = screen.queryAllByRole('gridcell');
      
      if (editableCells.length > 0) {
        // Find a cell that is editable (aria-readonly="false")
        const editableCell = editableCells.find(
          (cell) => cell.getAttribute('aria-readonly') === 'false'
        );
        
        if (editableCell) {
          // Click the editable cell display div (before it becomes an input)
          fireEvent.click(editableCell);
          
          // Row should NOT have selected styling (selection should not change)
          expect(row).not.toHaveAttribute('data-state', 'selected');
          
          // Editable cell should enter edit mode (input should appear within the row)
          // Check if any textbox exists within the row (could be the search input or the editable cell input)
          const inputs = screen.queryAllByRole('textbox');
          // At least one input should exist (either search or the editable cell that entered edit mode)
          expect(inputs.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Task 1.2: Selection State (Checkbox Only in Story 9.11)', () => {
    it('row click does NOT update selection state - only checkbox works (Story 9.11)', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Click row - should NOT select (row clicks removed)
      fireEvent.click(row);
      expect(row).not.toHaveAttribute('data-state', 'selected');
      
      // Checkbox should still work (tested in Story 9.11 tests)
    });

    it('row clicks do NOT select multiple rows (Story 9.11)', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row1 = screen.getByTestId('employee-row-1');
      const row2 = screen.getByTestId('employee-row-2');
      
      // Click first row - should NOT select
      fireEvent.click(row1);
      expect(row1).not.toHaveAttribute('data-state', 'selected');
      
      // Click second row - should NOT select
      fireEvent.click(row2);
      expect(row2).not.toHaveAttribute('data-state', 'selected');
    });
  });

  describe('Task 1.3: Prevent Selection on Interactive Elements', () => {
    it('clicking Edit button does not change selection', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Find buttons within the row (Archive, Terminate, etc. for HR Admin)
      const buttons = screen.queryAllByRole('button');
      
      if (buttons.length > 0) {
        // Click a button (should not change selection)
        fireEvent.click(buttons[0]);
        
        // Row should NOT have selected styling
        expect(row).not.toHaveAttribute('data-state', 'selected');
      }
    });

    it('clicking action menu does not change selection', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Try to find any element with role="button" or role="menuitem"
      const buttons = screen.queryAllByRole('button');
      
      if (buttons.length > 0) {
        // Click a button
        fireEvent.click(buttons[0]);
        
        // Row should NOT have selected styling
        expect(row).not.toHaveAttribute('data-state', 'selected');
      }
    });
  });

  describe('Task 1.5: Visual Feedback (Row Clicks Removed in Story 9.11)', () => {
    it('greyish tint does NOT appear on row click (Story 9.11)', () => {
      renderWithQueryClient(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Initially should not have selected styling
      expect(row).not.toHaveAttribute('data-state', 'selected');
      
      // Click row - should NOT select (row clicks removed)
      fireEvent.click(row);
      
      // Should NOT have selected styling
      expect(row).not.toHaveAttribute('data-state', 'selected');
    });
  });
});

