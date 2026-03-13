'use client';

import { useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { UserManagementTable } from './user-management-table';
import { UserCard } from './user-card';
import type { User } from '@/lib/types/user';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminService } from '@/lib/services/admin-service';
import { useTranslations } from '@/lib/i18n';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ResponsiveUserViewProps {
  users: User[];
  onUserStatusChanged: () => void;
}

export function ResponsiveUserView({
  users,
  onUserStatusChanged,
}: ResponsiveUserViewProps) {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { user: currentUser } = useAuth();
  const tToasts = useTranslations('toasts');
  const [searchValue, setSearchValue] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: User | null;
    action: 'activate' | 'deactivate' | 'delete';
  }>({
    open: false,
    user: null,
    action: 'deactivate',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredUsers = searchValue
    ? users.filter((user) => {
        const searchLower = searchValue.toLowerCase();
        return (
          user.email.toLowerCase().includes(searchLower) ||
          user.role.toLowerCase().includes(searchLower)
        );
      })
    : users;

  const handleActivate = (user: User) => {
    setConfirmDialog({ open: true, user, action: 'activate' });
  };

  const handleDeactivate = (user: User) => {
    setConfirmDialog({ open: true, user, action: 'deactivate' });
  };

  const handleDelete = (user: User) => {
    setConfirmDialog({ open: true, user, action: 'delete' });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.user) return;

    try {
      setIsUpdating(true);
      const { user, action } = confirmDialog;

      if (action === 'activate') {
        await adminService.updateUserStatus(user.id, true);
        toast.success(tToasts('users.userActivated', { email: user.email }));
      } else if (action === 'deactivate') {
        await adminService.updateUserStatus(user.id, false);
        toast.success(tToasts('users.userDeactivated', { email: user.email }));
      } else if (action === 'delete') {
        await adminService.deleteUser(user.id);
        toast.success(tToasts('users.userDeleted', { email: user.email }));
      }

      setConfirmDialog({ open: false, user: null, action: 'deactivate' });
      onUserStatusChanged();
    } catch {
      toast.error(tToasts('users.userActionFailed'));
    } finally {
      setIsUpdating(false);
    }
  };

  const getDialogContent = () => {
    const { user, action } = confirmDialog;
    if (!user) return { title: '', description: '' };

    switch (action) {
      case 'activate':
        return {
          title: 'Activate User',
          description: `Are you sure you want to activate ${user.email}? They will regain access to the system.`,
        };
      case 'deactivate':
        return {
          title: 'Deactivate User',
          description: `Are you sure you want to deactivate ${user.email}? They will lose access to the system.`,
        };
      case 'delete':
        return {
          title: 'Delete User',
          description: `Are you sure you want to permanently delete ${user.email}? This action cannot be undone.`,
        };
    }
  };

  const dialogContent = getDialogContent();

  if (isMobile) {
    return (
      <>
        <div className="space-y-4 p-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* User cards */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id || ''}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) =>
            !open && setConfirmDialog({ open, user: null, action: 'deactivate' })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAction} disabled={isUpdating}>
                {isUpdating ? 'Processing...' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return <UserManagementTable users={users} onUserStatusChanged={onUserStatusChanged} />;
}
