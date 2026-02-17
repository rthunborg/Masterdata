"use client";

import * as React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExportConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredCount: number;
  totalCount: number;
  onConfirm: () => void;
}

/**
 * Story 20.7: Export Confirmation Dialog
 * 
 * Shows a confirmation dialog when exporting filtered data to ensure
 * users are aware they're exporting a subset of employees.
 */
export function ExportConfirmationDialog({
  open,
  onOpenChange,
  filteredCount,
  totalCount,
  onConfirm,
}: ExportConfirmationDialogProps) {
  const [dontAskAgain, setDontAskAgain] = React.useState(false);

  const handleConfirm = () => {
    if (dontAskAgain) {
      localStorage.setItem("export-confirmation-dismissed", "true");
    }
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export Filtered Employees</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to export <strong>{filteredCount} of {totalCount}</strong> employees
            based on your active filters.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="dont-ask"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(!!checked)}
          />
          <Label htmlFor="dont-ask" className="text-sm cursor-pointer">
            Don&apos;t ask me again
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Export {filteredCount} Employees
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
