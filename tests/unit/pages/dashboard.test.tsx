import { screen } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '@/app/[locale]/dashboard/page';
import { useAuth } from '@/lib/hooks/use-auth';
import { useEmployees } from '@/lib/hooks/use-employees';
import { UserRole } from '@/lib/types/user';
import type { SessionUser } from '@/lib/types/user';

// Mock hooks
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/hooks/use-employees', () => ({
  useEmployees: vi.fn(),
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

describe('DashboardPage', () => {
  const mockHRAdminUser: SessionUser = {
    id: '1',
    email: 'hr@example.com',
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: '2025-01-01',
    auth_id: 'auth-1',
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
  });

  it('does NOT render sign-out button in page body', () => {
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

    renderWithI18n(<DashboardPage />);

    // Get all buttons
    const buttons = screen.getAllByRole('button');
    
    // Sign-out should NOT be in page body (moved to header)
    const signOutButton = buttons.find(btn => 
      btn.textContent?.toLowerCase().includes('sign out')
    );
    expect(signOutButton).toBeUndefined();
  });

  it('renders Add Employee and Import buttons for HR Admin', () => {
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

    renderWithI18n(<DashboardPage />);

    expect(screen.getByRole('button', { name: /Add Employee/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Employees/i })).toBeInTheDocument();
  });
});
