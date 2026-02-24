import * as React from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/utils/toast-helpers";
import { useTranslations } from "@/lib/i18n";
import { importantDateService } from "@/lib/services/important-date-service";
import type { ImportantDate } from "@/lib/types/important-date";
import { hasValueChanged } from "@/lib/utils/change-detection";

interface UseImportantDatesActionsParams {
  dates: ImportantDate[];
  onDateUpdated?: () => void;
  onDateDeleted?: () => void;
}

export function useImportantDatesActions({
  dates,
  onDateUpdated,
  onDateDeleted,
}: UseImportantDatesActionsParams) {
  const tDates = useTranslations("dates");
  const tToasts = useTranslations("toasts");

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<ImportantDate | null>(null);
  const [selectedDateForEmployees, setSelectedDateForEmployees] = React.useState<ImportantDate | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  const handleCellUpdate = React.useCallback(async (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => {
    try {
      const currentDate = dates.find(d => d.id === id);

      if (currentDate) {
        const originalValue = currentDate[field as keyof typeof currentDate];
        const normalizedOriginal = originalValue ?? null;
        const normalizedCurrent = value ?? null;

        if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
          return;
        }
      }

      let updateValue: string | number | null = value as string | number | null;
      if (field === "week_number" && value !== null && typeof value === "string") {
        updateValue = parseInt(value, 10);
        if (isNaN(updateValue)) {
          throw new Error("Veckonummer måste vara ett giltigt nummer");
        }
      }

      if (field === "max_spots") {
        const numValue = typeof value === "number" ? value : (value !== null ? parseInt(String(value), 10) : null);
        if (numValue === null || isNaN(numValue) || numValue < 0) {
          throw new Error("Max kapacitet måste vara ett giltigt icke-negativt nummer");
        }

        if (currentDate) {
          const currentMaxSpots = currentDate.max_spots ?? 99;
          const currentRemainingSpots = currentDate.remaining_spots ?? 99;
          const assignedCount = currentMaxSpots - currentRemainingSpots;
          const newRemainingSpots = Math.max(0, numValue - assignedCount);

          await importantDateService.update(id, {
            max_spots: numValue,
            remaining_spots: newRemainingSpots
          });
        } else {
          await importantDateService.update(id, { max_spots: numValue });
        }
      } else {
        await importantDateService.update(id, { [field]: updateValue });
      }

      toast.success(tDates('dateUpdated'));
      onDateUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Misslyckades att uppdatera viktig datum";
      throw new Error(message);
    }
  }, [onDateUpdated, dates, tDates]);

  const handleDeleteClick = (date: ImportantDate) => {
    setSelectedDate(date);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDate) return;

    try {
      setIsDeleting(true);
      await importantDateService.delete(selectedDate.id);
      toast.success(tToasts('dates.dateDeleted'));
      setDeleteDialogOpen(false);
      onDateDeleted?.();
    } catch (error: unknown) {
      toastError(error, tToasts('dates.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveClick = React.useCallback(async (date: ImportantDate) => {
    try {
      setIsArchiving(true);
      await importantDateService.archive(date.id);
      toast.success(tToasts('dates.dateArchived'));
      onDateUpdated?.();
    } catch (error: unknown) {
      toastError(error, tToasts('dates.archiveFailed'));
    } finally {
      setIsArchiving(false);
    }
  }, [onDateUpdated, tToasts]);

  const handleRestoreClick = React.useCallback(async (date: ImportantDate) => {
    try {
      setIsArchiving(true);
      await importantDateService.restore(date.id);
      toast.success(tToasts('dates.dateRestored'));
      onDateUpdated?.();
    } catch (error: unknown) {
      toastError(error, tToasts('dates.restoreFailed'));
    } finally {
      setIsArchiving(false);
    }
  }, [onDateUpdated, tToasts]);

  const handleCellError = React.useCallback((error: string) => {
    toast.error(error);
  }, []);

  return {
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedDate,
    selectedDateForEmployees,
    setSelectedDateForEmployees,
    isDeleting,
    isArchiving,

    handleCellUpdate,
    handleDeleteClick,
    handleConfirmDelete,
    handleArchiveClick,
    handleRestoreClick,
    handleCellError,
  };
}
