"use client";

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
import { useState } from "react";
import { columnService } from "@/lib/services/column-service";
import { toast } from "sonner";
import type { ColumnConfig } from "@/lib/types/column-config";

interface DeleteColumnModalProps {
  column: ColumnConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteColumnModal({
  column,
  isOpen,
  onClose,
  onDeleted,
}: DeleteColumnModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!column) return;

    setIsDeleting(true);
    try {
      await columnService.deleteColumn(column.id);
      toast.success(`Kolumn "${column.column_name}" borttagen`);
      onDeleted();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Kunde inte ta bort kolumnen";
      toast.error(errorMessage);
      // Don't close modal on error - user might want to retry or cancel manually
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Only allow closing via cancel button if not currently deleting
    if (!open && !isDeleting) {
      onClose();
    }
  };

  if (!column) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Ta bort kolumn &quot;{column.column_name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {column.is_masterdata ? (
              <>
                <span className="block font-semibold text-destructive">
                  Detta är en masterdata-kolumn. Om du tar bort den kommer den att försvinna från alla medarbetare. Detta kan inte ångras.
                </span>
                <span className="block">
                  All data i denna kolumn kommer att tas bort permanent från alla medarbetare.
                </span>
              </>
            ) : (
              <>
                <span className="block">
                  Är du säker på att du vill ta bort denna kolumn? Denna åtgärd kan inte ångras.
                </span>
                <span className="block font-semibold text-destructive">
                  All data i denna kolumn kommer att tas bort permanent från alla medarbetare.
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Tar bort..." : "Ta bort kolumn"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
