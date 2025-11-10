import type { ImportantDate } from "@/lib/types/important-date";
import { formatOMCDate, isOMCDate } from "./omc-date-formatter";

/**
 * Format Important Date for dropdown display
 * 
 * Story 8.9: For ÖMC dates, displays two-day format (e.g., "8-9 mars 2025")
 * 
 * @param date - ImportantDate object
 * @returns Formatted string: "Week [number] - [date_description]" or "[date_description]"
 *          For ÖMC dates: "Week [number] - [two-day range]"
 * 
 * @example
 * formatImportantDateOption({ week_number: 14, date_description: "Fredag 14/2", category: "Stena Dates", ... })
 * // Returns: "Week 14 - Fredag 14/2"
 * 
 * @example
 * formatImportantDateOption({ week_number: 10, date_value: "2025-03-08", category: "ÖMC Dates", ... })
 * // Returns: "Week 10 - 8-9 mars 2025"
 */
export function formatImportantDateOption(date: ImportantDate): string {
  // Story 8.9: Format ÖMC dates with two-day range
  const displayText = isOMCDate(date.category)
    ? formatOMCDate(date.date_value, 'sv-SE')
    : date.date_description;
  
  if (date.week_number !== null && date.week_number !== undefined) {
    return `Week ${date.week_number} - ${displayText}`;
  }
  return displayText;
}
