/**
 * Capacity Badge Component
 * 
 * Displays visual capacity status for Important Dates.
 * Shows different badge colors based on remaining spots:
 * - Red "Fullbokad": remaining_spots === 0
 * - Yellow "Nästan fullbokad": remaining <= 3 (ÖMC/PE3) or <= 10 (Stena)
 * - No badge: remaining > threshold
 * 
 * Story: 8.7 - Important Dates Capacity Management
 * Story: 11.1 - Capacity Management Test Suite (updated to Swedish text and category-specific thresholds)
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface CapacityBadgeProps {
  remainingSpots: number;
  maxSpots: number;
}

export function CapacityBadge({ remainingSpots, maxSpots }: CapacityBadgeProps) {
  // Unlimited capacity (maxSpots === 0) - No badge
  if (maxSpots === 0) {
    return null;
  }

  // Full capacity (0 spots remaining) - Red badge
  if (remainingSpots === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
          "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
        )}
        aria-label="Fullbokad"
        title={`${remainingSpots} platser kvar`}
      >
        Fullbokad
      </span>
    );
  }

  // Determine threshold based on category (inferred from maxSpots)
  // ÖMC = 20, PE3 = 1 → threshold = 3
  // Stena = 99 → threshold = 10
  const isStena = maxSpots > 20; // Stena dates have max_spots = 99
  const almostFullThreshold = isStena ? 10 : 3;

  // Almost full - Yellow badge
  if (remainingSpots <= almostFullThreshold) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
          "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
        )}
        aria-label="Nästan fullbokad"
        title={`${remainingSpots} platser kvar`}
      >
        Nästan fullbokad
      </span>
    );
  }

  // Good availability - No badge
  return null;
  
  // Uncomment below to show a green "Available" badge for good capacity
  // return (
  //   <span
  //     className={cn(
  //       "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
  //       "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
  //     )}
  //     aria-label="Available"
  //   >
  //     Available
  //   </span>
  // );
}
