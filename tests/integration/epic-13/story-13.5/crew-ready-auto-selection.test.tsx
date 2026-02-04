/**
 * Integration Tests for Crew Ready Auto-Selection
 * Story 13.5: Crew Ready Filter Auto-Selection
 * 
 * **SKIPPED - Story 20.1: Crew Ready Dropdown Removed**
 * The crew ready dropdown filter was removed in Story 20.1 to consolidate
 * all filtering into the new advanced filter panel (Epic 20).
 * 
 * These tests verified UI interactions with the dropdown that no longer exists.
 * The crew ready export functionality remains and is tested elsewhere.
 * 
 * Tests verify:
 * 1. Crew ready filter activates and selects employees
 * 2. Selected employees show greyish tint
 * 3. Checkboxes are checked for selected employees
 * 4. Switching filters clears selection
 * 5. Employee count display shows correct number
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { EmployeeTable } from '@/components/dashboard/employee-table';
import type { Employee } from '@/lib/types/employee';
import { UserRole } from '@/lib/types/user';
import { canEditCrewingDone } from '@/lib/services/crewing-validation';

// Helper function to replace getCrewReadyEmployeeIds
function getCrewReadyEmployeeIds(employees: Employee[]): string[] {
  return employees
    .filter((employee) => canEditCrewingDone(employee))
    .map((employee) => employee.id);
}

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

// Mock network status
vi.mock('@/lib/hooks/use-network-status', () => ({
  useNetworkStatus: vi.fn(() => ({
    isOnline: true,
  })),
}));

// Mock mutation queue
vi.mock('@/lib/services/mutation-queue', () => ({
  mutationQueueService: {
    getPendingMutations: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock translations
vi.mock('@/lib/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

// Create mock employees
const createCrewReadyEmployee = (id: string, overrides: Partial<Employee> = {}): Employee => ({
  id,
  first_name: 'John',
  surname: 'Doe',
  ssn: '123456-7890',
  email: 'john@example.com',
  mobile: '+46701234567',
  rank: 'SEV',
  gender: 'Man',
  town_district: 'Göteborg',
  hire_date: '2025-01-15',
  stena_date: null,
  omc_date: null,
  pe3_date: null,
  termination_date: null,
  termination_reason: null,
  is_terminated: false,
  is_archived: false,
  repayment_needed_omc: null,
  repayment_needed_pe3: null,
  one: null,
  one_marked_at: null,
  talmundo: null,
  isps: true,
  photo: true,
  origo: true,
  loneiva: 1,
  mail_lon: true,
  bankuppgifter: true,
  li: true,
  passport: true,
  kvitto_c17_18: true,
  c17: true,
  crewing_done: true,
  comments: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const createNonCrewReadyEmployee = (id: string, overrides: Partial<Employee> = {}): Employee => ({
  ...createCrewReadyEmployee(id),
  isps: false, // Missing prerequisite
  crewing_done: false,
  ...overrides,
});

describe.skip('Story 13.5: Crew Ready Auto-Selection Integration - SKIPPED (Story 20.1)', () => {
  const mockOnEmployeeUpdated = vi.fn();
  const mockOnIncludeArchivedChange = vi.fn();
  const mockOnIncludeTerminatedChange = vi.fn();
  const mockOnNeedsRepaymentChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-select crew ready employees when filter is activated', { timeout: 15000 }, async () => {
    const crewReady1 = createCrewReadyEmployee('1');
    const crewReady2 = createCrewReadyEmployee('2');
    const nonCrewReady = createNonCrewReadyEmployee('3');
    const employees = [crewReady1, crewReady2, nonCrewReady];

    renderWithQueryClient(
      <EmployeeTable
        employees={employees}
        isLoading={false}
        onEmployeeUpdated={mockOnEmployeeUpdated}
        includeArchived={false}
        onIncludeArchivedChange={mockOnIncludeArchivedChange}
        includeTerminated={false}
        onIncludeTerminatedChange={mockOnIncludeTerminatedChange}
        needsRepayment={false}
        onNeedsRepaymentChange={mockOnNeedsRepaymentChange}
      />
    );

    // Find the crew ready filter select
    const filterSelect = screen.getByTestId('crew-status-filter');
    
    // Activate crew ready filter
    fireEvent.click(filterSelect);
    const crewReadyOption = screen.getByText('Crew Ready');
    fireEvent.click(crewReadyOption);

    // Wait for auto-selection to occur
    await waitFor(() => {
      const table = screen.getByRole('table');
      const checkboxes = within(table).getAllByRole('checkbox');
      // First checkbox is header "Select All", employee checkboxes start at index 1
      // Employee checkboxes (crew ready employees) should be checked
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();
      // Non-crew ready employee should be filtered out
      // 1 header checkbox + 2 employee checkboxes = 3 total
      expect(checkboxes).toHaveLength(3);
    });
  });

  it('should show greyish tint on selected employees', async () => {
    const crewReady1 = createCrewReadyEmployee('1');
    const employees = [crewReady1];

    renderWithQueryClient(
      <EmployeeTable
        employees={employees}
        isLoading={false}
        onEmployeeUpdated={mockOnEmployeeUpdated}
        includeArchived={false}
        onIncludeArchivedChange={mockOnIncludeArchivedChange}
        includeTerminated={false}
        onIncludeTerminatedChange={mockOnIncludeTerminatedChange}
        needsRepayment={false}
        onNeedsRepaymentChange={mockOnNeedsRepaymentChange}
      />
    );

    // Activate crew ready filter
    const filterSelect = screen.getByTestId('crew-status-filter');
    fireEvent.click(filterSelect);
    const crewReadyOption = screen.getByText('Crew Ready');
    fireEvent.click(crewReadyOption);

    // Wait for selection and check styling
    await waitFor(() => {
      const row = screen.getByTestId('employee-row-1');
      expect(row).toHaveClass(/bg-gray-100/);
    });
  });

  it('should display employee count when employees are selected', async () => {
    const crewReady1 = createCrewReadyEmployee('1');
    const crewReady2 = createCrewReadyEmployee('2');
    const employees = [crewReady1, crewReady2];

    renderWithQueryClient(
      <EmployeeTable
        employees={employees}
        isLoading={false}
        onEmployeeUpdated={mockOnEmployeeUpdated}
        includeArchived={false}
        onIncludeArchivedChange={mockOnIncludeArchivedChange}
        includeTerminated={false}
        onIncludeTerminatedChange={mockOnIncludeTerminatedChange}
        needsRepayment={false}
        onNeedsRepaymentChange={mockOnNeedsRepaymentChange}
      />
    );

    // Activate crew ready filter
    const filterSelect = screen.getByTestId('crew-status-filter');
    fireEvent.click(filterSelect);
    const crewReadyOption = screen.getByText('Crew Ready');
    fireEvent.click(crewReadyOption);

    // Wait for count display
    // Button text is "Exportera markerade anställda (2)" in Swedish (Export Selected button)
    // The count appears after employees are auto-selected
    await waitFor(() => {
      // Find any button that contains the count "(2)" - this should be the Export Selected button
      // We use a more lenient approach since the text might be split across elements
      const buttons = screen.getAllByRole('button');
      const buttonWithCount = buttons.find(btn => {
        const text = (btn.textContent || '').trim();
        // Check if button contains "(2)" - this indicates 2 employees are selected
        return text.includes('(2)');
      });
      expect(buttonWithCount).toBeDefined();
      expect(buttonWithCount).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('should clear selection when switching to another filter', async () => {
    const crewReady1 = createCrewReadyEmployee('1');
    const employees = [crewReady1];

    const { rerender } = renderWithQueryClient(
      <EmployeeTable
        employees={employees}
        isLoading={false}
        onEmployeeUpdated={mockOnEmployeeUpdated}
        includeArchived={false}
        onIncludeArchivedChange={mockOnIncludeArchivedChange}
        includeTerminated={false}
        onIncludeTerminatedChange={mockOnIncludeTerminatedChange}
        needsRepayment={false}
        onNeedsRepaymentChange={mockOnNeedsRepaymentChange}
      />
    );

    // Activate crew ready filter
    const filterSelect = screen.getByTestId('crew-status-filter');
    fireEvent.click(filterSelect);
    const crewReadyOption = screen.getByText('Crew Ready');
    fireEvent.click(crewReadyOption);

    // Wait for selection
    // First checkbox is header "Select All", employee checkboxes start at index 1
    await waitFor(() => {
      const table = screen.getByRole('table');
      const checkbox = within(table).getAllByRole('checkbox')[1];
      expect(checkbox).toBeChecked();
    });

    // Activate terminated filter (should clear selection and deactivate crew ready filter)
    // Simulate parent updating the prop
    rerender(
      <EmployeeTable
        employees={employees}
        isLoading={false}
        onEmployeeUpdated={mockOnEmployeeUpdated}
        includeArchived={false}
        onIncludeArchivedChange={mockOnIncludeArchivedChange}
        includeTerminated={true}
        onIncludeTerminatedChange={mockOnIncludeTerminatedChange}
        needsRepayment={false}
        onNeedsRepaymentChange={mockOnNeedsRepaymentChange}
      />
    );

    // Wait for selection to clear
    // First checkbox is header "Select All", employee checkboxes start at index 1
    await waitFor(() => {
      const table = screen.getByRole('table');
      const checkbox = within(table).getAllByRole('checkbox')[1]; // First employee
      expect(checkbox).not.toBeChecked();
    });

    // Crew ready filter should be deactivated (back to "Alla anställda" in Swedish)
    await waitFor(() => {
      const filterSelect = screen.getByTestId('crew-status-filter');
      expect(filterSelect).toHaveTextContent(/alla anställda/i);
    });
  });

  it('should allow manual selection override when crew ready filter is active', async () => {
    const crewReady1 = createCrewReadyEmployee('1');
    const crewReady2 = createCrewReadyEmployee('2');
    const employees = [crewReady1, crewReady2];

    renderWithQueryClient(
      <EmployeeTable
        employees={employees}
        isLoading={false}
        onEmployeeUpdated={mockOnEmployeeUpdated}
        includeArchived={false}
        onIncludeArchivedChange={mockOnIncludeArchivedChange}
        includeTerminated={false}
        onIncludeTerminatedChange={mockOnIncludeTerminatedChange}
        needsRepayment={false}
        onNeedsRepaymentChange={mockOnNeedsRepaymentChange}
      />
    );

    // Activate crew ready filter
    const filterSelect = screen.getByTestId('crew-status-filter');
    fireEvent.click(filterSelect);
    const crewReadyOption = screen.getByText('Crew Ready');
    fireEvent.click(crewReadyOption);

    // Wait for auto-selection
    // First checkbox is header "Select All", employee checkboxes start at index 1
    await waitFor(() => {
      const table = screen.getByRole('table');
      const checkboxes = within(table).getAllByRole('checkbox');
      expect(checkboxes[1]).toBeChecked(); // First employee
      expect(checkboxes[2]).toBeChecked(); // Second employee
    });

    // Manually uncheck first employee (index 1, not 0 which is header)
    const table = screen.getByRole('table');
    const checkboxes = within(table).getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // First employee should be unchecked, second should remain checked
    await waitFor(() => {
      const currentCheckboxes = within(table).getAllByRole('checkbox');
      expect(currentCheckboxes[1]).not.toBeChecked(); // First employee
      expect(currentCheckboxes[2]).toBeChecked(); // Second employee
    });
  });
});
