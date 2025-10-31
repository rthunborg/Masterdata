"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";
import { TableCell, TableRow } from "@/components/ui/table";
import { PermissionToggle } from "./permission-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, EyeOff, Eye } from "lucide-react";
import { useTranslations } from "next-intl";

interface DraggableColumnRowProps {
  column: ColumnConfig;
  allRoles: UserRole[];
  isUpdating: boolean;
  isHidden: boolean;
  onPermissionChange: (
    column: ColumnConfig,
    role: UserRole,
    permissionType: "view" | "edit",
    newValue: boolean
  ) => void;
  onHide: (column: ColumnConfig) => void;
  onUnhide: (column: ColumnConfig) => void;
  onDelete: (column: ColumnConfig) => void;
  isPermissionDisabled: (column: ColumnConfig, role: UserRole) => boolean;
}

export function DraggableColumnRow({
  column,
  allRoles,
  isUpdating,
  isHidden,
  onPermissionChange,
  onHide,
  onUnhide,
  onDelete,
  isPermissionDisabled,
}: DraggableColumnRowProps) {
  const t = useTranslations("tooltips");
  const tStatus = useTranslations("status");
  const tAccessibility = useTranslations("accessibility");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      {/* Drag Handle */}
      <TableCell className="w-10 cursor-grab active:cursor-grabbing">
        <button
          {...attributes}
          {...listeners}
          aria-label={tAccessibility("reorderColumn")}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>
      </TableCell>

      {/* Column Name */}
      <TableCell className="font-medium">{column.column_name}</TableCell>

      {/* Column Type */}
      <TableCell className="text-gray-600">{column.column_type}</TableCell>

      {/* Category Badge */}
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

      {/* Status Badge */}
      <TableCell className="text-center">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isHidden
              ? "bg-gray-100 text-gray-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {isHidden ? tStatus("hidden") : tStatus("visible")}
        </span>
      </TableCell>

      {/* Permission Toggles for Each Role */}
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
                  onPermissionChange(column, role, "view", value)
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
                  onPermissionChange(column, role, "edit", value)
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

      {/* Actions */}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
          {isHidden ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnhide(column)}
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
                  onClick={() => onHide(column)}
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
                onClick={() => onDelete(column)}
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
}

