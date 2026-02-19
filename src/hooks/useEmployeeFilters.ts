/**
 * Employee Filters Hook for Epic 20 - Advanced Employee Filtering
 * 
 * Manages filter state, applies filters to employee list, and synchronizes with URL.
 * Provides real-time filtering with debouncing and memoization for performance.
 */

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Employee } from "@/lib/types/employee";
import type { FilterState } from "@/lib/types/filter";
import type { ImportantDate } from "@/lib/types/important-date";
import type { ColumnConfig } from "@/lib/types/column-config";
import { applyFilters, hasActiveFilters } from "@/lib/filters/filterEngine";
import { serializeFilters, deserializeFilters } from "@/lib/filters/filterSerializer";
import { debounce } from "@/lib/utils/animation-helpers";

interface UseEmployeeFiltersOptions {
  employees: Employee[];
  columnConfigs: ColumnConfig[];
  enableUrlSync?: boolean; // Default: true
}

/**
 * Custom hook for managing employee filtering state
 * 
 * @param options - Configuration options
 * @returns Filter state and control functions
 */
export function useEmployeeFilters({
  employees,
  columnConfigs,
  enableUrlSync = true,
}: UseEmployeeFiltersOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Fetch all important dates for date filtering
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingDates(true);

    async function fetchImportantDates() {
      try {
        const response = await fetch("/api/important-dates", {
          credentials: "include",
        });

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error("Failed to fetch important dates");
        }

        const result = await response.json();
        setImportantDates(result.data || []);
      } catch (error) {
        console.error("Error fetching important dates:", error);
        if (isMounted) setImportantDates([]);
      } finally {
        if (isMounted) {
          setIsLoadingDates(false);
        }
      }
    }

    fetchImportantDates();

    return () => {
      isMounted = false;
    };
  }, []);

  // Read initial filters from URL
  const [activeFilters, setActiveFilters] = useState<FilterState[]>(() => {
    if (!enableUrlSync) return [];
    
    const encoded = searchParams?.get("filters");
    return encoded ? deserializeFilters(encoded) : [];
  });

  // Story 20.5: Loading state for filter application
  const [isFiltering, setIsFiltering] = useState(false);

  // Debounced URL update function
  const debouncedUpdateURL = useMemo(
    () =>
      debounce((filters: FilterState[]) => {
        if (!enableUrlSync || !router || !searchParams) return;

        const encoded = serializeFilters(filters);
        const params = new URLSearchParams(searchParams.toString());

        if (encoded) {
          params.set("filters", encoded);
        } else {
          params.delete("filters");
        }

        const query = params.toString();
        const newUrl = query ? `${pathname}?${query}` : pathname;
        router.push(newUrl, { scroll: false });
      }, 500),
    [enableUrlSync, router, searchParams, pathname]
  );

  // Calculate filtered employees (memoized for performance)
  const filteredEmployees = useMemo(() => {
    return applyFilters(employees, activeFilters, importantDates, columnConfigs);
  }, [employees, activeFilters, importantDates, columnConfigs]);

  // Story 20.5: Show loading state briefly when filters change
  // Only show if filtering takes >50ms (user won't notice faster operations)
  useEffect(() => {
    // Set loading state after 50ms delay (only if still filtering)
    const showLoadingId = setTimeout(() => {
      setIsFiltering(true);
    }, 50);

    // Clear loading immediately - filtering is synchronous (useMemo). Cancel the
    // 50ms timer so we never show loading for fast operations.
    const clearLoadingId = setTimeout(() => {
      clearTimeout(showLoadingId);
      setIsFiltering(false);
    }, 0);

    return () => {
      clearTimeout(showLoadingId);
      clearTimeout(clearLoadingId);
    };
  }, [activeFilters]);

  // Update filter state and sync to URL
  const setFilters = useCallback(
    (filters: FilterState[]) => {
      setActiveFilters(filters);
      if (enableUrlSync) {
        debouncedUpdateURL(filters);
      }
    },
    [enableUrlSync, debouncedUpdateURL]
  );

  // Apply or update a single filter
  const applyFilter = useCallback(
    (filter: FilterState) => {
      setFilters(
        activeFilters.some((f) => f.columnId === filter.columnId)
          ? activeFilters.map((f) =>
              f.columnId === filter.columnId ? filter : f
            )
          : [...activeFilters, filter]
      );
    },
    [activeFilters, setFilters]
  );

  // Remove a filter by column ID
  const removeFilter = useCallback(
    (columnId: string) => {
      setFilters(activeFilters.filter((f) => f.columnId !== columnId));
    },
    [activeFilters, setFilters]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters([]);
  }, [setFilters]);

  // Check if filters are active
  const isFilterActive = useMemo(
    () => hasActiveFilters(activeFilters),
    [activeFilters]
  );

  return {
    // State
    activeFilters,
    filteredEmployees,
    importantDates,
    isLoadingDates,
    isFiltering, // Story 20.5: Loading state for slow filters

    // Computed
    filterCount: activeFilters.length,
    isFilterActive,
    filteredCount: filteredEmployees.length,
    totalCount: employees.length,

    // Actions
    applyFilter,
    removeFilter,
    clearAllFilters,
    setFilters,
  };
}
