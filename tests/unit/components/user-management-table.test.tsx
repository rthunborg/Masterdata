/**
 * Component Tests for UserManagementTable
 * Story 5.1: User Account Management Interface
 * 
 * Tests cover:
 * - User list rendering
 * - Activate/Deactivate button display logic
 * - Self-deactivation prevention (button disabled for current user)
 * - Confirmation dialog flow
 * - Error handling
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementTable } from '@/components/admin/user-management-table';
import { User, UserRole } from '@/lib/types/user';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'current-user-id',
      email: 'admin@test.com',
      role: UserRole.HR_ADMIN,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
    },
  }),
}));

vi.mock('@/lib/services/admin-service', () => ({
  adminService: {
    updateUserStatus: vi.fn(),
  },
}));

import { adminService } from '@/lib/services/admin-service';

describe('UserManagementTable', () => {
  const mockUsers: User[] = [
    {
      id: 'user-1',
      email: 'sodexo@test.com',
      role: UserRole.SODEXO,
      is_active: true,
      created_at: '2025-01-10T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'omc@test.com',
      role: UserRole.OMC,
      is_active: false,
      created_at: '2025-01-15T00:00:00Z',
    },
    {
      id: 'current-user-id',
      email: 'admin@test.com',
      role: UserRole.HR_ADMIN,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
    },
  ];

  const mockOnUserStatusChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user list correctly', () => {
    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    // Check that all users are displayed
    expect(screen.getByText('sodexo@test.com')).toBeInTheDocument();
    expect(screen.getByText('omc@test.com')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();

    // Check role display
    expect(screen.getByText('Sodexo')).toBeInTheDocument();
    expect(screen.getByText('OMC')).toBeInTheDocument();
    expect(screen.getByText('HR Administrator')).toBeInTheDocument();
  });

  it('displays "Deactivate" button for active users', () => {
    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    // Should have deactivate buttons for active users
    expect(screen.getAllByText('Deactivate').length).toBe(2); // Sodexo and HR Admin rows
  });

  it('displays "Activate" button for inactive users', () => {
    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    expect(screen.getByText('Activate')).toBeInTheDocument();
  });

  it('disables deactivate button for current user', () => {
    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );
    
    // The button for the current user should be disabled
    // Note: This requires checking the parent table row to identify which button belongs to current user
    const currentUserRow = screen.getByText('admin@test.com').closest('tr');
    const currentUserButton = currentUserRow?.querySelector('button');
    
    expect(currentUserButton).toBeDisabled();
  });

  it('shows confirmation dialog when deactivate clicked', async () => {
    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    // Click deactivate on first active user (Sodexo)
    const sodexoEmails = screen.getAllByText('sodexo@test.com');
    const sodexoRow = sodexoEmails[0].closest('tr');
    const deactivateButton = sodexoRow?.querySelector('button');
    
    if (deactivateButton) {
      fireEvent.click(deactivateButton);
    }

    // Check that confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to deactivate/i)).toBeInTheDocument();
    });
  });

  it('calls updateUserStatus when deactivation confirmed', async () => {
    const mockUpdateUserStatus = vi.mocked(adminService.updateUserStatus);
    mockUpdateUserStatus.mockResolvedValueOnce({
      id: 'user-1',
      email: 'sodexo@test.com',
      role: UserRole.SODEXO,
      is_active: false,
      created_at: '2025-01-10T00:00:00Z',
    });

    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    // Click deactivate
    const sodexoRow = screen.getByText('sodexo@test.com').closest('tr');
    const deactivateButton = sodexoRow?.querySelector('button');
    
    if (deactivateButton) {
      fireEvent.click(deactivateButton);
    }

    // Confirm in dialog
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
    });

    // Verify service was called
    await waitFor(() => {
      expect(mockUpdateUserStatus).toHaveBeenCalledWith('user-1', false);
      expect(mockOnUserStatusChanged).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('deactivated successfully')
      );
    });
  });

  it('calls updateUserStatus when activation clicked', async () => {
    const mockUpdateUserStatus = vi.mocked(adminService.updateUserStatus);
    mockUpdateUserStatus.mockResolvedValueOnce({
      id: 'user-2',
      email: 'omc@test.com',
      role: UserRole.OMC,
      is_active: true,
      created_at: '2025-01-15T00:00:00Z',
    });

    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    // Click activate on inactive user
    const activateButton = screen.getByText('Activate');
    fireEvent.click(activateButton);

    // Confirm in dialog
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
    });

    // Verify service was called
    await waitFor(() => {
      expect(mockUpdateUserStatus).toHaveBeenCalledWith('user-2', true);
      expect(mockOnUserStatusChanged).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('activated successfully')
      );
    });
  });

  it('displays error toast on update failure', async () => {
    const mockUpdateUserStatus = vi.mocked(adminService.updateUserStatus);
    mockUpdateUserStatus.mockRejectedValueOnce(new Error('Network error'));

    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    // Click deactivate
    const sodexoRow = screen.getByText('sodexo@test.com').closest('tr');
    const deactivateButton = sodexoRow?.querySelector('button');
    
    if (deactivateButton) {
      fireEvent.click(deactivateButton);
    }

    // Confirm in dialog
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
    });

    // Verify error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });
  });

  it('displays "No users found" when list is empty', () => {
    renderWithI18n(
      <UserManagementTable users={[]} onUserStatusChanged={mockOnUserStatusChanged} />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    // Check that dates are formatted (e.g., "Jan 10, 2025")
    expect(screen.getByText(/Jan 10, 2025/)).toBeInTheDocument();
  });

  it('displays active status badge correctly', () => {
    renderWithI18n(
      <UserManagementTable
        users={mockUsers}
        onUserStatusChanged={mockOnUserStatusChanged}
      />
    );

    const activeStatuses = screen.getAllByText('Active');
    const inactiveStatuses = screen.getAllByText('Inactive');

    // Should have 2 active users and 1 inactive
    expect(activeStatuses.length).toBe(2);
    expect(inactiveStatuses.length).toBe(1);
  });
});

