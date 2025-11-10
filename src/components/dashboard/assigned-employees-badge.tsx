"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AssignedEmployeesBadgeProps {
  count: number;
  onOpenModal: () => void;
}

/**
 * Badge component displaying employee count for an important date.
 * Clickable to open modal with full employee list.
 * 
 * Story: 8.8 - Important Dates Assigned Employees List
 */
export function AssignedEmployeesBadge({ 
  count, 
  onOpenModal 
}: AssignedEmployeesBadgeProps) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium bg-gray-100 text-gray-500 border-gray-300">
        0
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpenModal();
      }}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
        "bg-blue-100 text-blue-800 border-blue-300",
        "hover:bg-blue-200 cursor-pointer transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      )}
      aria-label={`View ${count} assigned ${count === 1 ? 'employee' : 'employees'}`}
      type="button"
    >
      {count} {count === 1 ? 'employee' : 'employees'}
    </button>
  );
}
