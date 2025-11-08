"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { User, getRoleDisplayName } from "@/lib/types/user";
import { useAuth } from "@/lib/hooks/use-auth";
import { adminService } from "@/lib/services/admin-service";
import { useTranslations, useFormatter } from "@/lib/i18n";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
  flexRender,
} from "@tanstack/react-table";
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
import { cn } from "@/lib/utils";
import { 
  loadColumnWidths, 
  saveColumnWidths, 
  clearColumnWidths 
} from "@/lib/utils/column-width-storage";

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
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const format = useFormatter();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: User | null;
    action: "activate" | "deactivate" | "delete";
  }>({
    open: false,
    user: null,
    action: "deactivate",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Sorting state for TanStack Table
  const [sorting, setSorting] = useState<SortingState>([
    { id: "last_active_at", desc: true }
  ]);
  
  // Column resizing state (Story 9.4b)
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
    // Load saved widths from localStorage on mount
    if (currentUser?.id) {
      return loadColumnWidths('userSettings', currentUser.id) || {};
    }
    return {};
  });
  
  // Debounced save for column widths (Story 9.4b)
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleColumnSizingChange = useCallback((updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
    const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
    setColumnSizing(newSizing);
    
    // Debounce save to localStorage (300ms delay)
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    
    saveDebounceTimerRef.current = setTimeout(() => {
      if (currentUser?.id) {
        saveColumnWidths('userSettings', currentUser.id, newSizing);
      }
    }, 300);
  }, [columnSizing, currentUser?.id]);
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatRelativeTime = useCallback((timestamp: string | null): string => {
    if (!timestamp) {
      return t('lastActiveNever');
    }
    
    try {
      const date = new Date(timestamp);
      return format.relativeTime(date);
    } catch {
      return t('lastActiveNever');
    }
  }, [t, format]);
  
  const openConfirmDialog = useCallback((user: User, action: "activate" | "deactivate" | "delete") => {
    setConfirmDialog({ open: true, user, action });
  }, []);
  
  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: "email",
      id: "email",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center hover:text-gray-900 cursor-pointer"
        >
          Email
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4 inline" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4 inline" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />
          )}
        </button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.email}</span>,
    },
    {
      accessorKey: "role",
      id: "role",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center hover:text-gray-900 cursor-pointer"
        >
          {t('roleColumn')}
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4 inline" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4 inline" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />
          )}
        </button>
      ),
      cell: ({ row }) => getRoleDisplayName(row.original.role),
    },
    {
      accessorKey: "is_active",
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.original.is_active
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "last_active_at",
      id: "last_active_at",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center hover:text-gray-900 cursor-pointer"
        >
          {t('lastActive')}
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4 inline" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4 inline" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />
          )}
        </button>
      ),
      cell: ({ row }) => formatRelativeTime(row.original.last_active_at),
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.last_active_at;
        const b = rowB.original.last_active_at;
        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;
        return new Date(a).getTime() - new Date(b).getTime();
      },
    },
    {
      accessorKey: "created_at",
      id: "created_at",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center hover:text-gray-900 cursor-pointer"
        >
          {t('createdColumn')}
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4 inline" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4 inline" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-50" />
          )}
        </button>
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
      sortingFn: (rowA, rowB) => {
        return new Date(rowA.original.created_at).getTime() - new Date(rowB.original.created_at).getTime();
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t('actionsColumn')}</div>,
      cell: ({ row }) => {
        const user = row.original;
        const isCurrentUser = currentUser?.id === user.id;
        return (
          <div className="flex justify-end gap-2">
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
                title={t('activateButton')}
              >
                {t('activateButton')}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openConfirmDialog(user, "delete")}
              disabled={isCurrentUser}
              title={
                isCurrentUser
                  ? "Cannot delete your own account"
                  : tCommon('delete')
              }
            >
              {tCommon('delete')}
            </Button>
          </div>
        );
      },
    },
  ], [t, tCommon, currentUser?.id, formatDate, formatRelativeTime, openConfirmDialog]);
  
  // Create table instance
  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: handleColumnSizingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Column resizing configuration (Story 9.4b)
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 80,
      maxSize: 500,
    },
  });

  const handleStatusChange = async () => {
    if (!confirmDialog.user) return;

    try {
      setIsUpdating(true);

      if (confirmDialog.action === "delete") {
        // Handle delete action
        await adminService.deleteUser(confirmDialog.user.id);
        toast.success(`User ${confirmDialog.user.email} deleted successfully`);
      } else {
        // Handle activate/deactivate action
        const newStatus = confirmDialog.action === "activate";
        await adminService.updateUserStatus(confirmDialog.user.id, newStatus);
        toast.success(
          `User ${confirmDialog.user.email} ${newStatus ? "activated" : "deactivated"} successfully`
        );
      }

      onUserStatusChanged();
      setConfirmDialog({ open: false, user: null, action: "deactivate" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${confirmDialog.action} user`
      );
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="relative"
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    
                    {/* Resize handle (Story 9.4b) */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                          "hover:bg-blue-500 bg-gray-300 opacity-0 hover:opacity-100 transition-opacity",
                          header.column.getIsResizing() && "bg-blue-500 opacity-100"
                        )}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
              {confirmDialog.action === "activate" && t('activateUserTitle')}
              {confirmDialog.action === "deactivate" && t('deactivateUserTitle')}
              {confirmDialog.action === "delete" && t('deleteUserTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "activate" && 
                t('activateUserMessage', { email: confirmDialog.user?.email || '' })
              }
              {confirmDialog.action === "deactivate" &&
                t('deactivateUserMessage', { email: confirmDialog.user?.email || '' })
              }
              {confirmDialog.action === "delete" &&
                t('deleteUserMessage', { email: confirmDialog.user?.email || '' })
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>{t('cancelButton')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStatusChange} 
              disabled={isUpdating}
              className={confirmDialog.action === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isUpdating ? t('processingButton') : t('confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
