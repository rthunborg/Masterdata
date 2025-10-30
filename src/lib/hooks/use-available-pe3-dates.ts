"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ImportantDate } from "@/lib/types/important-date";

/**
 * Hook to fetch and subscribe to available PE3 dates with real-time updates
 * Provides inventory management for PE3 dates - shows only unassigned dates
 * 
 * @param currentPE3DateId - Optional current PE3 date ID (for edit mode) to keep in list
 * @returns { availableDates, totalAvailable, isLoading, error }
 */
export function useAvailablePE3Dates(currentPE3DateId?: string | null) {
  const [availableDates, setAvailableDates] = useState<ImportantDate[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Ref for debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAvailableDates = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch available PE3 dates from API
      const response = await fetch("/api/important-dates/available-pe3");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch available PE3 dates: ${response.statusText}`);
      }

      const result = await response.json();
      let dates = result.data || [];

      // If currentPE3DateId provided, ensure it's in the list
      // This allows edit mode to show the current selection even if "assigned"
      if (currentPE3DateId) {
        const hasCurrentDate = dates.some((d: ImportantDate) => d.id === currentPE3DateId);
        
        if (!hasCurrentDate) {
          // Fetch the current date from important_dates table
          const supabase = createClient();
          const { data: currentDate, error: currentDateError } = await supabase
            .from("important_dates")
            .select("*")
            .eq("id", currentPE3DateId)
            .single();

          if (!currentDateError && currentDate) {
            // Merge current date with available dates
            dates = [...dates, currentDate];
            // Sort by date_value
            dates.sort((a: ImportantDate, b: ImportantDate) => 
              a.date_value.localeCompare(b.date_value)
            );
          }
        }
      }

      setAvailableDates(dates);
      setTotalAvailable(result.meta?.total || dates.length);
    } catch (err) {
      console.error("Error fetching available PE3 dates:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setAvailableDates([]);
      setTotalAvailable(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPE3DateId]);

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
    const supabase = createClient();

    // Initial fetch
    fetchAvailableDates();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("pe3-availability")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "important_dates",
          filter: "category=eq.PE3 Dates",
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
          // Check if pe3_date field was updated
          const oldRecord = payload.old as { pe3_date?: string | null };
          const newRecord = payload.new as { pe3_date?: string | null };
          
          if (oldRecord.pe3_date !== newRecord.pe3_date) {
            // PE3 date assignment changed
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
          // New employee created with PE3 date
          const newRecord = payload.new as { pe3_date?: string | null };
          
          if (newRecord.pe3_date) {
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
          // Employee deleted with PE3 date
          const oldRecord = payload.old as { pe3_date?: string | null };
          
          if (oldRecord.pe3_date) {
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
  }, [fetchAvailableDates, debouncedRefetch]);

  return { availableDates, totalAvailable, isLoading, error };
}
