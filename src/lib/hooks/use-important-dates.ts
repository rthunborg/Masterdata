"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ImportantDate } from "@/lib/types/important-date";

/**
 * Hook to fetch and subscribe to important dates with optional category filter
 * Provides real-time updates when Important Dates table changes
 * 
 * @param category - Optional category filter (e.g., "Stena Dates", "ÖMC Dates", "PE3 Dates")
 * @returns { dates, isLoading } - Array of important dates and loading state
 */
export function useImportantDates(category?: string) {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchDates() {
      setIsLoading(true);
      try {
        let query = supabase
          .from("important_dates")
          .select("*")
          .order("year", { ascending: true })
          .order("week_number", { ascending: true, nullsFirst: false });

        if (category) {
          query = query.eq("category", category);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching important dates:", error);
          setDates([]);
        } else {
          setDates(data || []);
        }
      } catch (err) {
        console.error("Unexpected error fetching important dates:", err);
        setDates([]);
      } finally {
        setIsLoading(false);
      }
    }

    // Initial fetch
    fetchDates();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("important-dates-changes")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "important_dates",
          filter: category ? `category=eq.${category}` : undefined
        },
        () => {
          // Re-fetch data when table changes
          fetchDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category]);

  return { dates, isLoading };
}
