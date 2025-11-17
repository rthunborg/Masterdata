/**
 * Utility functions for date capacity logic
 * Extracted for testability
 */

import type { ImportantDate } from '@/lib/types/important-date';

/**
 * Check if a date is full (no remaining spots)
 */
export function isDateFull(date: ImportantDate): boolean {
  const remainingSpots = date.remaining_spots ?? 0;
  return remainingSpots === 0;
}

/**
 * Check if a date is almost full (less than threshold remaining spots)
 * @param date - The important date to check
 * @param threshold - The threshold for "almost full" (default: 5)
 */
export function isDateAlmostFull(date: ImportantDate, threshold: number = 5): boolean {
  const remainingSpots = date.remaining_spots ?? 0;
  return remainingSpots > 0 && remainingSpots < threshold;
}

/**
 * Get category-specific threshold for "almost full" dates
 */
export function getAlmostFullThreshold(category: string): number {
  if (category === 'ÖMC Dates') return 3;
  if (category === 'Stena Dates') return 10;
  return 5; // Default for PE3 Dates and others
}

/**
 * Check if a date should be disabled in the date picker
 */
export function shouldDisableDate(date: ImportantDate): boolean {
  return isDateFull(date);
}

/**
 * Get the text color class for a date based on capacity
 */
export function getCapacityTextColorClass(date: ImportantDate, category: string): string {
  if (isDateFull(date)) return 'text-red-600';
  const threshold = getAlmostFullThreshold(category);
  if (isDateAlmostFull(date, threshold)) return 'text-yellow-600';
  return 'text-muted-foreground';
}

