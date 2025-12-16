/* eslint-disable @typescript-eslint/no-explicit-any */ 
/**
 * Story 13.12: Update Header Text to "Säsongsrekrytering 2026"
 * Unit tests for header text display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from '@/lib/navigation';
import { UserRole } from '@/lib/types/user';
import type { SessionUser } from '@/lib/types/user';

// Mock hooks
vi.mock('@/lib/hooks/use-auth');
vi.mock('@/lib/navigation');

// Mock i18n with updated app name
vi.mock('@/lib/i18n', () => ({
  t: {
    common: {
      appName: 'Säsongsrekrytering 2026',
      signOut: 'Logga ut',
    },
  },
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: any) => {
     
    const { priority, ...imgProps } = props;
    return <img {...imgProps} />;
  },
}));

// Mock MobileNav component
vi.mock('@/components/layout/mobile-nav', () => ({
  MobileNav: () => <div data-testid="mobile-nav">Mobile Nav</div>,
}));

// Mock getRoleDisplayName
vi.mock('@/lib/types/user', async () => {
  const actual = await vi.importActual('@/lib/types/user');
  return {
    ...actual,
    getRoleDisplayName: vi.fn((role: UserRole) => {
      const roleMap: Record<UserRole, string> = {
        [UserRole.HR_ADMIN]: 'HR-admin',
        [UserRole.EXTERNAL_PARTY]: 'Extern part',
      };
      return roleMap[role] || role;
    }),
  };
});

const mockUser: SessionUser = {
  id: '1',
  email: 'test@example.com',
  role: UserRole.HR_ADMIN,
  auth_id: 'auth-1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  last_active_at: new Date().toISOString(),
};

describe('Header - Text Display (Story 13.12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any);
  });

  it('should display "Säsongsrekrytering 2026" in header', () => {
    render(<Header />);

    const headerText = screen.getByText('Säsongsrekrytering 2026');
    expect(headerText).toBeInTheDocument();
  });

  it('should NOT display "HR Masterdata" in header', () => {
    render(<Header />);

    const oldText = screen.queryByText('HR Masterdata');
    expect(oldText).not.toBeInTheDocument();
  });

  it('should display header text with correct styling (hidden on mobile, visible on desktop)', () => {
    render(<Header />);

    const headerText = screen.getByText('Säsongsrekrytering 2026');
    expect(headerText).toBeInTheDocument();
    
    // Should have hidden sm:block classes for responsive behavior
    expect(headerText.className).toContain('hidden');
    expect(headerText.className).toContain('sm:block');
  });

  it('should display header text as h1 element', () => {
    render(<Header />);

    const headerText = screen.getByText('Säsongsrekrytering 2026');
    expect(headerText.tagName).toBe('H1');
  });

  it('should have appropriate font styling for header text', () => {
    render(<Header />);

    const headerText = screen.getByText('Säsongsrekrytering 2026');
    expect(headerText.className).toContain('font-semibold');
    expect(headerText.className).toContain('truncate');
  });

  it('should handle longer text without breaking layout', () => {
    render(<Header />);

    const headerText = screen.getByText('Säsongsrekrytering 2026');
    // Should have truncate class to prevent overflow
    expect(headerText.className).toContain('truncate');
  });
});

