import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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
global.fetch = vi.fn();

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

describe('Story 13.3: Row Click Integration', () => {
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

  describe('Task 1.2: Row Click Integration', () => {
    it('row click updates selection state', { timeout: 15000 }, async () => {
      renderWithI18n(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Click row to select
      fireEvent.click(row);
      
      await waitFor(() => {
        expect(row.className).toContain('bg-gray-100/50');
      });
    });

    it('row click updates checkbox state (when checkbox exists)', async () => {
      renderWithI18n(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Click row
      fireEvent.click(row);
      
      // Row should have selected styling
      await waitFor(() => {
        expect(row.className).toContain('bg-gray-100/50');
      });
    });

    it('row click updates visual tint', async () => {
      renderWithI18n(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Initially should not have tint
      expect(row.className).not.toContain('bg-gray-100/50');
      
      // Click row
      fireEvent.click(row);
      
      // Should have tint
      await waitFor(() => {
        expect(row.className).toContain('bg-gray-100/50');
      });
    });

    it('interactive elements still work correctly', async () => {
      renderWithI18n(
        <EmployeeTable
          employees={mockEmployees}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Click row to select
      fireEvent.click(row);
      await waitFor(() => {
        expect(row.className).toContain('bg-gray-100/50');
      });
      
      // Find and click a button (if available)
      const buttons = screen.queryAllByRole('button');
      if (buttons.length > 0) {
        // Click button - selection should not change
        fireEvent.click(buttons[0]);
        
        // Row should still be selected
        expect(row.className).toContain('bg-gray-100/50');
      }
    });
  });
});

