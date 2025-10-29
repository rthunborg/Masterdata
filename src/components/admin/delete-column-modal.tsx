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
      toast.success(`Column "${column.column_name}" deleted successfully`);
      onDeleted();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete column";
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
            Delete Column &quot;{column.column_name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to delete this column? This action cannot
              be undone.
            </span>
            <span className="block font-semibold text-destructive">
              All data in this column will be permanently removed from all
              employees.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Column"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
