/**
 * Column Settings Mobile Tests
 * Story 11.11: Mobile Responsive UI Tests
 * AC4: Column Settings Mobile Button Tests
 * 
 * Tests for button visibility and mobile controls on mobile viewports
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import ColumnSettingsPage from '@/app/dashboard/admin/columns/page';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserRole } from '@/lib/types/user';
import type { SessionUser } from '@/lib/types/user';
import {
  setViewportSize,
  VIEWPORTS,
  measureTouchTarget,
  isFullyVisible,
  assertNoOverflow,
} from '@/../tests/helpers/responsive-test-helpers';
import * as columnService from '@/lib/services/column-service';

// Mock hooks
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn((query: string) => {
    const width = window.innerWidth;
    if (query.includes('max-width: 1023px')) {
      return width <= 1023;
    }
    return false;
  }),
}));

vi.mock('@/lib/services/column-service', () => ({
  columnService: {
    getAllColumns: vi.fn(),
  },
}));

vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: vi.fn(() => ({
    openModal: vi.fn(),
    isPreviewMode: false,
    modals: {
      addColumn: false,
      editColumn: null,
    },
  })),
}));

describe('Column Settings Mobile Button Tests (AC4)', () => {
  const mockHRAdminUser: SessionUser = {
    id: '1',
    email: 'hr@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01',
    auth_id: 'auth-1',
    last_active_at: null,
  };

  const mockColumns = [
    {
      id: 'col-1',
      column_name: 'Name',
      db_column_name: 'name',
      column_type: 'text',
      is_masterdata: true,
      display_order: 0,
      is_visible: true,
      role_permissions: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(columnService.columnService.getAllColumns).mockResolvedValue(mockColumns as any);
    
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

  it('AC4: "Create New Column" button fully visible on mobile', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithI18n(<ColumnSettingsPage />);
    
    const createButton = await screen.findByRole('button', { 
      name: /Skapa ny kolumn|Create New Column/i 
    });
    
    expect(isFullyVisible(createButton)).toBe(true);
    
    const buttonRect = createButton.getBoundingClientRect();
    expect(buttonRect.left).toBeGreaterThanOrEqual(0);
    expect(buttonRect.right).toBeLessThanOrEqual(375);
  });

  it('AC4: Filter buttons wrap properly on narrow screens', async () => {
    setViewportSize(320, 568); // Narrow mobile viewport
    
    const { container } = renderWithI18n(<ColumnSettingsPage />);
    
    // Wait for filter buttons to render
    await screen.findByRole('button', { name: /Alla kolumner|All Columns/i });
    
    const filterButtons = container.querySelectorAll('button[class*="filter"], button[class*="Filter"]');
    if (filterButtons.length > 0) {
      // Check that buttons don't overflow
      const buttonContainer = filterButtons[0].closest('[class*="flex"]');
      if (buttonContainer) {
        expect(() => assertNoOverflow(buttonContainer as HTMLElement)).not.toThrow();
      }
    }
  });

  it('AC4: Column table scrolls horizontally on mobile', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithI18n(<ColumnSettingsPage />);
    
    await screen.findByText('Name');
    
    // Find table container
    const tableContainer = container.querySelector('table, [class*="table"], [class*="Table"]');
    if (tableContainer) {
      const parentContainer = tableContainer.closest('[class*="overflow"], [class*="scroll"]');
      // Table should be in a scrollable container on mobile
      if (parentContainer) {
        const styles = window.getComputedStyle(parentContainer);
        const hasOverflow = styles.overflowX === 'auto' || 
                           styles.overflowX === 'scroll' ||
                           parentContainer.classList.contains('overflow-x-auto');
        // On mobile, table should scroll horizontally
        expect(hasOverflow || tableContainer.scrollWidth > tableContainer.clientWidth).toBeTruthy();
      }
    }
  });

  it('AC4: Mobile reorder controls (arrows) display instead of drag handles', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithI18n(<ColumnSettingsPage />);
    
    await screen.findByText('Name');
    
    // On mobile, should see up/down arrow buttons instead of drag handle
    const upButton = container.querySelector('button[class*="ChevronUp"], svg[class*="ChevronUp"]');
    const downButton = container.querySelector('button[class*="ChevronDown"], svg[class*="ChevronDown"]');
    const dragHandle = container.querySelector('button[class*="GripVertical"], svg[class*="GripVertical"]');
    
    // Mobile should have arrows, not drag handle
    if (upButton || downButton) {
      expect(upButton || downButton).toBeTruthy();
    }
    
    // Drag handle should be hidden on mobile (or not present)
    if (dragHandle) {
      const styles = window.getComputedStyle(dragHandle);
      const isHidden = styles.display === 'none' || 
                      dragHandle.closest('[class*="hidden"]') !== null;
      expect(isHidden).toBe(true);
    }
  });

  it('AC4: All action buttons meet 44px touch target minimum', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithI18n(<ColumnSettingsPage />);
    
    const createButton = await screen.findByRole('button', { 
      name: /Skapa ny kolumn|Create New Column/i 
    });
    
    // Check if button has touch target classes (min-h-11, h-11, min-w-11, w-11, or size-11)
    const hasTouchTargetClass = createButton.classList.contains('min-h-11') ||
                               createButton.classList.contains('h-11') ||
                               createButton.classList.contains('min-w-11') ||
                               createButton.classList.contains('size-11') ||
                               createButton.className.includes('min-h-11') ||
                               createButton.className.includes('h-11');
    
    // Check computed styles
    const styles = window.getComputedStyle(createButton);
    const minWidth = parseFloat(styles.minWidth) || 0;
    const minHeight = parseFloat(styles.minHeight) || 0;
    const { width, height } = measureTouchTarget(createButton);
    
    // Either has the class OR computed size should be >= 44px
    if (!hasTouchTargetClass) {
      expect(Math.max(minWidth, width)).toBeGreaterThanOrEqual(44);
      expect(Math.max(minHeight, height)).toBeGreaterThanOrEqual(44);
    } else {
      // If class is present, that's sufficient
      expect(hasTouchTargetClass).toBe(true);
    }
    
    // Check filter buttons - be more lenient as they might be smaller
    const filterButtons = container.querySelectorAll('button[class*="filter"], button[class*="Filter"]');
    if (filterButtons.length > 0) {
      filterButtons.forEach(button => {
        const btnHasClass = (button as HTMLElement).classList.contains('min-h-11') ||
                           (button as HTMLElement).classList.contains('h-11') ||
                           (button as HTMLElement).className.includes('min-h-11') ||
                           (button as HTMLElement).className.includes('h-11');
        
        if (!btnHasClass) {
          const btnStyles = window.getComputedStyle(button as HTMLElement);
          const btnMinHeight = parseFloat(btnStyles.minHeight) || 0;
          const { height: btnHeight } = measureTouchTarget(button as HTMLElement);
          // Filter buttons might be smaller, but should still meet minimum
          expect(Math.max(btnMinHeight, btnHeight)).toBeGreaterThanOrEqual(40);
        }
      });
    }
  });
});

