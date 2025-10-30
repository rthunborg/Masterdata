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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings, Edit } from "lucide-react";
import { useColumns } from "@/lib/hooks/use-columns";
import { useUIStore } from "@/lib/store/ui-store";
import { groupColumnsByCategory } from "@/lib/utils/column-grouping";
import { useTranslations } from "next-intl";
/**
 * Manage Columns Dialog Component
 * Shows list of custom columns grouped by category
 * Allows external party users to edit their custom columns
 */
export function ManageColumnsDialog() {
  const { columns } = useColumns();
  const { openEditColumnModal } = useUIStore();
  const t = useTranslations("tooltips");
  const [open, setOpen] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Manage Columns
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Custom Columns</DialogTitle>
          <DialogDescription>
            Edit your custom column names and categories
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(customColumnGroups).map(([category, cols]) => (
            <div key={category}>
              {/* Category Header */}
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {category}
              </h3>
              
              {/* Columns in this category */}
              <div className="space-y-1">
                {cols.map((col) => (
                  <Tooltip key={col.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
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
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
