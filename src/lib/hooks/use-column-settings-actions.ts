import { useState } from 'react';
import { toast } from 'sonner';
import { toastError } from '@/lib/utils/toast-helpers';
import { useTranslations } from '@/lib/i18n';
import { columnService } from '@/lib/services/column-service';
import type { ColumnConfig, RolePermissions } from '@/lib/types/column-config';
import type { UserRole } from '@/lib/types/user';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

interface UseColumnSettingsActionsParams {
  items: ColumnConfig[];
  setItems: (items: ColumnConfig[]) => void;
  columns: ColumnConfig[];
  allColumns: ColumnConfig[];
  onPermissionsUpdated: () => void;
}

function buildReorderUpdates(
  newItems: ColumnConfig[],
  allColumns: ColumnConfig[]
): Array<{ id: string; display_order: number }> {
  const reorderedMap = new Map<string, number>();
  newItems.forEach((col, idx) => {
    reorderedMap.set(col.id, idx);
  });
  return allColumns.map((col) => {
    const newPos = reorderedMap.get(col.id);
    return {
      id: col.id,
      display_order: newPos !== undefined ? newPos : col.display_order,
    };
  });
}

export function useColumnSettingsActions({
  items,
  setItems,
  columns,
  allColumns,
  onPermissionsUpdated,
}: UseColumnSettingsActionsParams) {
  const [updatingColumnId, setUpdatingColumnId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<ColumnConfig | null>(null);
  const tToasts = useTranslations('toasts');

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);

      setItems(newItems);

      try {
        await columnService.reorderColumns(buildReorderUpdates(newItems, allColumns));
        toast.success(tToasts('columns.orderUpdated'));
        onPermissionsUpdated();
      } catch (error) {
        toastError(error, tToasts('columns.orderUpdateFailed'));
        setItems(columns);
      }
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);

    try {
      await columnService.reorderColumns(buildReorderUpdates(newItems, allColumns));
      toast.success(tToasts('columns.movedUp'));
      onPermissionsUpdated();
    } catch {
      toast.error(tToasts('columns.moveFailed'));
      setItems(columns);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);

    try {
      await columnService.reorderColumns(buildReorderUpdates(newItems, allColumns));
      toast.success(tToasts('columns.movedDown'));
      onPermissionsUpdated();
    } catch {
      toast.error(tToasts('columns.moveFailed'));
      setItems(columns);
    }
  };

  const handlePermissionChange = async (
    column: ColumnConfig,
    role: UserRole,
    permissionType: 'view' | 'edit',
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

      if (permissionType === 'edit') {
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

      toast.success(tToasts('columns.permissionsUpdated'));
      onPermissionsUpdated();
    } catch (error) {
      toastError(error, tToasts('columns.permissionsUpdateFailed'));
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const handleCategoryUpdate = async (columnId: string, newCategory: string) => {
    try {
      setUpdatingColumnId(columnId);
      await columnService.updateColumnPermissions(columnId, {
        category: newCategory || null,
      });
      toast.success(tToasts('columns.categoryUpdated'));
      onPermissionsUpdated();
    } catch (error) {
      toastError(error, tToasts('columns.categoryUpdateFailed'));
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const handleCategoryColorUpdate = async (categoryName: string, color: string | null) => {
    try {
      await columnService.updateCategoryColor(categoryName, color);
      toast.success(tToasts('columns.categoryColorUpdated'));
      onPermissionsUpdated();
    } catch (error) {
      toastError(error, tToasts('columns.categoryColorUpdateFailed'));
    }
  };

  const handleColumnNameUpdate = async (columnId: string, newName: string) => {
    try {
      setUpdatingColumnId(columnId);
      await columnService.updateColumnPermissions(columnId, {
        column_name: newName,
      });
      toast.success(tToasts('columns.nameUpdated'));
      onPermissionsUpdated();
    } catch (error) {
      toastError(error, tToasts('columns.nameUpdateFailed'));
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const handleChecklistItemToggle = async (columnId: string, isChecklistItem: boolean) => {
    try {
      setUpdatingColumnId(columnId);
      await columnService.updateColumnPermissions(columnId, {
        is_checklist_item: isChecklistItem,
      });
      toast.success(
        isChecklistItem
          ? 'Kolumn tillagd i checklistan'
          : 'Kolumn borttagen från checklistan'
      );
      onPermissionsUpdated();
    } catch (error) {
      toastError(error, 'Kunde inte uppdatera checklista-inställning');
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
          ? 'Kolumn inaktiverad - alla behörigheter har tagits bort'
          : 'Kolumn aktiverad'
      );
      onPermissionsUpdated();
    } catch (error) {
      toastError(error, 'Kunde inte ändra kolumnens synlighet');
    } finally {
      setUpdatingColumnId(null);
    }
  };

  const handleDeleteConfirm = () => {
    onPermissionsUpdated();
  };

  const isPermissionDisabled = (): boolean => {
    return false;
  };

  return {
    updatingColumnId,
    deleteModalOpen,
    setDeleteModalOpen,
    columnToDelete,

    handleDragEnd,
    handleMoveUp,
    handleMoveDown,
    handlePermissionChange,
    handleCategoryUpdate,
    handleCategoryColorUpdate,
    handleColumnNameUpdate,
    handleChecklistItemToggle,
    handleDeleteClick,
    handleToggleVisibility,
    handleDeleteConfirm,
    isPermissionDisabled,
  };
}
