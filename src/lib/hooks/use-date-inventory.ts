"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ImportantDate } from "@/lib/types/important-date";
import { useAuthStore } from "@/lib/store/auth-store";

export type DateType = "pe3" | "omc";

interface DateTypeConfig {
  apiEndpoint: string;
  channelName: string;
  categoryFilter: string;
  employeeField: string;
  label: string;
}

const DATE_CONFIG: Record<DateType, DateTypeConfig> = {
  pe3: {
    apiEndpoint: "/api/important-dates/available-pe3",
    channelName: "pe3-availability",
    categoryFilter: "PE3 Dates",
    employeeField: "pe3_date",
    label: "PE3",
  },
  omc: {
    apiEndpoint: "/api/important-dates/available-omc",
    channelName: "omc-availability",
    categoryFilter: "ÖMC Dates",
    employeeField: "omc_date",
    label: "ÖMC",
  },
};

/**
 * Generic hook for fetching and subscribing to available important dates
 * with real-time updates. Handles both PE3 and ÖMC date types.
 *
 * This is the "inventory" variant that tracks unassigned dates and listens
 * for employee changes. For the simpler filter-panel variant that just lists
 * dates by category, see use-available-dates.ts.
 *
 * @param dateType    Which date category to manage
 * @param currentDateId  Current date ID to keep in the list during edit mode
 * @param enabled     Whether to fetch data (default true)
 */
export function useDateInventory(
  dateType: DateType,
  currentDateId?: string | null,
  enabled: boolean = true
) {
  const config = DATE_CONFIG[dateType];
  const { isAuthenticated } = useAuthStore();
  const [availableDates, setAvailableDates] = useState<ImportantDate[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled && isAuthenticated);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useLayoutEffect(() => {
    if (enabled) {
      setIsLoading(true);
    }
  }, [enabled]);

  const fetchAvailableDates = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      setError(null);

      const response = await fetch(config.apiEndpoint);

      if (!response.ok) {
        if (response.status === 401) {
          setAvailableDates([]);
          setTotalAvailable(0);
          setIsLoading(false);
          return;
        }
        throw new Error(
          `Failed to fetch available ${config.label} dates: ${response.statusText}`
        );
      }

      const result = await response.json();
      let dates: ImportantDate[] = result.data || [];

      if (currentDateId) {
        const hasCurrentDate = dates.some((d) => d.id === currentDateId);

        if (!hasCurrentDate) {
          try {
            const currentDateResponse = await fetch(
              `/api/important-dates?id=${encodeURIComponent(currentDateId)}`,
              { credentials: "include" }
            );

            if (currentDateResponse.ok) {
              const currentDateResult = await currentDateResponse.json();
              const currentDate = currentDateResult.data?.[0];

              if (currentDate) {
                dates = [...dates, currentDate];
                dates.sort((a, b) =>
                  a.date_value.localeCompare(b.date_value)
                );
              }
            }
          } catch (err) {
            console.error(
              `Failed to fetch current ${config.label} date:`,
              err
            );
          }
        }
      }

      setAvailableDates(dates);
      setTotalAvailable(result.meta?.total || dates.length);
    } catch (err) {
      console.error(
        `Failed to fetch available ${config.label} dates:`,
        err
      );
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setAvailableDates([]);
      setTotalAvailable(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentDateId, enabled, config]);

  // Ref-stable wrappers: prevent subscription teardown/recreation when
  // fetchAvailableDates changes (e.g. currentDateId changed). The subscription
  // stays alive and always calls the latest fetch function via the ref.
  const fetchRef = useRef(fetchAvailableDates);
  useEffect(() => {
    fetchRef.current = fetchAvailableDates;
  });

  const stableFetch = useCallback(() => fetchRef.current(), []);

  const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      stableFetch();
    }, 500);
  }, [stableFetch]);

  // Fetch data when deps change (separate from subscription lifecycle)
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      setIsLoading(false);
      setAvailableDates([]);
      setTotalAvailable(0);
      return;
    }

    stableFetch();
  }, [currentDateId, enabled, isAuthenticated, stableFetch]);

  // Subscription lifecycle: create/teardown channel independently of fetch deps
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    const supabase = createClient();

    const field = config.employeeField;
    const channel = supabase
      .channel(config.channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "important_dates",
          filter: `category=eq.${config.categoryFilter}`,
        },
        () => debouncedRefetch()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "employees" },
        (payload) => {
          const oldVal = (payload.old as Record<string, unknown>)[field];
          const newVal = (payload.new as Record<string, unknown>)[field];
          if (oldVal !== newVal) debouncedRefetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "employees" },
        (payload) => {
          if ((payload.new as Record<string, unknown>)[field]) {
            debouncedRefetch();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "employees" },
        (payload) => {
          if ((payload.old as Record<string, unknown>)[field]) {
            debouncedRefetch();
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedRefetch, enabled, isAuthenticated, config]);

  return { availableDates, totalAvailable, isLoading, error };
}
