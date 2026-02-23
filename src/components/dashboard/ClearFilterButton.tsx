"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClearFilterButtonProps {
  onClick: () => void;
  show: boolean;
  className?: string;
}

/**
 * Clear Filter Button - Story 20.5
 * Appears next to Filter button when filters are active.
 * Clicking clears all active filters.
 */
export function ClearFilterButton({ 
  onClick, 
  show,
  className
}: ClearFilterButtonProps) {
  if (!show) return null;
  
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={className}
      aria-label="Clear all filters"
      data-testid="clear-filter-button"
    >
      <X className="mr-2 h-4 w-4" />
      Rensa filter
    </Button>
  );
}
