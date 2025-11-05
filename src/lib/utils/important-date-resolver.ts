/**
 * Important Date Resolver Utilities
 * 
 * Resolves Important Date UUIDs to human-readable descriptions for display in the employee table.
 * Provides caching and lookup functions to avoid repeated database queries.
 */

import type { ImportantDate } from "@/lib/types/important-date";

/**
 * Resolve an Important Date ID to its display description
 * 
 * @param dateId - The UUID of the important date, or null
 * @param allDates - Array of all important dates
 * @returns The date description string, "(Date not found)" if ID exists but date is missing, or empty string if dateId is null
 */
export function resolveImportantDateId(
  dateId: string | null,
  allDates: ImportantDate[]
): string {
  if (!dateId) return "";
  
  const date = allDates.find((d) => d.id === dateId);
  
  if (!date) return "(Date not found)";
  
  return date.date_description;
}

/**
 * Resolve an Important Date ID to a formatted tooltip string with full details
 * 
 * @param dateId - The UUID of the important date, or null
 * @param allDates - Array of all important dates
 * @returns Formatted tooltip string with week number, year, category, and date value, or null if dateId is null
 */
export function resolveImportantDateTooltip(
  dateId: string | null,
  allDates: ImportantDate[]
): string | null {
  if (!dateId) return null;
  
  const date = allDates.find((d) => d.id === dateId);
  
  if (!date) return "(Date not found)";
  
  const parts: string[] = [];
  
  if (date.week_number !== null) {
    parts.push(`Week ${date.week_number}`);
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
 * @returns The date description string, "(Date not found)" if ID exists but date is missing, or empty string if dateId is null
 */
export function resolveImportantDateIdFromCache(
  dateId: string | null,
  cache: Map<string, string>
): string {
  if (!dateId) return "";
  
  return cache.get(dateId) || "(Date not found)";
}
