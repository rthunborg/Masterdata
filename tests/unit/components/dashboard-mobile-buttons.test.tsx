/**
 * Dashboard Mobile Button Tests
 * Story 11.11: Mobile Responsive UI Tests
 * AC1: Dashboard Mobile Button Tests
 * 
 * Tests for button positioning and stacking on mobile viewports
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import DashboardPage from '@/app/dashboard/page';
import { useAuth } from '@/lib/hooks/use-auth';
import { useEmployees } from '@/lib/hooks/use-employees';
import { UserRole } from '@/lib/types/user';
import type { SessionUser } from '@/lib/types/user';
import {
  setViewportSize,
  VIEWPORTS,
  assertNoOverflow,
  assertStackedVertically,
  measureTouchTarget,
} from '@/../tests/helpers/responsive-test-helpers';

// Mock hooks
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/hooks/use-employees', () => ({
  useEmployees: vi.fn(),
}));

vi.mock('@/lib/hooks/use-available-pe3-dates', () => ({
  useAvailablePE3Dates: vi.fn(() => ({
    availableDates: [],
    totalAvailable: 0,
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: vi.fn(() => ({
    dates: [],
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: vi.fn(() => ({
    openModal: vi.fn(),
    isPreviewMode: false,
    modals: {
      addColumn: false,
      editColumn: null,
    },
    columnVisibility: {},
    initColumnVisibility: vi.fn(),
    toggleColumnVisibility: vi.fn(),
    resetColumnVisibility: vi.fn(),
    getVisibleColumns: vi.fn((columns) => columns),
  })),
}));

describe('Dashboard Mobile Button Tests (AC1)', () => {
  const mockHRAdminUser: SessionUser = {
    id: '1',
    email: 'hr@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01',
    auth_id: 'auth-1',
    last_active_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useEmployees).mockReturnValue({
      employees: [],
      isLoading: false,
      error: null,
      isConnected: true,
      refetch: vi.fn(),
      updatedEmployeeId: null,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: mockHRAdminUser,
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });
  });

  it('AC1: FAB is visible on mobile (<1024px) and desktop buttons are hidden', () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    // Check that FAB is present (it has aria-label="Open quick actions menu" or similar, 
    // but looking at the implementation of FloatingActionButton, the main button doesn't have an aria-label in the provided snippet.
    // Wait, let's check FloatingActionButton implementation again.
    // It renders a div with class 'fixed bottom-6 right-6 z-50'.
    // Inside it, there is a button.
    
    // Let's look for the FAB by its icon or class if aria-label is missing.
    // The snippet showed:
    // <button ... aria-label="Open quick actions menu" ...>
    // So it DOES have an aria-label.
    
    const fab = screen.getByLabelText('Open quick actions menu');
    expect(fab).toBeInTheDocument();
    
    // Check that desktop buttons are NOT present
    const addEmployeeDesktop = screen.queryByText('Lägg till anställd');
    const importEmployeeDesktop = screen.queryByText('Importera anställda');
    
    expect(addEmployeeDesktop).not.toBeInTheDocument();
    expect(importEmployeeDesktop).not.toBeInTheDocument();
  });

  it('AC1: Desktop buttons are visible on desktop (>=1024px)', () => {
    setViewportSize(1280, 800); // Desktop viewport
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    // Check that FAB is NOT present
    const fab = screen.queryByLabelText('Open quick actions menu');
    expect(fab).not.toBeInTheDocument();
    
    // Check that desktop buttons ARE present
    // Note: The text might be different depending on translation mock.
    // The test wrapper uses a mock translation.
    // Let's assume the keys are 'addEmployee' and 'importEmployees'.
    // If renderWithI18n uses real translations or a specific mock, we need to match that.
    // The previous tests used regex /Lägg till anställd|Add Employee/i.
    
    const addButton = screen.getByRole('button', { name: /Lägg till anställd|Add Employee/i });
    const importButton = screen.getByRole('button', { name: /Importera anställda|Import Employees/i });
    
    expect(addButton).toBeInTheDocument();
    expect(importButton).toBeInTheDocument();
  });

  it('AC1: FAB menu items are accessible when opened', async () => {
    setViewportSize(375, 667); // Mobile viewport
    const user = {
      setup: () => {}, // Mock user event setup if needed, but we can use fireEvent
    };
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    const fab = screen.getByLabelText('Open quick actions menu');
    
    // Click FAB to open menu
    // We need to import fireEvent
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(fab);
    
    // Now the menu items should be visible
    // The FAB implementation shows buttons with aria-label "Add Employee", "Import CSV", "Quick Search"
    
    const addEmployeeFab = screen.getByLabelText('Add Employee');
    const importCsvFab = screen.getByLabelText('Import CSV');
    
    expect(addEmployeeFab).toBeInTheDocument();
    expect(importCsvFab).toBeInTheDocument();
  });
});

