"use client";

/**
 * Story 19.5: Checklist Progress Indicator
 * 
 * Displays a visual indicator showing how many checklist items (boolean fields
 * marked as is_checklist_item) are completed for an employee.
 * 
 * Features:
 * - Progress bar with color coding (green=100%, yellow=50-99%, red=<50%)
 * - Fraction display (e.g., "5/8")
 * - Tooltip showing pending items on hover
 * - Handles edge cases (0/0, all done, none done)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, Circle } from "lucide-react";
import { getEmployeeFieldValue } from "@/lib/utils/column-mapping";

interface ChecklistProgressIndicatorProps {
  employee: Employee;
  columns: ColumnConfig[];
  className?: string;
  compact?: boolean; // For mobile card view
}

interface ChecklistItem {
  columnName: string;
  dbColumnName: string;
  isCompleted: boolean;
}

/**
 * Calculate checklist progress for an employee
 */
export function calculateChecklistProgress(
  employee: Employee,
  columns: ColumnConfig[]
): {
  completed: number;
  total: number;
  percentage: number;
  items: ChecklistItem[];
} {
  // Filter to only boolean columns marked as checklist items
  const checklistColumns = columns.filter(
    (col) => col.column_type === 'boolean' && col.is_checklist_item
  );

  const items: ChecklistItem[] = checklistColumns.map((col) => {
    // Get the value from the employee data
    const value = getEmployeeFieldValue(employee, col.db_column_name);
    const isCompleted = value === true;

    return {
      columnName: col.column_name,
      dbColumnName: col.db_column_name,
      isCompleted,
    };
  });

  const completed = items.filter((item) => item.isCompleted).length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage, items };
}

/**
 * Get progress color based on percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage === 100) return "bg-green-500";
  if (percentage >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Get badge color class based on percentage
 */
function getBadgeColorClass(percentage: number): string {
  if (percentage === 100) return "bg-green-100 text-green-800 border-green-300";
  if (percentage >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
}

export function ChecklistProgressIndicator({
  employee,
  columns,
  className,
  compact = false,
}: ChecklistProgressIndicatorProps) {
  const { completed, total, percentage, items } = React.useMemo(
    () => calculateChecklistProgress(employee, columns),
    [employee, columns]
  );

  // If no checklist items are configured, show nothing
  if (total === 0) {
    return (
      <span className={cn("text-gray-400 text-sm", className)}>–</span>
    );
  }

  const pendingItems = items.filter((item) => !item.isCompleted);
  const completedItems = items.filter((item) => item.isCompleted);

  // Compact view for mobile cards
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border cursor-help",
              getBadgeColorClass(percentage),
              className
            )}
          >
            {percentage === 100 ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            <span>{completed}/{total}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <ChecklistTooltipContent
            pendingItems={pendingItems}
            completedItems={completedItems}
            percentage={percentage}
          />
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full view for desktop table
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 min-w-[100px] cursor-help",
            className
          )}
        >
          {/* Progress bar */}
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-300", getProgressColor(percentage))}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {/* Fraction badge */}
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded border whitespace-nowrap",
              getBadgeColorClass(percentage)
            )}
          >
            {completed}/{total}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <ChecklistTooltipContent
          pendingItems={pendingItems}
          completedItems={completedItems}
          percentage={percentage}
        />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Tooltip content showing pending and completed items
 */
function ChecklistTooltipContent({
  pendingItems,
  completedItems,
  percentage,
}: {
  pendingItems: ChecklistItem[];
  completedItems: ChecklistItem[];
  percentage: number;
}) {
  if (percentage === 100) {
    return (
      <div className="space-y-1">
        <p className="font-medium text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" />
          Alla uppgifter slutförda!
        </p>
        <p className="text-xs text-gray-500">
          {completedItems.length} av {completedItems.length} klara
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pendingItems.length > 0 && (
        <div>
          <p className="font-medium text-sm mb-1">Återstående uppgifter:</p>
          <ul className="text-xs space-y-0.5">
            {pendingItems.map((item) => (
              <li key={item.dbColumnName} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {item.columnName}
              </li>
            ))}
          </ul>
        </div>
      )}
      {completedItems.length > 0 && (
        <div>
          <p className="font-medium text-sm mb-1 text-green-600">Slutförda:</p>
          <ul className="text-xs space-y-0.5 text-gray-500">
            {completedItems.map((item) => (
              <li key={item.dbColumnName} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {item.columnName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to get checklist progress for an employee
 * Useful for filtering/sorting by progress
 */
export function useChecklistProgress(
  employee: Employee,
  columns: ColumnConfig[]
) {
  return React.useMemo(
    () => calculateChecklistProgress(employee, columns),
    [employee, columns]
  );
}
