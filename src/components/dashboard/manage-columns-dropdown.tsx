"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings, Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { useColumns } from "@/lib/hooks/use-columns";
import { useUIStore } from "@/lib/store/ui-store";
import { groupColumnsByCategory } from "@/lib/utils/column-grouping";
import { useTranslations } from "@/lib/i18n";
import { columnService } from "@/lib/services/column-service";
/**
 * Manage Columns Dialog Component
 * Shows list of custom columns grouped by category
 * Allows external party users to edit their custom columns
 */
export function ManageColumnsDialog() {
  const { columns, refetch } = useColumns();
  const { openEditColumnModal } = useUIStore();
  const t = useTranslations("tooltips");
  const tModals = useTranslations("modals");
  const tToasts = useTranslations("toasts");
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter to only show custom columns (is_masterdata = false)
  const customColumns = columns.filter((col) => !col.is_masterdata);

  // Group custom columns by category
  const groupedColumns = groupColumnsByCategory(customColumns);

  // Remove "Employee Information" group (that's for masterdata)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { "Employee Information": _employeeInfo, ...customColumnGroups } = groupedColumns;

  // If no custom columns, don't show the button
  if (customColumns.length === 0) {
    return null;
  }

  const handleEditColumn = (columnId: string) => {
    setOpen(false); // Close the manage dialog
    openEditColumnModal(columnId); // Open the edit modal
  };

  const handleDeleteClick = (e: React.MouseEvent, columnId: string, columnName: string) => {
    e.stopPropagation(); // Prevent triggering edit
    setColumnToDelete({ id: columnId, name: columnName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!columnToDelete) return;

    try {
      setIsDeleting(true);
      await columnService.deleteCustomColumn(columnToDelete.id);
      toast.success(tModals("deleteColumn.success") || tToasts("columns.columnDeleted", { name: columnToDelete.name }));
      refetch(); // Refresh columns list
      setDeleteDialogOpen(false);
      setColumnToDelete(null);
    } catch (error) {
      toast.error(tModals("deleteColumn.failed") || tToasts("columns.deleteFailed") || "Kunde inte ta bort kolumnen");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          {t("manageColumns")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tModals("manageCustomColumns")}</DialogTitle>
          <DialogDescription>
            {tModals("editCustomColumnsDescription")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(customColumnGroups).map(([category, cols]) => (
            <div key={category}>
              {/* Category Header */}
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {category === "Uncategorized" ? tModals("uncategorized") : category}
              </h3>
              
              {/* Columns in this category */}
              <div className="space-y-1">
                {cols.map((col) => (
                  <div key={col.id} className="flex items-center gap-1 group">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start"
                          onClick={() => handleEditColumn(col.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {col.column_name}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("editColumn")}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(e, col.id, col.column_name)}
                          aria-label={t("deleteColumn")}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("deleteColumn")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tModals("deleteColumn.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {columnToDelete && tModals("deleteColumn.message", { name: columnToDelete.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tModals("deleteColumn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? tModals("deleteColumn.deleting") : tModals("deleteColumn.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
