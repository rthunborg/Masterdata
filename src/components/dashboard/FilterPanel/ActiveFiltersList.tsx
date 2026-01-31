"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterState } from "@/lib/types/filter";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { ImportantDate } from "@/lib/types/important-date";

interface ActiveFiltersListProps {
  filters: FilterState[];
  columnConfigs: ColumnConfig[];
  onRemove: (columnId: string) => void;
  onClearAll: () => void;
  importantDates?: ImportantDate[]; // Story 20.5: For displaying actual date names
}

/**
 * Active Filters List - Story 20.5
 * Displays list of currently active filters at top of filter panel.
 * Each filter can be individually removed via X button.
 */
export function ActiveFiltersList({
  filters,
  columnConfigs,
  onRemove,
  onClearAll,
  importantDates = [],
}: ActiveFiltersListProps) {
  if (filters.length === 0) return null;

  // Format filter value for display
  const formatFilterValue = (filter: FilterState): string => {
    switch (filter.type) {
      case 'text':
        return filter.textValue ? `"${filter.textValue}"` : '';
      case 'boolean':
        return filter.boolValue === true ? 'Yes' : filter.boolValue === false ? 'No' : 'Either';
      case 'date':
        if (filter.selectedDateIds && filter.selectedDateIds.length > 0) {
          // Story 20.5: Show actual date names instead of just count
          const dateNames = filter.selectedDateIds
            .map(id => {
              const date = importantDates.find(d => d.id === id);
              return date?.date_description || 'Unknown';
            })
            .filter(name => name !== 'Unknown');
          
          if (dateNames.length === 0) {
            return `${filter.selectedDateIds.length} date(s)`;
          }
          if (dateNames.length === 1) {
            return dateNames[0];
          }
          // Show first 2 dates, then count if more
          if (dateNames.length <= 2) {
            return dateNames.join(', ');
          }
          return `${dateNames.slice(0, 2).join(', ')} +${dateNames.length - 2} more`;
        }
        return 'Date range';
      default:
        return '';
    }
  };
  
  return (
    <div className="border-b pb-4 mb-4" data-testid="active-filters-list">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Active Filters ({filters.length})</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs h-7"
          data-testid="clear-all-filters-button"
        >
          Clear All
        </Button>
      </div>
      <div className="space-y-2">
        {filters.map(filter => {
          const column = columnConfigs.find(c => c.id === filter.columnId);
          if (!column) return null;
          
          return (
            <div 
              key={filter.columnId}
              className="flex items-center justify-between bg-muted px-3 py-2 rounded-md text-sm"
              data-testid={`active-filter-${filter.columnId}`}
            >
              <span className="flex-1 truncate">
                <strong>{column.display_name}:</strong> {formatFilterValue(filter)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(filter.columnId)}
                className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                aria-label={`Remove ${column.display_name} filter`}
                data-testid={`remove-filter-${filter.columnId}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
