import type { ImportantDate } from "@/lib/types/important-date";

/**
 * Format Important Date for dropdown display
 * 
 * @param date - ImportantDate object
 * @returns Formatted string: "Week [number] - [date_description]" or just "[date_description]"
 * 
 * @example
 * formatImportantDateOption({ week_number: 14, date_description: "Fredag 14/2", ... })
 * // Returns: "Week 14 - Fredag 14/2"
 * 
 * @example
 * formatImportantDateOption({ week_number: null, date_description: "Holiday", ... })
 * // Returns: "Holiday"
 */
export function formatImportantDateOption(date: ImportantDate): string {
  if (date.week_number !== null && date.week_number !== undefined) {
    return `Week ${date.week_number} - ${date.date_description}`;
  }
  return date.date_description;
}
