import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import type { ImportantDate } from "@/lib/types/important-date";

// Force Node.js runtime for cookies() support
export const runtime = "nodejs";

/**
 * Helper to get Jan 1 of current year in YYYY-MM-DD format.
 * Used for the ÖMC date exception rule: Jan 1 current-year is always
 * available even if in the past.
 */
function getJan1CurrentYear(): string {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-01-01`;
}

export async function GET() {
  try {
    // Verify authentication (all authenticated users can view)
    await requireAuthAPI();

    const supabase = await createClient();

    const today = new Date().toISOString().split("T")[0];
    const jan1CurrentYear = getJan1CurrentYear();
    const currentYear = new Date().getFullYear();

    // Query to get available ÖMC dates
    // Include: dates from current year (to include Jan 1 exception and all future dates)
    // We filter by year instead of complex OR clause to ensure we get all relevant dates
    const { data, error } = await supabase
      .from("important_dates")
      .select("*")
      .eq("category", "ÖMC Dates")
      .eq("is_active", true) // Only active (non-archived) dates
      .eq("year", currentYear) // Get all dates from current year
      .order("date_value", { ascending: true });

    if (error) {
      console.error("Error fetching available ÖMC dates:", error);
      throw new Error("Failed to fetch available ÖMC dates");
    }

    // Filter to dates with available capacity that are either future or Jan 1 exception
    // Note: Unlike PE3 dates (unique per employee), ÖMC dates have capacity (multiple employees per date)
    // So we only check remaining_spots, not whether any employee is assigned
    // Exception: Jan 1 current year is always included (even if full/past) - frontend handles disable state
    const filteredDates = (data || []).filter((date) => {
      // Check for Jan 1 exception - be flexible with date format (could be stored with time component)
      const isJan1Exception = date.date_value?.startsWith(jan1CurrentYear) || date.date_value === jan1CurrentYear;
      
      // Check if date is in the future (or today)
      const isFutureOrToday = date.date_value >= today;
      
      // Handle null/undefined remaining_spots - treat as having capacity (to avoid accidentally filtering)
      // If remaining_spots is null/undefined, it likely means capacity tracking isn't set up for this date
      const remainingSpots = date.remaining_spots ?? date.max_spots ?? 99;
      const hasCapacity = remainingSpots > 0;
      
      // Include if:
      // 1. Jan 1 exception (always included, regardless of capacity or date)
      // 2. Future/today date with available capacity
      return isJan1Exception || (isFutureOrToday && hasCapacity);
    }) as ImportantDate[];

    // Sort with Jan 1 current year pinned to top, then by date ascending
    // This ensures the Jan 1 exception date appears first when present
    const availableDates = filteredDates.sort((a, b) => {
      const aIsJan1 = a.date_value === jan1CurrentYear;
      const bIsJan1 = b.date_value === jan1CurrentYear;

      // Pin Jan 1 current year to top
      if (aIsJan1 && !bIsJan1) return -1;
      if (!aIsJan1 && bIsJan1) return 1;

      // Otherwise sort by date ascending
      return a.date_value.localeCompare(b.date_value);
    });

    return NextResponse.json({
      data: availableDates,
      meta: {
        total: availableDates.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
