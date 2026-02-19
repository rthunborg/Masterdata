"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/i18n";
import type { FilterState } from "@/lib/types/filter";
import type { ColumnConfig } from "@/lib/types/column-config";

interface SaveFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: FilterState[];
  columnConfigs: ColumnConfig[];
  onSave: (name: string) => Promise<void>;
}

/**
 * Dialog for saving filter combinations with a custom name
 * Story 20.6: Saved Filters
 */
export function SaveFilterDialog({
  open,
  onOpenChange,
  activeFilters,
  columnConfigs,
  onSave,
}: SaveFilterDialogProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const tFilter = useTranslations("filter");

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setError("");
    }
  }, [open]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    setError("");

    try {
      await onSave(trimmedName);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("already exists")
          ? tFilter("filterNameAlreadyExists")
          : msg || tFilter("saveFilterFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim() && !isSaving) {
      handleSave();
    }
  };

  // Get column name for display
  const getColumnName = (columnId: string): string => {
    const column = columnConfigs.find((c) => c.id === columnId);
    return column?.column_name || columnId;
  };

  // Format filter for display
  const formatFilter = (filter: FilterState): string => {
    const columnName = getColumnName(filter.columnId);

    if (filter.type === "text" && filter.textValue) {
      return `${columnName}: "${filter.textValue}"`;
    }

    if (filter.type === "boolean" && filter.boolValue !== undefined) {
      const value = filter.boolValue === null ? tFilter("either") : filter.boolValue ? tFilter("yes") : tFilter("no");
      return `${columnName}: ${value}`;
    }

    if (filter.type === "date") {
      if (filter.selectedDateIds && filter.selectedDateIds.length > 0) {
        return `${columnName}: ${tFilter("datesSelected", { count: filter.selectedDateIds.length })}`;
      }
      if (filter.dateRange?.from || filter.dateRange?.to) {
        return `${columnName}: ${tFilter("dateRangeSelected")}`;
      }
    }

    return columnName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tFilter("saveFilterDialogTitle")}</DialogTitle>
          <DialogDescription>
            {tFilter("saveFilterDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filter-name">{tFilter("filterName")}</Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tFilter("filterNamePlaceholder")}
              maxLength={50}
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "filter-name-error" : undefined}
            />
            {error && (
              <p id="filter-name-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {tFilter("maxCharacters")}
            </p>
          </div>

          {activeFilters.length > 0 && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium mb-2">{tFilter("thisWillSave")}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {activeFilters.map((filter, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span className="flex-1">{formatFilter(filter)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {tFilter("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? tFilter("saving") : tFilter("saveFilter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
