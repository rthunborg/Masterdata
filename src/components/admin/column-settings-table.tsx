"use client";

import { useState, useEffect } from "react";
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
import { VisibilityBadge } from "@/components/ui/visibility-badge";
import { toast } from "sonner";
import { Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ColumnSettingsTableProps {
  columns: ColumnConfig[];
  allColumns: ColumnConfig[];
  onPermissionsUpdated: () => void;
}

// Draggable row component
function DraggableRow({
  column,
  allRoles,
  updatingColumnId,
  isPermissionDisabled,
  handlePermissionChange,
  handleToggleVisibility,
  handleDeleteClick,
  isMobile,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  t,
  tAdmin,
}: {
  column: ColumnConfig;
  allRoles: UserRole[];
  updatingColumnId: string | null;
  isPermissionDisabled: (column: ColumnConfig, role: UserRole) => boolean;
  handlePermissionChange: (
    column: ColumnConfig,
    role: UserRole,
    permissionType: "view" | "edit",
    newValue: boolean
  ) => Promise<void>;
  handleToggleVisibility: (column: ColumnConfig) => Promise<void>;
  handleDeleteClick: (column: ColumnConfig) => void;
  isMobile: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  t: ReturnType<typeof useTranslations>;
  tAdmin: ReturnType<typeof useTranslations>;
}) {
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

  return (
    <TableRow ref={setNodeRef} style={style}>
      {/* Drag Handle / Move Buttons */}
      <TableCell className="w-[60px]">
        {isMobile ? (
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              disabled={isFirst || isUpdating}
              className="h-6 px-2"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              disabled={isLast || isUpdating}
              className="h-6 px-2"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
            aria-label="Reorder column"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </TableCell>

      {/* Column Name */}
      <TableCell className="font-medium">{column.column_name}</TableCell>

      {/* Type */}
      <TableCell className="text-gray-600">{column.column_type}</TableCell>

      {/* Category */}
      <TableCell>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            column.is_masterdata
              ? "bg-blue-100 text-blue-800"
              : "bg-purple-100 text-purple-800"
          }`}
        >
          {column.is_masterdata ? tAdmin("masterdata") : tAdmin("custom")}
        </span>
      </TableCell>

      {/* Visibility Badge */}
      <TableCell>
        <VisibilityBadge isVisible={column.is_visible} />
      </TableCell>

      {/* Role Permissions */}
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
                  handlePermissionChange(column, role, "view", value)
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
                  handlePermissionChange(column, role, "edit", value)
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleVisibility(column)}
                disabled={isUpdating || column.is_masterdata}
              >
                {column.is_visible ? tAdmin("hide") : tAdmin("show")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {column.is_masterdata
                  ? "Cannot hide masterdata columns"
                  : column.is_visible
                  ? t("hideColumn")
                  : t("showColumn")}
              </p>
            </TooltipContent>
          </Tooltip>
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
}

export function ColumnSettingsTable({
  columns,
  allColumns,
  onPermissionsUpdated,
}: ColumnSettingsTableProps) {
  const [items, setItems] = useState(columns);
  const [updatingColumnId, setUpdatingColumnId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<ColumnConfig | null>(null);
  const t = useTranslations("tooltips");
  const tForms = useTranslations("forms");
  const tAdmin = useTranslations("admin");

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize mobile state on mount
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update items when columns prop changes
  useEffect(() => {
    setItems(columns);
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allRoles: UserRole[] = [UserRole.HR_ADMIN, ...EXTERNAL_PARTY_ROLES];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);

      // Update local state immediately for optimistic UI
      setItems(newItems);

      // Build updates for ALL columns to maintain consistent display_order
      // Map reordered columns to their new positions
      const reorderedMap = new Map<string, number>();
      newItems.forEach((col, index) => {
        reorderedMap.set(col.id, index);
      });

      // For columns not in the filtered view, maintain their current display_order
      // For columns in the filtered view, use their new position
      const updates = allColumns.map((col) => {
        const newPos = reorderedMap.get(col.id);
        return {
          id: col.id,
          display_order: newPos !== undefined ? newPos : col.display_order,
        };
      });

      try {
        await columnService.reorderColumns(updates);
        toast.success("Column order updated successfully");
        onPermissionsUpdated();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reorder columns"
        );
        // Revert on error
        setItems(columns);
      }
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);

    // Build updates for ALL columns
    const reorderedMap = new Map<string, number>();
    newItems.forEach((col, idx) => {
      reorderedMap.set(col.id, idx);
    });

    const updates = allColumns.map((col) => {
      const newPos = reorderedMap.get(col.id);
      return {
        id: col.id,
        display_order: newPos !== undefined ? newPos : col.display_order,
      };
    });

    try {
      await columnService.reorderColumns(updates);
      toast.success("Column moved up");
      onPermissionsUpdated();
    } catch {
      toast.error("Failed to move column");
      setItems(columns);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);

    // Build updates for ALL columns
    const reorderedMap = new Map<string, number>();
    newItems.forEach((col, idx) => {
      reorderedMap.set(col.id, idx);
    });

    const updates = allColumns.map((col) => {
      const newPos = reorderedMap.get(col.id);
      return {
        id: col.id,
        display_order: newPos !== undefined ? newPos : col.display_order,
      };
    });

    try {
      await columnService.reorderColumns(updates);
      toast.success("Column moved down");
      onPermissionsUpdated();
    } catch {
      toast.error("Failed to move column");
      setItems(columns);
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

      const updatedPermissions: RolePermissions = JSON.parse(
        JSON.stringify(column.role_permissions)
      );

      if (!updatedPermissions[role]) {
        updatedPermissions[role] = { view: false, edit: false };
      }

      if (permissionType === "edit") {
        updatedPermissions[role].edit = newValue;
        if (newValue) {
          updatedPermissions[role].view = true;
        }
      } else {
        updatedPermissions[role].view = newValue;
        if (!newValue) {
          updatedPermissions[role].edit = false;
        }
      }

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
    return column.is_masterdata && role === UserRole.HR_ADMIN;
  };

  const handleDeleteClick = (column: ColumnConfig) => {
    setColumnToDelete(column);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    onPermissionsUpdated();
  };

  const handleToggleVisibility = async (column: ColumnConfig) => {
    try {
      setUpdatingColumnId(column.id);
      await columnService.toggleVisibility(column.id, !column.is_visible);
      toast.success(
        `Column "${column.column_name}" ${
          column.is_visible ? "hidden" : "shown"
        } successfully`
      );
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle visibility"
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]"></TableHead>
                <TableHead className="w-[200px]">{tForms("columnNameLabel")}</TableHead>
                <TableHead className="w-[100px]">{tAdmin("type")}</TableHead>
                <TableHead className="w-[120px]">{tAdmin("category")}</TableHead>
                <TableHead className="w-[100px]">{tAdmin("visibility")}</TableHead>
                {allRoles.map((role) => (
                  <TableHead key={role} className="text-center">
                    {role === UserRole.HR_ADMIN ? tAdmin("hrAdmin") : role.toUpperCase()}
                    <div className="text-xs font-normal text-gray-500">
                      View / Edit
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[150px] text-center">{tAdmin("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6 + allRoles.length}
                      className="text-center text-gray-500"
                    >
                      No columns found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((column, index) => (
                    <DraggableRow
                      key={column.id}
                      column={column}
                      allRoles={allRoles}
                      updatingColumnId={updatingColumnId}
                      isPermissionDisabled={isPermissionDisabled}
                      handlePermissionChange={handlePermissionChange}
                      handleToggleVisibility={handleToggleVisibility}
                      handleDeleteClick={handleDeleteClick}
                      isMobile={isMobile}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      t={t}
                      tAdmin={tAdmin}
                    />
                  ))
                )}
              </SortableContext>
            </TableBody>
          </Table>
        </div>
        <DeleteColumnModal
          column={columnToDelete}
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={handleDeleteConfirm}
        />
      </DndContext>
    </TooltipProvider>
  );
}
