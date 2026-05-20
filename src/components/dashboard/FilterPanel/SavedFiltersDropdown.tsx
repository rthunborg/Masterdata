"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import equal from "fast-deep-equal";
import { useTranslations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import type { SavedFilter } from "@/lib/types/saved-filter";
import type { FilterState } from "@/lib/types/filter";

interface SavedFiltersDropdownProps {
  savedFilters: SavedFilter[];
  activeFilters: FilterState[];
  onSelect: (filters: FilterState[]) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
}

/**
 * Dropdown for selecting and managing saved filters
 * Story 20.6: Saved Filters
 */
export function SavedFiltersDropdown({
  savedFilters,
  activeFilters,
  onSelect,
  onDelete,
  isDeleting: isDeletingExternal = false,
}: SavedFiltersDropdownProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCurrentFilter = (saved: SavedFilter): boolean => {
    if (activeFilters.length !== saved.filters.length) return false;

    const sortedActive = [...activeFilters].sort((a, b) => 
      a.columnId.localeCompare(b.columnId)
    );
    const sortedSaved = [...saved.filters].sort((a, b) => 
      a.columnId.localeCompare(b.columnId)
    );

    return equal(sortedActive, sortedSaved);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteId);
      setSelectedId(undefined);
      setDeleteId(null);
    } catch (error) {
      console.error("Misslyckades att ta bort filter:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const tFilter = useTranslations("filter");
  const filterToDelete = savedFilters.find((f) => f.id === deleteId);
  const selectedFilter = savedFilters.find((f) => f.id === selectedId);

  useEffect(() => {
    if (selectedId && !selectedFilter) {
      setSelectedId(undefined);
    }
  }, [selectedFilter, selectedId]);

  return (
    <>
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="saved-filters-select">{tFilter("mySavedFilters")}</Label>
          {isDeletingExternal && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        {savedFilters.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {tFilter("noSavedFiltersYet")}
          </p>
        ) : (
          <>
          <div className="flex items-center gap-2">
          <Select
            value={selectedId}
            onValueChange={(id) => {
              setSelectedId(id);
              const saved = savedFilters.find((f) => f.id === id);
              if (saved) {
                onSelect(saved.filters);
              }
            }}
          >
            <SelectTrigger
              id="saved-filters-select"
              className="flex-1"
              aria-label={tFilter("selectSavedFilter")}
            >
              <SelectValue placeholder={tFilter("selectSavedFilterPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {savedFilters.map((saved) => {
                const isCurrent = isCurrentFilter(saved);
                return (
                  <SelectItem
                    key={saved.id}
                    value={saved.id}
                  >
                    <div className="flex items-center gap-2">
                      <span>{saved.name}</span>
                      {isCurrent && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {tFilter("current")}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteId(selectedFilter.id)}
              aria-label={tFilter("deleteSavedFilterAria", { name: selectedFilter.name })}
              data-testid={`delete-filter-${selectedFilter.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {savedFilters.length === 1
            ? tFilter("savedFilterCount", { count: savedFilters.length })
            : tFilter("savedFilterCountPlural", { count: savedFilters.length })}
        </p>
          </>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tFilter("deleteSavedFilter")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tFilter("deleteSavedFilterConfirm", { name: filterToDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tFilter("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? tFilter("deleting") : tFilter("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
