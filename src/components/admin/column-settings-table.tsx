"use client";

import { useState, useEffect, useRef } from "react";
import { ColumnConfig, RolePermissions } from "@/lib/types/column-config";
import { UserRole, EXTERNAL_PARTY_ROLES } from "@/lib/types/user";
import { columnService } from "@/lib/services/column-service";
import { useTranslations } from "@/lib/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { PermissionToggle } from "./permission-toggle";
import { DeleteColumnModal } from "./delete-column-modal";
import { ColorIndicator, ColorPicker } from "@/components/ui/color-picker";
import { toast } from "sonner";
import { Trash2, GripVertical, ChevronUp, ChevronDown, Check, X, Eye, EyeOff, ListChecks } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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

// Editable Column Name Cell Component
function EditableColumnNameCell({
  value,
  columnId,
  onUpdate,
  isUpdating,
}: {
  value: string;
  columnId: string;
  onUpdate: (columnId: string, newName: string) => Promise<void>;
  isUpdating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
      setInputValue(value);
      setIsEditing(false);
      return;
    }
    
    if (trimmedValue !== value) {
      await onUpdate(columnId, trimmedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => !isUpdating && setIsEditing(true)}
        className={cn(
          "cursor-pointer px-2 py-1 rounded hover:bg-blue-50 transition-colors",
          "min-h-8 font-medium break-words",
          isUpdating && "cursor-not-allowed opacity-50"
        )}
        title="Click to edit display name"
        style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
      >
        {value}
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        className="h-8"
        maxLength={100}
      />
    </div>
  );
}

