"use client";

import { useState } from "react";
import { ColumnConfig, RolePermissions } from "@/lib/types/column-config";
import { UserRole, EXTERNAL_PARTY_ROLES } from "@/lib/types/user";
import { columnService } from "@/lib/services/column-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PermissionToggle } from "./permission-toggle";
import { DeleteColumnModal } from "./delete-column-modal";
import { toast } from "sonner";
import { Trash2, EyeOff, Eye } from "lucide-react";
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
  const t = useTranslations("tooltips");

  const allRoles: UserRole[] = [
    UserRole.HR_ADMIN,
    ...EXTERNAL_PARTY_ROLES,
  ];

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Column Name</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[120px]">Category</TableHead>
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
          {columns.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4 + allRoles.length}
                className="text-center text-gray-500"
              >
                No columns found
              </TableCell>
            </TableRow>
          ) : (
            columns.map((column) => {
              const isUpdating = updatingColumnId === column.id;
              return (
                <TableRow key={column.id}>
                  <TableCell className="font-medium">
                    {column.column_name}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {column.column_type}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        column.is_masterdata
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {column.is_masterdata ? "Masterdata" : "Custom"}
                    </span>
                  </TableCell>
                  {allRoles.map((role) => {
                    const permissions = column.role_permissions[role] || {
                      view: false,
                      edit: false,
                    };
                    const disabled = isPermissionDisabled(column, role);

                    return (
                      <TableCell key={role} className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <PermissionToggle
                            role={role}
                            permissionType="view"
                            value={permissions.view}
                            disabled={disabled || isUpdating}
                            onChange={(value: boolean) =>
                              handlePermissionChange(
                                column,
                                role,
                                "view",
                                value
                              )
                            }
                            tooltip={
                              disabled
                                ? "HR Admin always has full access to masterdata"
                                : undefined
                            }
                          />
                          <span className="text-gray-400">/</span>
                          <PermissionToggle
                            role={role}
                            permissionType="edit"
                            value={permissions.edit}
                            disabled={disabled || isUpdating}
                            onChange={(value: boolean) =>
                              handlePermissionChange(
                                column,
                                role,
                                "edit",
                                value
                              )
                            }
                            tooltip={
                              disabled
                                ? "HR Admin always has full access to masterdata"
                                : undefined
                            }
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {isColumnHidden(column) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnhideColumn(column)}
                              disabled={isUpdating}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("showColumn")}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleHideColumn(column)}
                              disabled={isUpdating || column.is_masterdata}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {column.is_masterdata
                                ? "Cannot hide masterdata columns"
                                : t("hideColumn")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(column)}
                            disabled={isUpdating || column.is_masterdata}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {column.is_masterdata
                              ? "Masterdata columns cannot be deleted"
                              : t("deleteColumn")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
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
