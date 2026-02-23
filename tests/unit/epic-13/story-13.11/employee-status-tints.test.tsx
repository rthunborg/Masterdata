import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Story 13.11: Employee Status Visual Indicators', () => {
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
  });

  describe('Task 1.1: Red Tint for Terminated Employees', () => {
    it('terminated employees show red tint class', () => {
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

    it('terminated employees do not show green tint', () => {
      const terminatedEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: true,
        crewing_done: true, // Even if crew ready, should show red
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
      expect(row).not.toHaveClass('bg-green-50/50');
    });

    it('archived terminated employees do not show red tint', () => {
      const archivedTerminatedEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: true,
        is_terminated: true,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[archivedTerminatedEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).not.toHaveClass('bg-red-50');
      expect(row).toHaveClass('bg-muted');
    });
  });

  describe('Task 2.1: Green Tint for Crew Ready Employees', () => {
    it('crew ready employees show green tint class', () => {
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

    it('normal employees do not show green tint', () => {
      const normalEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[normalEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).not.toHaveClass('bg-green-50/50');
      expect(row).not.toHaveClass('bg-red-50');
    });
  });

  describe('Task 3.1: Tint Priority Logic', () => {
    it('terminated + crew ready shows red tint only (terminated takes precedence)', () => {
      const terminatedCrewReadyEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: true,
        crewing_done: true,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[terminatedCrewReadyEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).toHaveClass('bg-red-50');
      expect(row).not.toHaveClass('bg-green-50/50');
    });

    it('normal employees show no status tint', () => {
      const normalEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[normalEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).not.toHaveClass('bg-red-50');
      expect(row).not.toHaveClass('bg-green-50/50');
    });
  });

  describe('Task 3.2: Selection and Status Tint Combination', () => {
    it('selected + terminated shows both tints (red background with grey overlay)', async () => {
      const terminatedEmployee: Employee = {
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
        is_archived: false,
        is_terminated: true,
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
        crewing_done: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[terminatedEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Initially not selected - should have status tint
      expect(row.className).toContain('bg-red-50');
      expect(row.className).not.toContain('bg-gray-100/50');

      // Select the row via checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Select John Doe/i });
      fireEvent.click(checkbox);

      // Should have both tints - wait for state update
      await waitFor(() => {
        const updatedRow = screen.getByTestId('employee-row-1');
        // Check selection state first
        expect(updatedRow).toHaveAttribute('data-state', 'selected');
        // Then check for both class types
        const className = updatedRow.className;
        expect(className).toContain('bg-red-50');
        expect(className).toContain('bg-gray-100/50');
      }, { timeout: 3000 });
    });

    it('selected + crew ready shows both tints (green background with grey overlay)', async () => {
      const crewReadyEmployee: Employee = {
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
        is_archived: false,
        is_terminated: false,
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
        crewing_done: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[crewReadyEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Initially not selected - should have status tint
      expect(row.className).toContain('bg-green-50/50');
      expect(row.className).not.toContain('bg-gray-100/50');

      // Select the row via checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Select John Doe/i });
      fireEvent.click(checkbox);

      // Should have both tints - wait for state update
      await waitFor(() => {
        const updatedRow = screen.getByTestId('employee-row-1');
        // Check selection state first
        expect(updatedRow).toHaveAttribute('data-state', 'selected');
        // Then check for both class types
        const className = updatedRow.className;
        expect(className).toContain('bg-green-50/50');
        expect(className).toContain('bg-gray-100/50');
      }, { timeout: 3000 });
    });
  });

  describe('Task 3.3: All Tint Combinations', () => {
    it('normal employee shows no tint', () => {
      const normalEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: false,
        crewing_done: false,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[normalEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).not.toHaveClass('bg-red-50');
      expect(row).not.toHaveClass('bg-green-50/50');
    });

    it('terminated employee shows red tint', () => {
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
    });

    it('crew ready employee shows green tint', () => {
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
    });

    it('terminated + crew ready shows red tint only', () => {
      const terminatedCrewReadyEmployee: Employee = {
        id: '1',
        first_name: 'John',
        surname: 'Doe',
        is_archived: false,
        is_terminated: true,
        crewing_done: true,
        one_marked_at: null,
        one: null,
      } as Employee;

      renderWithQueryClient(
        <EmployeeTable
          employees={[terminatedCrewReadyEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      expect(row).toHaveClass('bg-red-50');
      expect(row).not.toHaveClass('bg-green-50/50');
    });
  });
});

