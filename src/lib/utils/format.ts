import type { ImportantDate } from "@/lib/types/important-date";
import { formatOMCDate, isOMCDate } from "./omc-date-formatter";
import { formatTimeDisplay } from "./time-formatter";

/**
 * Format Important Date for dropdown display
 * 
 * Story 8.9: For ÖMC dates, displays two-day format (e.g., "8-9 mars 2025")
 * Story 8.10: For PE3 dates, displays date with time (e.g., "15/3 14:30")
 * 
 * @param date - ImportantDate object
 * @returns Formatted string: "Week [number] - [date_description]" or "[date_description]"
 *          For ÖMC dates: "Week [number] - [two-day range]"
 *          For PE3 dates with time: "[date] [time]"
 * 
 * @example
 * formatImportantDateOption({ week_number: 14, date_description: "Fredag 14/2", category: "Stena Dates", ... })
 * // Returns: "Week 14 - Fredag 14/2"
 * 
 * @example
 * formatImportantDateOption({ week_number: 10, date_value: "2025-03-08", category: "ÖMC Dates", ... })
 * // Returns: "Week 10 - 8-9 mars 2025"
 * 
 * @example
 * formatImportantDateOption({ week_number: 10, date_value: "2025-03-15", time_value: "14:30", category: "PE3 Dates", ... })
 * // Returns: "Week 10 - 15/3 14:30"
 */
export function formatImportantDateOption(date: ImportantDate): string {
  let displayText = date.date_description;
  
  // Story 8.9: Format ÖMC dates with two-day range
  if (isOMCDate(date.category)) {
    displayText = formatOMCDate(date.date_value, 'sv-SE');
  }
  // Story 8.10: Format PE3 dates with time if available
  else if (date.category === 'PE3 Dates' && date.time_value) {
    // Extract day/month from date_description or date_value
    // Format: "15/3 14:30"
    try {
      const dateObj = new Date(date.date_value + 'T00:00:00');
      const day = dateObj.getDate();
      const month = dateObj.getMonth() + 1;
      const formattedTime = formatTimeDisplay(date.time_value);
      displayText = `${day}/${month} ${formattedTime}`;
    } catch {
      // Fall back to description + time if date parsing fails
      const formattedTime = formatTimeDisplay(date.time_value);
      displayText = `${date.date_description} ${formattedTime}`;
    }
  }
  
  if (date.week_number !== null && date.week_number !== undefined) {
    return `v. ${date.week_number} - ${displayText}`;
  }
  return displayText;
}
