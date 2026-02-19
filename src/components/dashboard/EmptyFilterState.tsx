"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";
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
  const tFilter = useTranslations("filter");

  // Format filter value for display
  const formatFilterValue = (filter: FilterState): string => {
    switch (filter.type) {
      case 'text':
        return filter.textValue ? `"${filter.textValue}"` : '';
      case 'boolean':
        return filter.boolValue === true ? tFilter("yes") : filter.boolValue === false ? tFilter("no") : tFilter("either");
      case 'date':
        if (filter.selectedDateIds && filter.selectedDateIds.length > 0) {
          const dateNames = filter.selectedDateIds
            .map(id => {
              const date = importantDates.find(d => d.id === id);
              return date?.date_description || tFilter("unknown");
            })
            .filter(name => name !== tFilter("unknown"));
          
          if (dateNames.length === 0) {
            return tFilter("datesSelected", { count: filter.selectedDateIds.length });
          }
          if (dateNames.length === 1) {
            return dateNames[0];
          }
          if (dateNames.length <= 2) {
            return dateNames.join(', ');
          }
          return `${dateNames.slice(0, 2).join(', ')} +${dateNames.length - 2}`;
        }
        return tFilter("dateRangeSelected");
      default:
        return '';
    }
  };

  return (
    <div className="text-center py-12" data-testid="empty-filter-state">
      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">{tFilter("noEmployeesFound")}</h3>
      <p className="text-muted-foreground mb-4">
        {tFilter("noEmployeesMatchCriteria")}
      </p>
      <div className="space-y-2 mb-4">
        <p className="text-sm text-muted-foreground">{tFilter("activeFiltersLabel")}</p>
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
        {tFilter("clearAllFilters")}
      </Button>
    </div>
  );
}
