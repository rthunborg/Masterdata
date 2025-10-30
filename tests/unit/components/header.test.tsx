import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/types/user';
import { UserRole } from '@/lib/types/user';

// Mock useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('Header', () => {
  const mockLogout = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it('renders user email and role badge', () => {
    const mockUser: SessionUser = {
      id: '1',
      email: 'test@example.com',
      role: UserRole.HR_ADMIN,
      is_active: true,
      created_at: '2025-01-01',
      auth_id: 'auth-1',
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('HR Administrator')).toBeInTheDocument();
  });

  it('calls logout and redirects when sign-out is clicked', async () => {
    const mockUser: SessionUser = {
      id: '1',
      email: 'test@example.com',
      role: UserRole.HR_ADMIN,
      is_active: true,
      created_at: '2025-01-01',
      auth_id: 'auth-1',
    };

    mockLogout.mockResolvedValue(undefined);

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('does not render when user is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it('displays correct role label for external party user', () => {
    const mockUser: SessionUser = {
      id: '2',
      email: 'sodexo@example.com',
      role: UserRole.SODEXO,
      is_active: true,
      created_at: '2025-01-01',
      auth_id: 'auth-2',
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText('Sodexo')).toBeInTheDocument();
  });

  it('handles logout error gracefully', async () => {
    const mockUser: SessionUser = {
      id: '1',
      email: 'test@example.com',
      role: UserRole.HR_ADMIN,
      is_active: true,
      created_at: '2025-01-01',
      auth_id: 'auth-1',
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLogout.mockRejectedValue(new Error('Logout failed'));

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    render(<Header />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('renders with correct responsive classes', () => {
    const mockUser: SessionUser = {
      id: '1',
      email: 'test@example.com',
      role: UserRole.HR_ADMIN,
      is_active: true,
      created_at: '2025-01-01',
      auth_id: 'auth-1',
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    render(<Header />);

    // Email should have hidden md:inline class (visible on medium screens and up)
    const emailElement = screen.getByText('test@example.com');
    expect(emailElement).toHaveClass('hidden', 'md:inline');
  });
});
