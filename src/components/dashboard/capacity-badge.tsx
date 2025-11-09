/**
 * Capacity Badge Component
 * 
 * Displays visual capacity status for Important Dates.
 * Shows different badge colors based on remaining spots:
 * - Red "Full": remaining_spots === 0
 * - Yellow "Almost Full": remaining_spots < 5
 * - No badge: remaining_spots >= 5
 * 
 * Story: 8.7 - Important Dates Capacity Management
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface CapacityBadgeProps {
  remainingSpots: number;
  maxSpots: number;
}

export function CapacityBadge({ remainingSpots }: CapacityBadgeProps) {
  // Full capacity (0 spots remaining) - Red badge
  if (remainingSpots === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
          "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
        )}
        aria-label="Fully booked"
      >
        Full
      </span>
    );
  }

  // Almost full (less than 5 spots remaining) - Yellow badge
  if (remainingSpots < 5) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
          "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
        )}
        aria-label="Almost full"
      >
        Almost Full
      </span>
    );
  }

  // Good availability (5+ spots) - No badge (or optionally show green badge)
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