// Editable Category Cell Component
function EditableCategoryCell({
  value,
  columnId,
  allColumns,
  onUpdate,
  onColorUpdate,
  isUpdating,
}: {
  value: string;
  columnId: string;
  allColumns: ColumnConfig[];
  onUpdate: (columnId: string, newCategory: string) => Promise<void>;
  onColorUpdate: (categoryName: string, color: string | null) => Promise<void>;
  isUpdating: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Get existing categories from all columns with their colors
  const existingCategories = Array.from(
    new Map(
      allColumns
        .filter((col) => col.category !== null && col.category !== "")
        .map((col) => [col.category!, { name: col.category!, color: col.category_color }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Get current category color
  const currentColor = allColumns.find((col) => col.id === columnId)?.category_color;

  const handleSelect = async (newCategory: string) => {
    setIsOpen(false);
    setInputValue(""); // Reset input for next open
    if (newCategory !== value) {
      await onUpdate(columnId, newCategory);
    }
  };

  const handleColorChange = async (color: string | null) => {
    if (value) {
      await onColorUpdate(value, color);
    }
    setIsColorPickerOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setInputValue(""); // Reset input when closing
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "flex-1 justify-start font-normal h-8 px-2",
              !value && "text-muted-foreground"
            )}
            disabled={isUpdating}
          >
            <span className="truncate flex-1">{value || "Ingen kategori"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Sök eller skriv ny kategori..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandEmpty>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => handleSelect(inputValue)}
              >
                Skapa &ldquo;{inputValue}&rdquo;
              </Button>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => handleSelect("")}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "" ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground italic">Ingen kategori</span>
              </CommandItem>
              {existingCategories.map((category) => (
                <CommandItem
                  key={category.name}
                  value={category.name}
                  onSelect={() => handleSelect(category.name)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {category.color && <ColorIndicator color={category.color} size="sm" />}
                    <span>{category.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Color edit button - only show when category is selected */}
      {value && (
        <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={isUpdating}
              title="Edit category color"
            >
              {currentColor ? (
                <ColorIndicator color={currentColor} size="sm" />
              ) : (
                <div className="h-4 w-4 rounded border-2 border-dashed border-gray-400" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Category Color</label>
                <p className="text-xs text-muted-foreground">
                  This color applies to all columns in this category
                </p>
              </div>
              <ColorPicker
                value={currentColor}
                onChange={handleColorChange}
                allowClear={true}
                placeholder="Select color"
              />
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Draggable row component
function DraggableRow({
  column,
  allRoles,
  allColumns,
  updatingColumnId,
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
}: {
  column: ColumnConfig;
  allRoles: UserRole[];
  allColumns: ColumnConfig[];
  updatingColumnId: string | null;
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
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn(!column.is_visible && "bg-gray-200 opacity-75")}
    >
      {/* Drag Handle / Move Buttons */}
      <TableCell className="w-12 lg:w-auto lg:p-2">
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

      {/* Column Name (Display Name - Editable) */}
      <TableCell className="lg:p-2">
        <EditableColumnNameCell
          value={column.column_name}
          columnId={column.id}
          onUpdate={handleColumnNameUpdate}
          isUpdating={isUpdating}
        />
      </TableCell>

      {/* Database Column Name (Read-only) */}
      <TableCell className="text-gray-600 lg:truncate lg:p-2">
        <span className="font-mono text-sm">{column.db_column_name}</span>
      </TableCell>

      {/* Type */}
      <TableCell className="text-gray-600 w-16 lg:w-auto lg:truncate lg:p-2">{column.column_type}</TableCell>

      {/* Masterdata indicator */}
      <TableCell className="w-24 lg:w-auto lg:p-2">
        {column.is_masterdata ? (
          <Check className="h-5 w-5 text-green-600 inline-block" />
        ) : (
          <X className="h-5 w-5 text-gray-400 inline-block" />
        )}
      </TableCell>

      {/* Story 19.5: Checklist Item toggle (only for boolean masterdata columns) */}
      <TableCell className="w-24 lg:w-auto lg:p-2">
        {column.column_type === 'boolean' && column.is_masterdata ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={column.is_checklist_item ?? false}
                  onCheckedChange={(checked: boolean) => handleChecklistItemToggle(column.id, checked)}
                  disabled={isUpdating}
                  aria-label="Toggle checklist item"
                />
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

      {/* Category */}
      <TableCell className="w-40 lg:w-auto lg:p-2">
        <EditableCategoryCell
          value={column.category || ""}
          columnId={column.id}
          allColumns={allColumns}
          onUpdate={handleCategoryUpdate}
          onColorUpdate={handleCategoryColorUpdate}
          isUpdating={isUpdating}
        />
      </TableCell>

      {/* Role Permissions */}
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
                onChange={(value: boolean) =>
                  handlePermissionChange(column, role, "edit", value)
                }
                tooltip={undefined}
              />
            </div>
          </TableCell>
        );
      })}

      {/* Actions */}
      <TableCell className="text-left w-20 lg:w-auto lg:pl-4 lg:pr-2">
        <div className="flex items-center justify-start gap-2">
          {/* Toggle Visibility Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleVisibility(column)}
                disabled={isUpdating}
                className="h-8 w-8 p-0 bg-gray-500 hover:bg-gray-600 border border-gray-400 rounded"
              >
                {column.is_visible ? (
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
          
          {/* Delete Button */}
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
  const tAdmin = useTranslations("admin");
  const tToasts = useTranslations("toasts");

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  
  // Note: Column resizing for this table requires TanStack Table refactor
  // due to complex drag-and-drop implementation. Placeholder for future enhancement.
  
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
        toast.success(tToasts("columns.orderUpdated"));
        onPermissionsUpdated();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : tToasts("columns.orderUpdateFailed")
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
      toast.success(tToasts("columns.movedUp"));
      onPermissionsUpdated();
    } catch {
      toast.error(tToasts("columns.moveFailed"));
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
      toast.success(tToasts("columns.movedDown"));
      onPermissionsUpdated();
    } catch {
      toast.error(tToasts("columns.moveFailed"));
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

      toast.success(tToasts("columns.permissionsUpdated"));
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tToasts("columns.permissionsUpdateFailed")
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const isPermissionDisabled = (): boolean => {
    // No permissions are locked - HR Admin can modify both view and edit permissions
    return false;
  };

  const handleCategoryUpdate = async (columnId: string, newCategory: string) => {
    try {
      setUpdatingColumnId(columnId);
      await columnService.updateColumnPermissions(columnId, {
        category: newCategory || null,
      });
      toast.success(tToasts("columns.categoryUpdated"));
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tToasts("columns.categoryUpdateFailed")
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const handleCategoryColorUpdate = async (categoryName: string, color: string | null) => {
    try {
      await columnService.updateCategoryColor(categoryName, color);
      toast.success(tToasts("columns.categoryColorUpdated"));
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tToasts("columns.categoryColorUpdateFailed")
      );
    }
  };

  const handleColumnNameUpdate = async (columnId: string, newName: string) => {
    try {
      setUpdatingColumnId(columnId);
      await columnService.updateColumnPermissions(columnId, {
        column_name: newName,
      });
      toast.success(tToasts("columns.nameUpdated"));
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tToasts("columns.nameUpdateFailed")
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  // Story 19.5: Handle checklist item toggle
  const handleChecklistItemToggle = async (columnId: string, isChecklistItem: boolean) => {
    try {
      setUpdatingColumnId(columnId);
      await columnService.updateColumnPermissions(columnId, {
        is_checklist_item: isChecklistItem,
      });
      toast.success(
        isChecklistItem 
          ? "Kolumn tillagd i checklistan" 
          : "Kolumn borttagen från checklistan"
      );
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunde inte uppdatera checklista-inställning"
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const handleDeleteClick = (column: ColumnConfig) => {
    setColumnToDelete(column);
    setDeleteModalOpen(true);
  };

  const handleToggleVisibility = async (column: ColumnConfig) => {
    try {
      setUpdatingColumnId(column.id);
      await columnService.toggleVisibility(column.id, !column.is_visible);
      toast.success(
        column.is_visible 
          ? "Kolumn inaktiverad - alla behörigheter har tagits bort" 
          : "Kolumn aktiverad"
      );
      onPermissionsUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunde inte ändra kolumnens synlighet"
      );
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const handleDeleteConfirm = () => {
    onPermissionsUpdated();
  };

  return (
    <TooltipProvider>
      {/* Note: Reset Column Widths button placeholder for future TanStack Table refactor */}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-md border w-full overflow-x-auto lg:overflow-hidden">
          <Table className="w-full table-auto lg:table-fixed">
            <colgroup className="hidden lg:table-column-group">
              <col style={{ width: '2.5%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '10%' }} />
              {allRoles.map((role, index) => (
                <col key={`role-${role}-${index}`} style={{ width: `${42.5 / allRoles.length}%` }} />
              ))}
              <col style={{ width: '10%' }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 lg:w-auto lg:p-2"></TableHead>
                <TableHead className="min-w-[150px] lg:min-w-0 lg:p-2">Visningsnamn</TableHead>
                <TableHead className="min-w-[150px] lg:min-w-0 lg:p-2">Databasnamn</TableHead>
                <TableHead className="w-16 lg:w-auto lg:p-2">{tAdmin("type")}</TableHead>
                <TableHead className="w-24 lg:w-auto lg:p-2">Masterdata</TableHead>
                <TableHead className="w-24 lg:w-auto lg:p-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <ListChecks className="h-4 w-4" />
                        <span className="hidden xl:inline">Checklista</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Inkludera i medarbetarens checklista-indikator</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-40 lg:w-auto lg:p-2">{tAdmin("category")}</TableHead>
                {allRoles.map((role) => (
                  <TableHead key={role} className="w-40 lg:w-auto lg:p-2">
                      {role === UserRole.HR_ADMIN ? tAdmin("hrAdmin") : role.toUpperCase()}
                  </TableHead>
                ))}
                <TableHead className="w-40 lg:w-auto text-left lg:pl-4 lg:pr-2">{tAdmin("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8 + allRoles.length}
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
                      allColumns={allColumns}
                      updatingColumnId={updatingColumnId}
                      isPermissionDisabled={isPermissionDisabled}
                      handlePermissionChange={handlePermissionChange}
                      handleCategoryUpdate={handleCategoryUpdate}
                      handleCategoryColorUpdate={handleCategoryColorUpdate}
                      handleColumnNameUpdate={handleColumnNameUpdate}
                      handleChecklistItemToggle={handleChecklistItemToggle}
                      handleDeleteClick={handleDeleteClick}
                      handleToggleVisibility={handleToggleVisibility}
                      isMobile={isMobile}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      t={t}
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
