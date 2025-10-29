"use client";

import { useState } from "react";
import { User, getRoleDisplayName } from "@/lib/types/user";
import { useAuth } from "@/lib/hooks/use-auth";
import { adminService } from "@/lib/services/admin-service";
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

interface UserManagementTableProps {
  users: User[];
  onUserStatusChanged: () => void;
}

export function UserManagementTable({
  users,
  onUserStatusChanged,
}: UserManagementTableProps) {
  const { user: currentUser } = useAuth();
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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
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
                          Deactivate
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
