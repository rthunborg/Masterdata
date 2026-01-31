"use client";

interface FilteredCountDisplayProps {
  filteredCount: number;
  totalCount: number;
  show: boolean;
  className?: string;
}

/**
 * Filtered Count Display - Story 20.5
 * Shows "Showing X of Y employees" when filters are active.
 * Hidden when no filters are applied.
 */
export function FilteredCountDisplay({
  filteredCount,
  totalCount,
  show,
  className,
}: FilteredCountDisplayProps) {
  if (!show) return null;
  
  return (
    <p className={`text-sm text-muted-foreground ${className || ''}`} data-testid="filtered-count-display">
      Showing <span className="font-medium">{filteredCount}</span> of {totalCount} employees
    </p>
  );
}
