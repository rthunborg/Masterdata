"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterState } from "@/lib/types/filter";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { ImportantDate } from "@/lib/types/important-date";

interface EmptyFilterStateProps {
  activeFilters: FilterState[];
  columnConfigs: ColumnConfig[];
  onClearFilters: () => void;
  importantDates?: ImportantDate[]; // Story 20.5: For displaying actual date names
}

/**
 * Empty Filter State - Story 20.5
 * Displays when filters return no matching employees.
 * Shows active filters and provides a quick "Clear filters" action.
 */
export function EmptyFilterState({
  activeFilters,
  columnConfigs,
  onClearFilters,
  importantDates = [],
}: EmptyFilterStateProps) {
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
            return `${filter.selectedDateIds.length} date(s) selected`;
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
        return 'Date range selected';
      default:
        return '';
    }
  };

  return (
    <div className="text-center py-12" data-testid="empty-filter-state">
      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No employees found</h3>
      <p className="text-muted-foreground mb-4">
        No employees match your current filter criteria.
      </p>
      <div className="space-y-2 mb-4">
        <p className="text-sm text-muted-foreground">Active filters:</p>
        <ul className="text-sm space-y-1">
          {activeFilters.map(filter => {
            const column = columnConfigs.find(c => c.id === filter.columnId);
            if (!column) return null;
            
            return (
              <li key={filter.columnId} className="text-muted-foreground">
                • <strong>{column.column_name}:</strong> {formatFilterValue(filter)}
              </li>
            );
          })}
        </ul>
      </div>
      <Button onClick={onClearFilters}>
        Clear all filters
      </Button>
    </div>
  );
}
