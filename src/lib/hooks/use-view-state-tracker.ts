/**
 * Hook for tracking the current view state for notification purposes
 * Monitors visible employee IDs, active filters, and sort state
 */

import { useMemo } from "react";
import type { Employee } from "@/lib/types/employee";
import type { ViewState, FilterState } from "@/lib/types/notifications";

interface SortState {
  column: string | null;
  direction: "asc" | "desc" | null;
}

interface UseViewStateTrackerOptions {
  employees: Employee[];
  filters: FilterState;
  sort?: SortState;
}

/**
 * Hook for tracking view state to determine notification triggers
 * @param options - Employees, filters, and sort configuration
 * @returns Current view state
 */
export function useViewStateTracker({
  employees,
  filters,
  sort,
}: UseViewStateTrackerOptions): ViewState {
  // Memoize employee IDs to prevent infinite re-renders
  const visibleEmployeeIds = useMemo(
    () => new Set(employees.map((e) => e.id)),
    [employees]
  );

  // Construct view state using memoized values
  const viewState = useMemo<ViewState>(
    () => ({
      visibleEmployeeIds,
      activeFilters: filters,
      activeSortColumn: sort?.column || null,
      activeSortDirection: sort?.direction || null,
    }),
    [visibleEmployeeIds, filters, sort]
  );

  return viewState;
}
