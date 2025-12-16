/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Story 12.9: Mobile Header and Navigation UI Improvements
 * Unit tests for mobile header user name/email display
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
vi.mock('@/lib/i18n', () => ({
  t: {
    common: {
      appName: 'Säsongsrekrytering 2026',
      signOut: 'Sign Out',
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

const mockUser: SessionUser = {
  id: '1',
  email: 'test@example.com',
  role: UserRole.HR_ADMIN,
  auth_id: 'auth-1',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  last_active_at: new Date().toISOString(),
};

describe('Header - Mobile User Name Display', () => {
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

  it('should display user email in mobile header (left of logout button)', () => {
    render(<Header />);

    // Find all email displays
    const emailElements = screen.getAllByText('test@example.com');
    
    // Should have at least one email display (mobile)
    expect(emailElements.length).toBeGreaterThan(0);
    
    // Check that mobile email display has lg:hidden class (mobile-only)
    const mobileEmail = emailElements.find(el => 
      el.className.includes('lg:hidden')
    );
    expect(mobileEmail).toBeInTheDocument();
  });

  it('should display user email with appropriate truncation on mobile', () => {
    const longEmailUser: SessionUser = {
      ...mockUser,
      email: 'verylongemailaddress@example.com',
    };

    vi.mocked(useAuth).mockReturnValue({
      user: longEmailUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    render(<Header />);

    const emailElements = screen.getAllByText('verylongemailaddress@example.com');
    const mobileEmail = emailElements.find(el => 
      el.className.includes('lg:hidden')
    );
    
    expect(mobileEmail).toBeInTheDocument();
    // Should have truncate class for long emails
    expect(mobileEmail?.className).toContain('truncate');
  });

  it('should hide mobile email display on desktop (lg breakpoint and above)', () => {
    render(<Header />);

    const emailElements = screen.getAllByText('test@example.com');
    
    // Mobile email should have lg:hidden class
    const mobileEmail = emailElements.find(el => 
      el.className.includes('lg:hidden')
    );
    expect(mobileEmail).toBeInTheDocument();
    
    // Desktop email should have hidden lg:inline class
    const desktopEmail = emailElements.find(el => 
      el.className.includes('hidden') && el.className.includes('lg:inline')
    );
    expect(desktopEmail).toBeInTheDocument();
  });

  it('should display email with readable font size on mobile', () => {
    render(<Header />);

    const emailElements = screen.getAllByText('test@example.com');
    const mobileEmail = emailElements.find(el => 
      el.className.includes('lg:hidden')
    );
    
    expect(mobileEmail).toBeInTheDocument();
    // Should have text-sm for appropriate font size
    expect(mobileEmail?.className).toContain('text-sm');
  });

  it('should position email to the left of logout button', () => {
    render(<Header />);

    const emailElements = screen.getAllByText('test@example.com');
    const mobileEmail = emailElements.find(el => 
      el.className.includes('lg:hidden')
    );
    
    const logoutButton = screen.getByRole('button', { name: /sign out/i });
    
    // Both should be in the same container (right side of header)
    const headerRight = logoutButton.closest('div');
    expect(headerRight).toBeInTheDocument();
    
    // Email should be before logout button in DOM order
    const emailIndex = Array.from(headerRight?.children || []).indexOf(mobileEmail as Element);
    const buttonIndex = Array.from(headerRight?.children || []).indexOf(logoutButton);
    expect(emailIndex).toBeLessThan(buttonIndex);
  });

  it('should use email when user name is not available', () => {
    // User object doesn't have a name field, so email is used
    render(<Header />);

    const emailElements = screen.getAllByText('test@example.com');
    expect(emailElements.length).toBeGreaterThan(0);
  });
});

