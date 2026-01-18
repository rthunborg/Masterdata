/**
 * Important Date Resolver Utilities
 * 
 * Resolves Important Date UUIDs to human-readable descriptions for display in the employee table.
 * Provides caching and lookup functions to avoid repeated database queries.
 * 
 * Story 19.3: Updated to use formatDateForDisplay() for consistent Swedish date formatting.
 */

import type { ImportantDate } from "@/lib/types/important-date";
import { formatDateForDisplay } from "./format";

/**
 * Resolve an Important Date ID to its display description
 * 
 * Story 19.3: Now uses formatDateForDisplay() for consistent Swedish date formatting.
 * Returns dates in Swedish format based on category:
 * - ÖMC Dates: Two-day range "8-9 mars 2025"
 * - PE3 Dates with time: "7 mars 2025 14:30"
 * - Standard dates: "8 mars 2025"
 * 
 * @param dateId - The UUID of the important date, or null
 * @param allDates - Array of all important dates
 * @param dateDeletedText - Optional translated text for deleted dates (default: "Datum borttaget")
 * @returns The formatted date string, dateDeletedText if ID exists but date is missing, or empty string if dateId is null
 */
export function resolveImportantDateId(
  dateId: string | null,
  allDates: ImportantDate[],
  dateDeletedText: string = "Datum borttaget"
): string {
  if (!dateId) return "";
  
  // If no dates are loaded yet, return empty to avoid showing dateDeletedText prematurely
  if (allDates.length === 0) return "";
  
  const date = allDates.find((d) => d.id === dateId);
  
  if (!date) return dateDeletedText;
  
  // Story 19.3: Use formatDateForDisplay for consistent Swedish formatting
  // Format based on date_value (ISO date) and category, not the free-text date_description
  return formatDateForDisplay(date.date_value, date.category, date.time_value);
}

/**
 * Resolve an Important Date ID to a formatted tooltip string with full details
 * 
 * @param dateId - The UUID of the important date, or null
 * @param allDates - Array of all important dates
 * @param dateDeletedText - Optional translated text for deleted dates (default: "Datum borttaget")
 * @returns Formatted tooltip string with week number, year, category, and date value, or null if dateId is null
 */
export function resolveImportantDateTooltip(
  dateId: string | null,
  allDates: ImportantDate[],
  dateDeletedText: string = "Datum borttaget"
): string | null {
  if (!dateId) return null;
  
  const date = allDates.find((d) => d.id === dateId);
  
  if (!date) return dateDeletedText;
  
  const parts: string[] = [];
  
  if (date.week_number !== null) {
    parts.push(`v. ${date.week_number}`);
  }
  
  parts.push(`${date.year}`);
  parts.push(date.category);
  
  if (date.date_value) {
    parts.push(date.date_value);
  }
  
  return parts.join("\n");
}

/**
 * Get an Important Date object by its ID
 * 
 * @param dateId - The UUID of the important date
 * @param allDates - Array of all important dates
 * @returns The ImportantDate object, or null if not found
 */
export function getImportantDateById(
  dateId: string,
  allDates: ImportantDate[]
): ImportantDate | null {
  return allDates.find((d) => d.id === dateId) || null;
}

/**
 * Create a memoized cache map for faster lookups
 * This can be used to avoid repeated array searches
 * 
 * @param allDates - Array of all important dates
 * @returns Map of date ID to date description
 */
export function createDateResolutionCache(
  allDates: ImportantDate[]
): Map<string, string> {
  const cache = new Map<string, string>();
  allDates.forEach((date) => {
    cache.set(date.id, date.date_description);
  });
  return cache;
}

/**
 * Resolve an Important Date ID using a cache map
 * 
 * @param dateId - The UUID of the important date, or null
 * @param cache - Map of date ID to date description
 * @param dateDeletedText - Optional translated text for deleted dates (default: "Datum borttaget")
 * @returns The date description string, dateDeletedText if ID exists but date is missing, or empty string if dateId is null
 */
export function resolveImportantDateIdFromCache(
  dateId: string | null,
  cache: Map<string, string>,
  dateDeletedText: string = "Datum borttaget"
): string {
  if (!dateId) return "";
  
  return cache.get(dateId) || dateDeletedText;
}
