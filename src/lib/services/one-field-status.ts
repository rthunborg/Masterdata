/**
 * One Field Status Service
 * 
 * Business Rule: The "One" field represents a completion checkpoint that triggers
 * data synchronization to the Talmundo external system. Talmundo's integration
 * requirements mandate a 24-hour processing window after the One field is marked
 * as complete before dependent fields can be edited.
 * 
 * This service provides time-based status calculation for the One field to enforce
 * the mandatory 24-hour waiting period.
 * 
 * Status Indicators:
 * - Yellow (⚠ Pending): One is true but less than 24 hours have elapsed
 * - Green (✓ Complete): One is true and 24+ hours have elapsed
 * - Null: One is false or not set
 */

/**
 * Calculate the current status of the One field based on elapsed time since marking.
 * 
 * This enforces a mandatory 24-hour waiting period for external system synchronization.
 * The function uses UTC timestamps to avoid timezone and DST issues.
 * 
 * @param oneValue - Current boolean value of the One field
 * @param markedAt - Timestamp when One was set to true (UTC)
 * @returns 'green' if >= 24 hours elapsed, 'yellow' if < 24 hours, null if One is false
 * 
 * @example
 * // Just marked as true
 * getOneFieldStatus(true, null) // Returns 'yellow'
 * 
 * @example
 * // Marked 12 hours ago
 * const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
 * getOneFieldStatus(true, twelveHoursAgo) // Returns 'yellow'
 * 
 * @example
 * // Marked 25 hours ago
 * const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
 * getOneFieldStatus(true, twentyFiveHoursAgo) // Returns 'green'
 * 
 * @example
 * // One is false
 * getOneFieldStatus(false, new Date()) // Returns null
 */
export function getOneFieldStatus(
  oneValue: boolean,
  markedAt: Date | null
): 'green' | 'yellow' | null {
  // If One is not set or false, no status indicator should be shown
  if (!oneValue) {
    return null;
  }

  // If One is true but timestamp hasn't been saved yet (transient state)
  if (!markedAt) {
    return 'yellow';
  }

  // Calculate elapsed time in milliseconds
  const now = new Date();
  const elapsed = now.getTime() - markedAt.getTime();
  
  // 24 hours in milliseconds
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Return green if 24+ hours have elapsed, otherwise yellow
  return elapsed >= twentyFourHours ? 'green' : 'yellow';
}

/**
 * Calculate remaining time until One field status turns green.
 * 
 * This function formats the remaining time in a human-readable format
 * to display in tooltips, showing how long until the 24-hour waiting period completes.
 * 
 * @param markedAt - Timestamp when One was set to true
 * @returns Formatted string "X hours Y minutes" or "Ready" if time elapsed
 * 
 * @example
 * // 5 hours and 30 minutes remaining
 * const fiveThirtyAgo = new Date(Date.now() - 18.5 * 60 * 60 * 1000);
 * getRemainingTime(fiveThirtyAgo) // Returns "5 hours 30 minutes"
 * 
 * @example
 * // Less than 1 hour remaining
 * const twentyThreeThirtyAgo = new Date(Date.now() - 23.5 * 60 * 60 * 1000);
 * getRemainingTime(twentyThreeThirtyAgo) // Returns "30 minutes"
 * 
 * @example
 * // Time has elapsed
 * const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
 * getRemainingTime(twentyFiveHoursAgo) // Returns "Ready"
 */
export function getRemainingTime(markedAt: Date): string {
  const now = new Date();
  const elapsed = now.getTime() - markedAt.getTime();
  
  // 24 hours in milliseconds
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const remaining = twentyFourHours - elapsed;

  // If time has elapsed, return "Ready"
  if (remaining <= 0) {
    return 'Ready';
  }

  // Calculate hours and minutes remaining
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  // If less than 1 hour remaining, show only minutes
  if (hours === 0) {
    return `${minutes} minutes`;
  }

  // Show hours and minutes
  return `${hours} hours ${minutes} minutes`;
}
