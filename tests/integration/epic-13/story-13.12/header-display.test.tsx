/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration Tests for Header Display
 * Story 13.12: Update Header Text to "Säsongsrekrytering 2026"
 * 
 * Tests verify:
 * - Header displays on all pages
 * - Header text is correct
 * - Header layout doesn't break with new text
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
}));

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

describe('Header Display Integration (Story 13.12)', () => {
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

  it('should display header on all pages with correct text', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const headerText = screen.getByText('Säsongsrekrytering 2026');
    expect(headerText).toBeInTheDocument();
  });

  it('should maintain header layout with longer text', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    const headerText = screen.getByText('Säsongsrekrytering 2026');

    // Header should still be properly structured
    expect(header).toBeInTheDocument();
    expect(headerText).toBeInTheDocument();
    
    // Text should have truncate to prevent overflow
    expect(headerText.className).toContain('truncate');
  });

  it('should display header with all required elements', () => {
    render(<Header />);

    // Logo should be present
    const logo = screen.getByAltText('Stena Line');
    expect(logo).toBeInTheDocument();

    // Header text should be present
    const headerText = screen.getByText('Säsongsrekrytering 2026');
    expect(headerText).toBeInTheDocument();

    // Logout button should be present
    const logoutButton = screen.getByRole('button', { name: /logga ut/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it('should not break header layout with new longer text', () => {
    render(<Header />);

    const header = screen.getByRole('banner');
    const headerText = screen.getByText('Säsongsrekrytering 2026');

    // Verify header structure is intact
    expect(header).toBeInTheDocument();
    expect(headerText).toBeInTheDocument();
    
    // Verify responsive classes are present
    expect(headerText.className).toContain('text-sm');
    expect(headerText.className).toContain('sm:text-base');
    expect(headerText.className).toContain('md:text-lg');
  });

  it('should handle header display for different user roles', () => {
    const externalPartyUser: SessionUser = {
      ...mockUser,
      role: UserRole.EXTERNAL_PARTY,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: externalPartyUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    render(<Header />);

    const headerText = screen.getByText('Säsongsrekrytering 2026');
    expect(headerText).toBeInTheDocument();
  });
});

