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
    let isMounted = true;

    async function fetchDates() {
      setIsLoading(true);
      try {
        // Use API route instead of direct database query to bypass network blocks
        const url = category 
          ? `/api/important-dates?category=${encodeURIComponent(category)}`
          : `/api/important-dates`;
        
        const response = await fetch(url, {
          credentials: "include",
        });

        if (!isMounted) return;

        if (!response.ok) {
          console.error("Misslyckades att hämta viktiga datum:", response.status, response.statusText);
          setDates([]);
        } else {
          const result = await response.json();
          setDates(result.data || []);
        }
      } catch (err) {
        console.error("Oväntat fel vid hämtning av viktiga datum:", err);
        if (isMounted) {
          setDates([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [category]);

  return { dates, isLoading };
}
