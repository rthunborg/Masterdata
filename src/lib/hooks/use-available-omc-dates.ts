"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ImportantDate } from "@/lib/types/important-date";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * Hook to fetch and subscribe to available ÖMC dates with real-time updates
 * Provides inventory management for ÖMC dates - shows only unassigned dates
 * 
 * Story 19.8: Mirrors PE3 date hook pattern with Jan 1 exception support
 * 
 * @param currentOMCDateId - Optional current ÖMC date ID (for edit mode) to keep in list
 * @param enabled - Whether to fetch data (default: true). Set to false to skip fetching.
 * @returns { availableDates, totalAvailable, isLoading, error }
 */
export function useAvailableOMCDates(currentOMCDateId?: string | null, enabled: boolean = true) {
  const { isAuthenticated } = useAuthStore();
  const [availableDates, setAvailableDates] = useState<ImportantDate[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled && isAuthenticated);
  const [error, setError] = useState<Error | null>(null);

  // Ref for debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronously set loading state when enabled changes to avoid race conditions
  // useLayoutEffect runs before browser paint, ensuring loading spinner shows immediately
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

    // Set loading to true at the start of fetch
    setIsLoading(true);

    try {
      setError(null);
      
      // Fetch available ÖMC dates from API
      const response = await fetch("/api/important-dates/available-omc");
      
      if (!response.ok) {
        // Don't throw on 401 - just return empty (user logged out)
        if (response.status === 401) {
          setAvailableDates([]);
          setTotalAvailable(0);
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch available ÖMC dates: ${response.statusText}`);
      }

      const result = await response.json();
      let dates = result.data || [];

      // If currentOMCDateId provided, ensure it's in the list
      // This allows edit mode to show the current selection even if "assigned"
      if (currentOMCDateId) {
        const hasCurrentDate = dates.some((d: ImportantDate) => d.id === currentOMCDateId);
        
        if (!hasCurrentDate) {
          // Fetch the current date via API to bypass network blocks
          try {
            const currentDateResponse = await fetch(
              `/api/important-dates?id=${encodeURIComponent(currentOMCDateId)}`,
              { credentials: "include" }
            );
            
            if (currentDateResponse.ok) {
              const currentDateResult = await currentDateResponse.json();
              const currentDate = currentDateResult.data?.[0];
              
              if (currentDate) {
                // Merge current date with available dates
                dates = [...dates, currentDate];
                // Sort by date_value
                dates.sort((a: ImportantDate, b: ImportantDate) => 
                  a.date_value.localeCompare(b.date_value)
                );
              }
            }
          } catch (error) {
            console.error("Error fetching current ÖMC date:", error);
          }
        }
      }

      setAvailableDates(dates);
      setTotalAvailable(result.meta?.total || dates.length);
    } catch (err) {
      console.error("Error fetching available ÖMC dates:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setAvailableDates([]);
      setTotalAvailable(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentOMCDateId, enabled]);

  // Debounced refetch function
  const debouncedRefetch = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer (500ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      fetchAvailableDates();
    }, 500);
  }, [fetchAvailableDates]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      setIsLoading(false);
      setAvailableDates([]);
      setTotalAvailable(0);
      return;
    }

    const supabase = createClient();

    // Initial fetch
    fetchAvailableDates();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("omc-availability")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "important_dates",
          filter: "category=eq.ÖMC Dates",
        },
        () => {
          // Important date added/updated/deleted
          debouncedRefetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "employees",
        },
        (payload) => {
          // Check if omc_date field was updated
          const oldRecord = payload.old as { omc_date?: string | null };
          const newRecord = payload.new as { omc_date?: string | null };
          
          if (oldRecord.omc_date !== newRecord.omc_date) {
            // ÖMC date assignment changed
            debouncedRefetch();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "employees",
        },
        (payload) => {
          // New employee created with ÖMC date
          const newRecord = payload.new as { omc_date?: string | null };
          
          if (newRecord.omc_date) {
            debouncedRefetch();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "employees",
        },
        (payload) => {
          // Employee deleted with ÖMC date
          const oldRecord = payload.old as { omc_date?: string | null };
          
          if (oldRecord.omc_date) {
            debouncedRefetch();
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchAvailableDates, debouncedRefetch, enabled, isAuthenticated]);

  return { availableDates, totalAvailable, isLoading, error };
}
