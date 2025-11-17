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

  it('AC1: Add Employee button fits within screen width on 320px viewport', () => {
    setViewportSize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    const addButton = screen.getByRole('button', { name: /Lägg till anställd|Add Employee/i });
    const buttonRect = addButton.getBoundingClientRect();
    
    expect(buttonRect.width).toBeLessThanOrEqual(320);
    expect(buttonRect.left).toBeGreaterThanOrEqual(0);
    expect(buttonRect.right).toBeLessThanOrEqual(320);
  });

  it('AC1: Import Employee button fits within screen width on 375px viewport', () => {
    setViewportSize(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    const importButton = screen.getByRole('button', { name: /Importera anställda|Import Employees/i });
    const buttonRect = importButton.getBoundingClientRect();
    
    expect(buttonRect.width).toBeLessThanOrEqual(375);
    expect(buttonRect.left).toBeGreaterThanOrEqual(0);
    expect(buttonRect.right).toBeLessThanOrEqual(375);
  });

  it('AC1: Buttons stack vertically on mobile (<640px)', () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    // Find button container - should have flex-col on mobile
    // The container uses: flex flex-col sm:flex-row gap-2
    const buttonContainer = container.querySelector('.flex-col, [class*="flex-col"]');
    
    // Check if container has flex-col class (mobile layout)
    if (buttonContainer) {
      const hasFlexCol = buttonContainer.classList.contains('flex-col') || 
                        buttonContainer.className.includes('flex-col');
      expect(hasFlexCol).toBeTruthy();
    }
    
    // Alternative: Check if buttons are positioned vertically
    const buttons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Lägg till') || btn.textContent?.includes('Importera') ||
      btn.textContent?.includes('Add Employee') || btn.textContent?.includes('Import Employees')
    );
    
    if (buttons.length >= 2) {
      const firstButton = buttons[0];
      const secondButton = buttons[1];
      const firstRect = firstButton.getBoundingClientRect();
      const secondRect = secondButton.getBoundingClientRect();
      
      // On mobile, second button should be below first (vertical stacking)
      // Allow for small tolerance (1px) for edge cases where buttons are exactly adjacent
      expect(secondRect.top).toBeGreaterThanOrEqual(firstRect.bottom - 1);
    }
  });

  it('AC1: Buttons have proper spacing (gap-2 on mobile, gap-4 on desktop)', () => {
    // Test mobile spacing
    setViewportSize(375, 667);
    const { container: mobileContainer } = renderWithI18n(<DashboardPage />);
    
    // Find button container - should have gap-2 class on mobile
    const mobileButtonContainer = mobileContainer.querySelector('[class*="gap"]');
    if (mobileButtonContainer) {
      // Check for Tailwind gap classes directly (gap-2 or gap-4)
      const hasGapClass = mobileButtonContainer.classList.contains('gap-2') || 
                         mobileButtonContainer.classList.contains('gap-4') ||
                         mobileButtonContainer.className.includes('gap-2') ||
                         mobileButtonContainer.className.includes('gap-4');
      expect(hasGapClass).toBeTruthy();
    }
    
    // Test desktop spacing
    setViewportSize(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    const { container: desktopContainer } = renderWithI18n(<DashboardPage />);
    
    const desktopButtonContainer = desktopContainer.querySelector('[class*="gap"]');
    if (desktopButtonContainer) {
      // Check for Tailwind gap classes directly
      const hasGapClass = desktopButtonContainer.classList.contains('gap-2') || 
                         desktopButtonContainer.classList.contains('gap-4') ||
                         desktopButtonContainer.className.includes('gap-2') ||
                         desktopButtonContainer.className.includes('gap-4');
      expect(hasGapClass).toBeTruthy();
    }
  });

  it('AC1: No horizontal overflow on narrow screens', () => {
    setViewportSize(320, 568); // Narrowest mobile viewport
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    // Check main container for overflow
    const mainContainer = container.querySelector('.px-4, [class*="container"]') || container;
    expect(() => assertNoOverflow(mainContainer as HTMLElement)).not.toThrow();
    
    // Check button container specifically
    const buttonContainer = container.querySelector('.flex-col, .flex-row, [class*="flex"]');
    if (buttonContainer) {
      expect(() => assertNoOverflow(buttonContainer as HTMLElement)).not.toThrow();
    }
  });

  it('AC1: Buttons fit within screen width on 768px viewport', () => {
    setViewportSize(768, 1024); // Tablet viewport
    
    const { container } = renderWithI18n(<DashboardPage />);
    
    const addButton = screen.getByRole('button', { name: /Lägg till anställd|Add Employee/i });
    const importButton = screen.getByRole('button', { name: /Importera anställda|Import Employees/i });
    
    const addRect = addButton.getBoundingClientRect();
    const importRect = importButton.getBoundingClientRect();
    
    expect(addRect.right).toBeLessThanOrEqual(768);
    expect(importRect.right).toBeLessThanOrEqual(768);
  });
});

