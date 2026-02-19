"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { FilterState } from "@/lib/types/filter";
import { TextFilter } from "./TextFilter";
import { BooleanFilter } from "./BooleanFilter";
import { DateFilter } from "./DateFilter";
import { useAvailableDates } from "@/lib/hooks/use-available-dates";

interface FilterColumnItemProps {
  column: ColumnConfig;
  activeFilter?: FilterState;
  onFilterChange: (filter: FilterState | null) => void;
  /** When this changes, text filters flush pending debounced value (used when Apply Filters is clicked). */
  flushTrigger?: number;
}

export function FilterColumnItem({
  column,
  activeFilter,
  onFilterChange,
  flushTrigger,
}: FilterColumnItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine if this is a date column
  const isDateColumn = column.db_column_name.endsWith("_date");

  // Fetch available dates for date columns (only when expanded)
  const { dates, isLoading: _isLoading, error: _error } = useAvailableDates(
    column,
    isExpanded && isDateColumn
  );

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Render appropriate filter control based on column type
  const renderFilterControl = () => {
    // Date columns (UUID references to important_dates)
    if (isDateColumn) {
      return (
        <DateFilter
          column={column}
          dateRange={activeFilter?.dateRange || { from: null, to: null }}
          selectedDateIds={activeFilter?.selectedDateIds || []}
          availableDates={dates}
          onDateRangeChange={(range) => {
            const hasRange = range.from || range.to;
            const hasSelectedDates =
              activeFilter?.selectedDateIds && activeFilter.selectedDateIds.length > 0;

            // If no range and no selected dates, clear filter
            if (!hasRange && !hasSelectedDates) {
              onFilterChange(null);
            } else {
              onFilterChange({
                columnId: column.id,
                type: "date",
                dateRange: range,
                selectedDateIds: activeFilter?.selectedDateIds || [],
              });
            }
          }}
          onDateSelectionChange={(dateIds) => {
            const hasRange =
              activeFilter?.dateRange?.from || activeFilter?.dateRange?.to;
            const hasSelectedDates = dateIds.length > 0;

            // If no range and no selected dates, clear filter
            if (!hasRange && !hasSelectedDates) {
              onFilterChange(null);
            } else {
              onFilterChange({
                columnId: column.id,
                type: "date",
                dateRange: activeFilter?.dateRange || { from: null, to: null },
                selectedDateIds: dateIds,
              });
            }
          }}
        />
      );
    }

    // Boolean columns
    if (column.column_type === "boolean") {
      return (
        <BooleanFilter
          column={column}
          value={activeFilter?.boolValue ?? null}
          onChange={(value) => {
            if (value === null) {
              onFilterChange(null); // "Either" selected - clear filter
            } else {
              onFilterChange({
                columnId: column.id,
                type: "boolean",
                boolValue: value,
              });
            }
          }}
        />
      );
    }

    // Text columns (default for text, number, and other types)
    return (
      <TextFilter
        column={column}
        value={activeFilter?.textValue || ""}
        onChange={(value) => {
          if (value.trim() === "") {
            onFilterChange(null); // Empty text - clear filter
          } else {
            onFilterChange({
              columnId: column.id,
              type: "text",
              textValue: value,
            });
          }
        }}
        onClear={() => onFilterChange(null)}
        flushTrigger={flushTrigger}
      />
    );
  };

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden",
        activeFilter && "border-primary bg-primary/5"
      )}
      data-testid={`filter-column-item-${column.db_column_name}`}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
        aria-expanded={isExpanded}
        aria-controls={`filter-content-${column.id}`}
        data-testid={`filter-column-toggle-${column.db_column_name}`}
      >
        <div className="flex items-center gap-2 flex-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{column.column_name}</span>
        </div>
        {activeFilter && (
          <span className="text-xs text-primary font-medium">Active</span>
        )}
      </button>

      {/* Content (expanded) */}
      {isExpanded && (
        <div
          id={`filter-content-${column.id}`}
          className="p-3 border-t bg-muted/20"
          data-testid={`filter-content-${column.db_column_name}`}
        >
          {renderFilterControl()}
        </div>
      )}
    </div>
  );
}
