"use client";

import { useDateInventory } from "./use-date-inventory";

/**
 * Hook to fetch and subscribe to available ÖMC dates with real-time updates.
 * Thin wrapper around the generic useAvailableDates hook.
 */
export function useAvailableOMCDates(
  currentOMCDateId?: string | null,
  enabled: boolean = true
) {
  return useDateInventory("omc", currentOMCDateId, enabled);
}
