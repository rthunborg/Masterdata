import type { ImportantDate } from "@/lib/types/important-date";
import { formatDistance, type Locale } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';

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

/**
 * Format timestamp as relative time (e.g., "2 hours ago", "3 days ago")
 * 
 * @param timestamp - ISO timestamp string or null
 * @param locale - Current locale ('en' or 'sv')
 * @param neverText - Text to display when timestamp is null (default: "Never")
 * @returns Formatted relative time string
 * 
 * @example
 * formatRelativeTime('2025-10-31T10:00:00Z', 'en')
 * // Returns: "2 hours ago"
 * 
 * @example
 * formatRelativeTime('2025-10-31T10:00:00Z', 'sv')
 * // Returns: "2 timmar sedan"
 * 
 * @example
 * formatRelativeTime(null, 'en')
 * // Returns: "Never"
 */
export function formatRelativeTime(
  timestamp: string | null,
  locale: string = 'en',
  neverText: string = 'Never'
): string {
  if (!timestamp) {
    return neverText;
  }

  const localeMap: Record<string, Locale> = {
    en: enUS,
    sv: sv,
  };

  try {
    return formatDistance(new Date(timestamp), new Date(), {
      addSuffix: true,
      locale: localeMap[locale] || enUS,
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return neverText;
  }
}
