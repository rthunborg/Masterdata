/**
 * Hook for tracking the current view state for notification purposes
 * Monitors visible employee IDs, active filters, and sort state
 */

import { useState, useEffect, useMemo } from "react";
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
  const [viewState, setViewState] = useState<ViewState>({
    visibleEmployeeIds: new Set<string>(),
    activeFilters: filters,
    activeSortColumn: sort?.column || null,
    activeSortDirection: sort?.direction || null,
  });

  // Update viewState whenever employees, filters, or sort changes
  useEffect(() => {
    setViewState({
      visibleEmployeeIds: new Set(employees.map((e) => e.id)),
      activeFilters: filters,
      activeSortColumn: sort?.column || null,
      activeSortDirection: sort?.direction || null,
    });
  }, [employees, filters, sort]);

  return viewState;
}
