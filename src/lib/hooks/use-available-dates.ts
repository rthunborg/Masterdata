"use client";

import { useState, useEffect } from "react";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { ImportantDate } from "@/lib/types/important-date";

/**
 * Hook to fetch available dates for a date column filter
 * Determines the category from the column field name and fetches matching dates
 * 
 * @param column - Column configuration to determine which dates to fetch
 * @param enabled - Whether to fetch dates (default: true)
 * @returns { dates, isLoading, error } - Available dates, loading state, and error
 */
export function useAvailableDates(column: ColumnConfig, enabled = true) {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Determine category from field name
  const category = column.db_column_name === "omc_date"
    ? "ÖMC Dates"
    : column.db_column_name === "stena_date"
    ? "Stena Dates"
    : column.db_column_name === "pe3_date"
    ? "PE3 Dates"
    : null;

  useEffect(() => {
    // Only fetch if enabled and we have a valid category
    if (!enabled || !category) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function fetchDates() {
      try {
        const url = `/api/important-dates?category=${encodeURIComponent(category)}`;
        const response = await fetch(url, {
          credentials: "include",
        });

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(`Failed to fetch dates: ${response.statusText}`);
        }

        const result = await response.json();
        setDates(result.data || []);
      } catch (err) {
        console.error("Error fetching available dates:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setDates([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDates();

    return () => {
      isMounted = false;
    };
  }, [category, enabled]);

  return { dates, isLoading, error };
}
