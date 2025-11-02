"use client";

import { useState, useMemo } from "react";
import { User, getRoleDisplayName } from "@/lib/types/user";
import { useAuth } from "@/lib/hooks/use-auth";
import { adminService } from "@/lib/services/admin-service";
import { useTranslations, useFormatter } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortColumn = "email" | "role" | "created_at" | "last_active_at";
type SortDirection = "asc" | "desc";

interface UserManagementTableProps {
  users: User[];
  onUserStatusChanged: () => void;
}

export function UserManagementTable({
  users,
  onUserStatusChanged,
}: UserManagementTableProps) {
  const { user: currentUser } = useAuth();
  const t = useTranslations("admin");
  const format = useFormatter();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: User | null;
    action: "activate" | "deactivate";
  }>({
    open: false,
    user: null,
    action: "deactivate",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("last_active_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortColumn) {
        case "email":
          aValue = a.email;
          bValue = b.email;
          break;
        case "role":
          aValue = a.role;
          bValue = b.role;
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "last_active_at":
          // Handle null values - push them to the end
          if (!a.last_active_at && !b.last_active_at) return 0;
          if (!a.last_active_at) return 1;
          if (!b.last_active_at) return -1;
          aValue = new Date(a.last_active_at).getTime();
          bValue = new Date(b.last_active_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [users, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection(column === "last_active_at" || column === "created_at" ? "desc" : "asc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 inline" />
    );
  };

  const handleStatusChange = async () => {
    if (!confirmDialog.user) return;

    const newStatus = confirmDialog.action === "activate";

    try {
      setIsUpdating(true);
      await adminService.updateUserStatus(confirmDialog.user.id, newStatus);
      toast.success(
        `User ${confirmDialog.user.email} ${newStatus ? "activated" : "deactivated"} successfully`
      );
      onUserStatusChanged();
      setConfirmDialog({ open: false, user: null, action: "deactivate" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user status"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openConfirmDialog = (user: User, action: "activate" | "deactivate") => {
    setConfirmDialog({ open: true, user, action });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) {
      return t('lastActiveNever');
    }
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      return format.relativeTime(date, now);
    } catch {
      return t('lastActiveNever');
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort("email")}
                  className="flex items-center hover:text-gray-900 cursor-pointer"
                >
                  Email
                  {getSortIcon("email")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("role")}
                  className="flex items-center hover:text-gray-900 cursor-pointer"
                >
                  {t('roleColumn')}
                  {getSortIcon("role")}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("last_active_at")}
                  className="flex items-center hover:text-gray-900 cursor-pointer"
                >
                  {t('lastActive')}
                  {getSortIcon("last_active_at")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("created_at")}
                  className="flex items-center hover:text-gray-900 cursor-pointer"
                >
                  {t('createdColumn')}
                  {getSortIcon("created_at")}
                </button>
              </TableHead>
              <TableHead className="text-right">{t('actionsColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => {
                const isCurrentUser = currentUser?.id === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{getRoleDisplayName(user.role)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>{formatRelativeTime(user.last_active_at)}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {user.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConfirmDialog(user, "deactivate")}
                          disabled={isCurrentUser}
                          title={
                            isCurrentUser
                              ? "Cannot deactivate your own account"
                              : "Deactivate user"
                          }
                        >
                          {t('deactivateButton')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConfirmDialog(user, "activate")}
                        >
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !isUpdating && setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "activate" ? "Activate" : "Deactivate"}{" "}
              User
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "activate" ? (
                <>
                  Are you sure you want to activate{" "}
                  <strong>{confirmDialog.user?.email}</strong>? They will be
                  able to log in again.
                </>
              ) : (
                <>
                  Are you sure you want to deactivate{" "}
                  <strong>{confirmDialog.user?.email}</strong>? They will be
                  logged out and unable to access the system.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={isUpdating}>
              {isUpdating ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
