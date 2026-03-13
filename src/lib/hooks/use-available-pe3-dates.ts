"use client";

import { useDateInventory } from "./use-date-inventory";

/**
 * Hook to fetch and subscribe to available PE3 dates with real-time updates.
 * Thin wrapper around the generic useAvailableDates hook.
 */
export function useAvailablePE3Dates(
  currentPE3DateId?: string | null,
  enabled: boolean = true
) {
  return useDateInventory("pe3", currentPE3DateId, enabled);
}
