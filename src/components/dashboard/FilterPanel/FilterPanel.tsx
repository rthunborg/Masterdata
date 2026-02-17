"use client";

import { useEffect, useRef, useState } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { FilterState } from "@/lib/types/filter";
import type { ImportantDate } from "@/lib/types/important-date";
import { FilterColumnItem } from "./FilterColumnItem";
import { ActiveFiltersList } from "./ActiveFiltersList";
import { SaveFilterDialog } from "./SaveFilterDialog";
import { SavedFiltersDropdown } from "./SavedFiltersDropdown";
import { useSavedFilters } from "@/hooks/useSavedFilters";

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  columnConfigs: ColumnConfig[];
  activeFilters: FilterState[];
  onFiltersChange: (filters: FilterState[]) => void;
  importantDates?: ImportantDate[]; // Story 20.5: For date filter display
}

export function FilterPanel({
  isOpen,
  onClose,
  columnConfigs,
  activeFilters,
  onFiltersChange,
  importantDates = [],
}: FilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Story 20.6: Saved Filters integration
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();

  // Filter out non-filterable columns
  const filterableColumns = columnConfigs
    .filter(
      (col) =>
        col.is_visible &&
        !["id", "created_at", "updated_at"].includes(col.db_column_name)
    )
    .sort((a, b) => a.display_order - b.display_order);

  // Handle ESC key press and focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }

      // Focus trap: Handle Tab key to keep focus within panel
      if (e.key === "Tab" && isOpen && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (e.shiftKey) {
          // Shift+Tab: If on first element, go to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab: If on last element, go to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus the close button when panel opens
      setTimeout(() => {
        const closeButton = panelRef.current?.querySelector(
          '[data-testid="close-filter-panel"]'
        ) as HTMLElement;
        closeButton?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = () => {
    onClose();
  };

  // Prevent panel clicks from closing
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Story 20.6: Handle saving filters
  const handleSaveFilter = async (name: string) => {
    await saveFilter({ name, filters: activeFilters });
    setShowSaveDialog(false);
  };

  // Story 20.6: Handle applying saved filter
  const handleApplySavedFilter = (filters: FilterState[]) => {
    onFiltersChange(filters);
  };

  // Story 20.6: Handle deleting saved filter
  const handleDeleteFilter = async (id: string) => {
    await deleteFilter(id);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={handleOverlayClick}
        data-testid="filter-panel-overlay"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-panel-title"
        tabIndex={-1}
        className={cn(
          "fixed right-0 top-0 h-full w-[400px] bg-white shadow-xl z-50",
          "transform transition-transform duration-300 ease-in-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={handlePanelClick}
        data-testid="filter-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="filter-panel-title" className="text-lg font-semibold">
            Filter Employees
          </h2>
          <div className="flex items-center gap-2">
            {/* Story 20.6: Save Filter button */}
            {activeFilters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                aria-label="Save current filters"
                data-testid="save-filter-button"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Filter
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close filter panel"
              data-testid="close-filter-panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Story 20.6: Saved Filters Dropdown */}
          <SavedFiltersDropdown
            savedFilters={savedFilters}
            activeFilters={activeFilters}
            onSelect={handleApplySavedFilter}
            onDelete={handleDeleteFilter}
          />

          {/* Story 20.5: Active Filters List */}
          <ActiveFiltersList
            filters={activeFilters}
            columnConfigs={columnConfigs}
            onRemove={(columnId) => {
              onFiltersChange(activeFilters.filter((f) => f.columnId !== columnId));
            }}
            onClearAll={() => onFiltersChange([])}
            importantDates={importantDates}
          />
          
          {filterableColumns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No filterable columns available.
            </p>
          ) : (
            <div className="space-y-2">
              {filterableColumns.map((column) => {
                const activeFilter = activeFilters.find(
                  (f) => f.columnId === column.id
                );
                return (
                  <FilterColumnItem
                    key={column.id}
                    column={column}
                    activeFilter={activeFilter}
                    onFilterChange={(filter) => {
                      if (filter) {
                        // Add or update filter
                        const newFilters = activeFilters.filter(
                          (f) => f.columnId !== column.id
                        );
                        onFiltersChange([...newFilters, filter]);
                      } else {
                        // Remove filter
                        onFiltersChange(
                          activeFilters.filter((f) => f.columnId !== column.id)
                        );
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button onClick={onClose} className="w-full" data-testid="apply-filters">
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Story 20.6: Save Filter Dialog */}
      <SaveFilterDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        activeFilters={activeFilters}
        columnConfigs={columnConfigs}
        onSave={handleSaveFilter}
      />
    </>
  );
}
