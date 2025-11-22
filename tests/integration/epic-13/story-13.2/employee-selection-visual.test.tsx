import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
global.fetch = vi.fn();

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

// Mock media query hook for mobile testing
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(() => true), // Return true for mobile
}));

describe('Story 13.2: Selection Visual Feedback (Integration)', () => {
  const mockEmployee: Employee = {
    id: '1',
    first_name: 'John',
    surname: 'Doe',
    is_archived: false,
    is_terminated: false,
    crewing_done: false,
    one_marked_at: null,
    one: null,
  } as Employee;

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

  describe('Desktop Table View', () => {
    it('selected rows show greyish tint', () => {
      renderWithI18n(
        <EmployeeTable
          employees={[mockEmployee]}
          isLoading={false}
        />
      );

      const checkbox = screen.getByLabelText(/Select John Doe/i);
      const row = screen.getByTestId('employee-row-1');
      
      // Initially no tint
      expect(row.className).not.toContain('bg-gray-100/50');
      
      // Select
      fireEvent.click(checkbox);
      
      // Should have tint
      expect(row.className).toContain('bg-gray-100/50');
    });

    it('unselected rows do not show tint', async () => {
      const user = userEvent.setup();
      renderWithI18n(
        <EmployeeTable
          employees={[mockEmployee]}
          isLoading={false}
        />
      );

      const row = screen.getByTestId('employee-row-1');
      
      // Select then deselect by clicking the row
      await user.click(row);
      expect(row.className).toContain('bg-gray-100/50');
      
      await user.click(row);
      expect(row.className).not.toContain('bg-gray-100/50');
    });

    it('tint works in light mode', () => {
      renderWithI18n(
        <EmployeeTable
          employees={[mockEmployee]}
          isLoading={false}
        />
      );

      const checkbox = screen.getByLabelText(/Select John Doe/i);
      const row = screen.getByTestId('employee-row-1');
      
      // Select
      fireEvent.click(checkbox);
      
      // Should have light mode tint
      expect(row.className).toContain('bg-gray-100/50');
    });

    it('tint works in dark mode', () => {
      renderWithI18n(
        <EmployeeTable
          employees={[mockEmployee]}
          isLoading={false}
        />
      );

      const checkbox = screen.getByLabelText(/Select John Doe/i);
      const row = screen.getByTestId('employee-row-1');
      
      // Select
      fireEvent.click(checkbox);
      
      // Should have dark mode tint (with opacity to combine with status tints)
      expect(row.className).toContain('dark:bg-gray-800/50');
    });
  });

  describe('Mobile Card View', () => {
    it('mobile cards show tint when selected', () => {
      const toggleSelection = vi.fn();
      
      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          isSelected={true}
          onToggleSelection={toggleSelection}
        />
      );

      // Card header should have tint when selected (with opacity to combine with status tints)
      const cardHeader = screen.getByTestId('employee-card-header');
      expect(cardHeader.className).toContain('bg-gray-100/50');
      expect(cardHeader.className).toContain('dark:bg-gray-800/50');
    });

    it('mobile cards do not show tint when unselected', () => {
      const toggleSelection = vi.fn();
      
      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          isSelected={false}
          onToggleSelection={toggleSelection}
        />
      );

      // Card header should not have tint when unselected
      const cardHeader = screen.getByTestId('employee-card-header');
      expect(cardHeader.className).not.toContain('bg-gray-100/50');
    });
  });
});

