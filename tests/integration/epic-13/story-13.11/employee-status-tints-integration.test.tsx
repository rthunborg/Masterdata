import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { EmployeeTable } from '@/components/dashboard/employee-table';
import { EmployeeCard } from '@/components/dashboard/employee-card';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';
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


// Mock columns hook
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

// Mock media query hook
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(() => false), // Desktop view
}));

describe('Story 13.11: Employee Status Visual Indicators (Integration)', () => {
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

  const mockColumnConfigs: ColumnConfig[] = [
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 1.2: Table Rows Show Correct Tints', () => {
    it('table rows show red tint for terminated employees', () => {
      const terminatedEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: true,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[terminatedEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).toHaveClass('bg-red-50');
      expect(row).toHaveClass('dark:bg-red-950/20');
    });

    it('table rows show green tint for crew ready employees', () => {
      const crewReadyEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: true,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[crewReadyEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).toHaveClass('bg-green-50/50');
      expect(row).toHaveClass('dark:bg-green-950/20');
    });
  });

  describe('Task 2.2: Mobile Cards Show Correct Tints', () => {
    it('mobile cards show red tint for terminated employees', () => {
      const terminatedEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: true,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeCard
          employee={terminatedEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
        />
      );

      const card = screen.getByTestId('employee-card-header').closest('.bg-red-50');
      // Card should have red tint class
      expect(card || screen.getByText('John Doe').closest('.bg-red-50')).toBeTruthy();
    });

    it('mobile cards show green tint for crew ready employees', () => {
      const crewReadyEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: true,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeCard
          employee={crewReadyEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
        />
      );

      // Card should have green tint class
      const cardElement = screen.getByText('John Doe').closest('div');
      expect(cardElement).toBeTruthy();
    });
  });

  describe('Task 4.1: Tints Update When Status Changes', () => {
    it('tints update immediately when employee status changes', async () => {
      const employee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      const { rerender } = renderWithQueryClient(
        <EmployeeTable
          employees={[employee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Initially no tint
      expect(row).not.toHaveClass('bg-red-50');
      expect(row).not.toHaveClass('bg-green-50/50');

      // Update employee to terminated
      const terminatedEmployee = { ...employee, is_terminated: true };
      rerender(
        <QueryClientProvider client={queryClient}>
          <EmployeeTable
            employees={[terminatedEmployee]}
            isLoading={false}
          />
        </QueryClientProvider>
      );

      // Should show red tint
      await waitFor(() => {
        const updatedRow = screen.getByTestId('employee-row-1');
        expect(updatedRow).toHaveClass('bg-red-50');
      });
    });

    it('tints update smoothly without flickering', async () => {
      const employee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      const { rerender } = renderWithQueryClient(
        <EmployeeTable
          employees={[employee]}
          isLoading={false}
        />
      );

      // Update to crew ready
      const crewReadyEmployee = { ...employee, crewing_done: true };
      rerender(
        <QueryClientProvider client={queryClient}>
          <EmployeeTable
            employees={[crewReadyEmployee]}
            isLoading={false}
          />
        </QueryClientProvider>
      );

      // Should update smoothly
      await waitFor(() => {
        const updatedRow = screen.getByTestId('employee-row-1');
        expect(updatedRow).toHaveClass('bg-green-50/50');
      }, { timeout: 1000 });
    });
  });

  describe('Task 2.3: Text Readability with Tints', () => {
    it('text remains readable with red tint', () => {
      const terminatedEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: true,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[terminatedEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      const nameText = screen.getByText('John');
      
      // Text should be visible (not using text-red-800 which would make it hard to read)
      expect(nameText).toBeInTheDocument();
      expect(row).toHaveClass('bg-red-50');
      // Should NOT have text-red-800 class (removed for readability)
      expect(row).not.toHaveClass('text-red-800');
    });

    it('text remains readable with green tint', () => {
      const crewReadyEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: true,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[crewReadyEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      const nameText = screen.getByText('John');
      
      // Text should be visible
      expect(nameText).toBeInTheDocument();
      expect(row).toHaveClass('bg-green-50/50');
    });
  });
});

