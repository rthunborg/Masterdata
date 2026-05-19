"use client";

import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PermissionToggle } from "../permission-toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical, ChevronUp, ChevronDown, Check, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { UserRole } from "@/lib/types/user";
import type { useTranslations } from "@/lib/i18n";
import { EditableColumnNameCell } from "./EditableColumnNameCell";
import { EditableCategoryCell } from "./EditableCategoryCell";

export interface DraggableRowProps {
  column: ColumnConfig;
  allRoles: UserRole[];
  allColumns: ColumnConfig[];
  updatingColumnId: string | null;
  updatingColumnField: { columnId: string; field: string } | null;
  isPermissionDisabled: () => boolean;
  handlePermissionChange: (
    column: ColumnConfig,
    role: UserRole,
    permissionType: "view" | "edit",
    newValue: boolean
  ) => Promise<void>;
  handleCategoryUpdate: (columnId: string, newCategory: string) => Promise<void>;
  handleCategoryColorUpdate: (categoryName: string, color: string | null) => Promise<void>;
  handleColumnNameUpdate: (columnId: string, newName: string) => Promise<void>;
  handleChecklistItemToggle: (columnId: string, isChecklistItem: boolean) => Promise<void>;
  handleDeleteClick: (column: ColumnConfig) => void;
  handleToggleVisibility: (column: ColumnConfig) => Promise<void>;
  isMobile: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  t: ReturnType<typeof useTranslations>;
}

export function DraggableRow({
  column,
  allRoles,
  allColumns,
  updatingColumnId,
  updatingColumnField,
  isPermissionDisabled,
  handlePermissionChange,
  handleCategoryUpdate,
  handleCategoryColorUpdate,
  handleColumnNameUpdate,
  handleChecklistItemToggle,
  handleDeleteClick,
  handleToggleVisibility,
  isMobile,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  t,
}: DraggableRowProps) {
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

  const isUpdating = updatingColumnId === column.id;
  const isFieldUpdating = (field: string) =>
    updatingColumnField?.columnId === column.id &&
    updatingColumnField.field === field;

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "bg-background",
        !column.is_visible && "bg-gray-200 opacity-75"
      )}
    >
      <TableCell 
        className="w-12 lg:w-auto lg:p-2 sticky z-10 bg-inherit"
        style={{ left: 0 }}
      >
        {isMobile ? (
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              disabled={isFirst || isUpdating}
              className="h-6 px-1"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              disabled={isLast || isUpdating}
              className="h-6 px-1"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            aria-label="Reorder column"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </TableCell>

      <TableCell 
        className="lg:p-2 sticky z-10 bg-inherit min-w-0 overflow-hidden text-left"
        style={{ left: 40 }}
      >
        <EditableColumnNameCell
          value={column.column_name}
          columnId={column.id}
          onUpdate={handleColumnNameUpdate}
          isUpdating={isUpdating}
          isSaving={isFieldUpdating("column_name")}
        />
      </TableCell>

      <TableCell 
        className="text-gray-600 lg:p-2 sticky z-10 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-0 overflow-hidden text-left"
        style={{ left: 190 }}
      >
        <span className="font-mono text-sm block truncate" title={column.db_column_name}>{column.db_column_name}</span>
      </TableCell>

      <TableCell className="text-gray-600 w-16 lg:w-auto lg:truncate lg:p-2">{column.column_type}</TableCell>

      <TableCell className="w-24 lg:w-auto lg:p-2">
        {column.is_masterdata ? (
          <Check className="h-5 w-5 text-green-600 inline-block" />
        ) : (
          <X className="h-5 w-5 text-gray-400 inline-block" />
        )}
      </TableCell>

      <TableCell className="w-24 lg:w-auto lg:p-2">
        {column.column_type === 'boolean' && column.is_masterdata ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                {isFieldUpdating("is_checklist_item") ? (
                  <Loader2
                    className="h-4 w-4 animate-spin text-blue-600"
                    role="status"
                    aria-label="Sparar"
                  />
                ) : (
                  <Checkbox
                    checked={column.is_checklist_item ?? false}
                    onCheckedChange={(checked: boolean) => handleChecklistItemToggle(column.id, checked)}
                    disabled={isUpdating}
                    aria-label="Toggle checklist item"
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{column.is_checklist_item ? "Ingår i checklista" : "Ingår ej i checklista"}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-gray-400 text-sm">–</span>
        )}
      </TableCell>

      <TableCell className="w-40 lg:w-auto lg:p-2 min-w-0 overflow-hidden text-left">
        <EditableCategoryCell
          value={column.category || ""}
          columnId={column.id}
          allColumns={allColumns}
          onUpdate={handleCategoryUpdate}
          onColorUpdate={handleCategoryColorUpdate}
          isUpdating={isUpdating}
          isSaving={isFieldUpdating("category")}
        />
      </TableCell>

      {allRoles.map((role) => {
        const permissions = column.role_permissions[role] || {
          view: false,
          edit: false,
        };
        const viewDisabled = isPermissionDisabled();
        const editDisabled = isPermissionDisabled();

        return (
          <TableCell key={role} className="w-20 lg:w-auto lg:p-2">
            <div className="flex gap-2">
              <PermissionToggle
                role={role}
                permissionType="view"
                value={permissions.view}
                disabled={viewDisabled || isUpdating}
                isLoading={isFieldUpdating(`permission:${role}:view`)}
                onChange={(value: boolean) =>
                  handlePermissionChange(column, role, "view", value)
                }
                tooltip={undefined}
              />
              <PermissionToggle
                role={role}
                permissionType="edit"
                value={permissions.edit}
                disabled={editDisabled || isUpdating}
                isLoading={isFieldUpdating(`permission:${role}:edit`)}
                onChange={(value: boolean) =>
                  handlePermissionChange(column, role, "edit", value)
                }
                tooltip={undefined}
              />
            </div>
          </TableCell>
        );
      })}

      <TableCell className="text-left w-20 lg:w-auto lg:pl-4 lg:pr-2">
        <div className="flex items-center justify-start gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleVisibility(column)}
                disabled={isUpdating}
                className="h-8 w-8 p-0 bg-gray-500 hover:bg-gray-600 border border-gray-400 rounded"
              >
                {isFieldUpdating("is_visible") ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : column.is_visible ? (
                  <Eye className="h-4 w-4 text-white" />
                ) : (
                  <EyeOff className="h-4 w-4 text-white" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{column.is_visible ? "Inaktivera" : "Aktivera"}</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteClick(column)}
                disabled={isUpdating}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("deleteColumn")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
