"use client";

import { useState, useEffect } from "react";
import { ColumnConfig, RolePermissions } from "@/lib/types/column-config";
import { UserRole, EXTERNAL_PARTY_ROLES } from "@/lib/types/user";
import { columnService } from "@/lib/services/column-service";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DraggableColumnRow } from "./draggable-column-row";
import { DeleteColumnModal } from "./delete-column-modal";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ColumnSettingsTableProps {
  columns: ColumnConfig[];
  onPermissionsUpdated: () => void;
}

export function ColumnSettingsTable({
  columns,
  onPermissionsUpdated,
}: ColumnSettingsTableProps) {
  const [updatingColumnId, setUpdatingColumnId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<ColumnConfig | null>(null);
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const tForms = useTranslations("forms");

  // Update local columns when prop changes
  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  const allRoles: UserRole[] = [
    UserRole.HR_ADMIN,
    ...EXTERNAL_PARTY_ROLES,
  ];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localColumns.findIndex((col) => col.id === active.id);
    const newIndex = localColumns.findIndex((col) => col.id === over.id);

    // Optimistically reorder columns
    const reorderedColumns = arrayMove(localColumns, oldIndex, newIndex);
    setLocalColumns(reorderedColumns);

    // Calculate new display_order values for all columns
    const updates = reorderedColumns.map((col, index) => ({
      id: col.id,
      display_order: index + 1,
    }));

    try {
      await columnService.updateColumnOrder(updates);
      toast.success("Column order updated successfully");
      onPermissionsUpdated(); // Refresh from server
    } catch {
      toast.error("Failed to update column order");
      // Revert optimistic update on error
      setLocalColumns(columns);
    }
  };

  const handlePermissionChange = async (
    column: ColumnConfig,
    role: UserRole,
    permissionType: "view" | "edit",
    newValue: boolean
  ) => {
    try {
      setUpdatingColumnId(column.id);

      // Clone current permissions
      const updatedPermissions: RolePermissions = JSON.parse(
        JSON.stringify(column.role_permissions)
      );

      // Ensure role exists in permissions
      if (!updatedPermissions[role]) {
        updatedPermissions[role] = { view: false, edit: false };
      }

      // Apply the change
      if (permissionType === "edit") {
        updatedPermissions[role].edit = newValue;
        // If enabling edit, also enable view
        if (newValue) {
          updatedPermissions[role].view = true;
        }
      } else {
        updatedPermissions[role].view = newValue;
        // If disabling view, also disable edit
        if (!newValue) {
          updatedPermissions[role].edit = false;
        }
      }

      // Update via API
      await columnService.updateColumnPermissions(column.id, {
        role_permissions: updatedPermissions,
      });

      toast.success("Permissions updated successfully");
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update permissions"
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const isPermissionDisabled = (column: ColumnConfig, role: UserRole): boolean => {
    // HR Admin is always enabled for masterdata columns
    return column.is_masterdata && role === UserRole.HR_ADMIN;
  };

  const handleDeleteClick = (column: ColumnConfig) => {
    setColumnToDelete(column);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    onPermissionsUpdated();
  };

  const handleHideColumn = async (column: ColumnConfig) => {
    try {
      setUpdatingColumnId(column.id);
      await columnService.hideColumn(column.id);
      toast.success(`Column "${column.column_name}" hidden successfully`);
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to hide column"
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const isColumnHidden = (column: ColumnConfig): boolean => {
    // Check if all roles have view=false
    const roles = ["hr_admin", "sodexo", "omc", "payroll", "toplux"];
    return roles.every(
      (role) => column.role_permissions[role]?.view === false
    );
  };

  const handleUnhideColumn = async (column: ColumnConfig) => {
    try {
      setUpdatingColumnId(column.id);
      // Restore default permissions - view only for the role that created it
      const restoredPermissions: RolePermissions = {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
      };
      await columnService.unhideColumn(column.id, restoredPermissions);
      toast.success(`Column "${column.column_name}" unhidden successfully`);
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unhide column"
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Order</TableHead>
                <TableHead className="w-[200px]">
                  {tForms("columnNameLabel")}
                </TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[120px]">Category</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
                {allRoles.map((role) => (
                  <TableHead key={role} className="text-center">
                    {role === UserRole.HR_ADMIN ? "HR Admin" : role.toUpperCase()}
                    <div className="text-xs font-normal text-gray-500">
                      View / Edit
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[150px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localColumns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6 + allRoles.length}
                    className="text-center text-gray-500"
                  >
                    No columns found
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={localColumns.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localColumns.map((column) => (
                    <DraggableColumnRow
                      key={column.id}
                      column={column}
                      allRoles={allRoles}
                      isUpdating={updatingColumnId === column.id}
                      isHidden={isColumnHidden(column)}
                      onPermissionChange={handlePermissionChange}
                      onHide={handleHideColumn}
                      onUnhide={handleUnhideColumn}
                      onDelete={handleDeleteClick}
                      isPermissionDisabled={isPermissionDisabled}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      <DeleteColumnModal
        column={columnToDelete}
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={handleDeleteConfirm}
      />
    </TooltipProvider>
  );
}
