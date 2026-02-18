"use client";

import { useState } from "react";
import { X } from "lucide-react";
import equal from "fast-deep-equal";
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
}: SavedFiltersDropdownProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current filters match a saved filter using deep equality
  const isCurrentFilter = (saved: SavedFilter): boolean => {
    if (activeFilters.length !== saved.filters.length) return false;

    // Use fast-deep-equal for robust comparison
    // Sort both arrays by columnId to ensure order doesn't affect comparison
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
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete filter:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filterToDelete = savedFilters.find((f) => f.id === deleteId);

  if (savedFilters.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 space-y-2">
        <Label htmlFor="saved-filters-select">My Saved Filters</Label>
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(id) => {
              const saved = savedFilters.find((f) => f.id === id);
              if (saved) {
                onSelect(saved.filters);
              }
            }}
          >
            <SelectTrigger
              id="saved-filters-select"
              className="flex-1"
              aria-label="Select a saved filter"
            >
              <SelectValue placeholder="Select a saved filter..." />
            </SelectTrigger>
            <SelectContent>
              {savedFilters.map((saved) => {
                const isCurrent = isCurrentFilter(saved);
                return (
                  <SelectItem
                    key={saved.id}
                    value={saved.id}
                    className="group pr-10 relative"
                  >
                    <div className="flex items-center gap-2">
                      <span>{saved.name}</span>
                      {isCurrent && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          current
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteId(saved.id);
                      }}
                      aria-label={`Delete ${saved.name}`}
                      data-testid={`delete-filter-${saved.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {savedFilters.length} saved {savedFilters.length === 1 ? "filter" : "filters"}
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved filter?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{filterToDelete?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
