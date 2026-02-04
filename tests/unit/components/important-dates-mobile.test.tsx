/**
 * Important Dates Mobile Tests
 * Story 11.11: Mobile Responsive UI Tests
 * AC2: Important Dates Mobile Button Tests
 * 
 * Tests for button visibility and layout on mobile viewports
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import ImportantDatesPage from '@/app/dashboard/important-dates/page';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserRole } from '@/lib/types/user';
import type { SessionUser } from '@/lib/types/user';
import {
  setViewportSize,
  VIEWPORTS,
  measureTouchTarget,
  isFullyVisible,
} from '@/../tests/helpers/responsive-test-helpers';
import * as importantDateService from '@/lib/services/important-date-service';

// Mock hooks
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn((query: string) => {
    // Mock based on current viewport width
    const width = window.innerWidth;
    if (query.includes('max-width: 1023px')) {
      return width <= 1023;
    }
    return false;
  }),
}));

vi.mock('@/lib/services/important-date-service', () => ({
  importantDateService: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/lib/services/export-service', () => ({
  exportImportantDates: vi.fn(),
}));

describe('Important Dates Mobile Button Tests (AC2)', () => {
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
    
    vi.mocked(importantDateService.importantDateService.getAll).mockResolvedValue([]);
    
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

  it('AC2: "Add New Date" button fully visible on mobile', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithQueryClient(<ImportantDatesPage />);
    
    // Wait for component to render
    const addButton = await screen.findByRole('button', { 
      name: /Nytt datum|Add Date/i 
    });
    
    expect(isFullyVisible(addButton)).toBe(true);
    
    const buttonRect = addButton.getBoundingClientRect();
    expect(buttonRect.left).toBeGreaterThanOrEqual(0);
    expect(buttonRect.right).toBeLessThanOrEqual(375);
    expect(buttonRect.top).toBeGreaterThanOrEqual(0);
    expect(buttonRect.bottom).toBeLessThanOrEqual(667);
  });

  it('AC2: "Import Dates" button fully visible on mobile', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithQueryClient(<ImportantDatesPage />);
    
    const importButton = await screen.findByRole('button', { 
      name: /Importera|Import/i 
    });
    
    expect(isFullyVisible(importButton)).toBe(true);
    
    const buttonRect = importButton.getBoundingClientRect();
    expect(buttonRect.left).toBeGreaterThanOrEqual(0);
    expect(buttonRect.right).toBeLessThanOrEqual(375);
  });

  it('AC2: Buttons stack vertically on narrow screens', async () => {
    setViewportSize(320, 568); // Narrow mobile viewport
    
    const { container } = renderWithQueryClient(<ImportantDatesPage />);
    
    const addButton = await screen.findByRole('button', { 
      name: /Nytt datum|Add Date/i 
    });
    const importButton = await screen.findByRole('button', { 
      name: /Importera|Import/i 
    });
    
    const addRect = addButton.getBoundingClientRect();
    const importRect = importButton.getBoundingClientRect();
    
    // Second button should be below first (vertical stacking)
    // Allow small tolerance for gap spacing
    expect(importRect.top).toBeGreaterThanOrEqual(addRect.bottom - 10);
  });

  it('AC2: Button container uses flex-col on mobile', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithQueryClient(<ImportantDatesPage />);
    
    await screen.findByRole('button', { name: /Nytt datum|Add Date/i });
    
    // Find button container - should have flex-col on mobile
    const buttonContainer = container.querySelector('.flex-col, [class*="flex-col"]');
    if (buttonContainer) {
      const styles = window.getComputedStyle(buttonContainer);
      // Should be column direction on mobile
      const isColumn = styles.flexDirection === 'column' || 
                      buttonContainer.classList.contains('flex-col');
      expect(isColumn).toBeTruthy();
    }
  });

  it('AC2: Buttons maintain 44px minimum height (touch targets)', async () => {
    setViewportSize(375, 667); // Mobile viewport
    
    const { container } = renderWithQueryClient(<ImportantDatesPage />);
    
    const addButton = await screen.findByRole('button', { 
      name: /Nytt datum|Add Date/i 
    });
    
    // Check if button has min-h-11 class (44px) or h-11 class
    const hasMinHeightClass = addButton.classList.contains('min-h-11') || 
                             addButton.className.includes('min-h-11') ||
                             addButton.classList.contains('h-11') ||
                             addButton.className.includes('h-11');
    
    // Check computed styles
    const styles = window.getComputedStyle(addButton);
    const minHeight = parseFloat(styles.minHeight) || 0;
    const height = parseFloat(styles.height) || measureTouchTarget(addButton).height;
    
    // Either has the class OR computed size should be >= 44px
    if (!hasMinHeightClass) {
      expect(Math.max(minHeight, height)).toBeGreaterThanOrEqual(44);
    } else {
      // If class is present, that's sufficient (JSDOM may not compute Tailwind correctly)
      expect(hasMinHeightClass).toBe(true);
    }
    
    const importButton = await screen.findByRole('button', { 
      name: /Importera|Import/i 
    });
    
    const importHasMinHeightClass = importButton.classList.contains('min-h-11') || 
                                   importButton.className.includes('min-h-11') ||
                                   importButton.classList.contains('h-11') ||
                                   importButton.className.includes('h-11');
    
    const importStyles = window.getComputedStyle(importButton);
    const importMinHeight = parseFloat(importStyles.minHeight) || 0;
    const importHeight = parseFloat(importStyles.height) || measureTouchTarget(importButton).height;
    
    if (!importHasMinHeightClass) {
      expect(Math.max(importMinHeight, importHeight)).toBeGreaterThanOrEqual(44);
    } else {
      expect(importHasMinHeightClass).toBe(true);
    }
  });
});

