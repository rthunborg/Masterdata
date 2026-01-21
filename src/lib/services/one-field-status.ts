/**
 * One Field Status Service
 * 
 * Business Rule: The "One" field represents a completion checkpoint that triggers
 * data synchronization to the Talmundo external system. Talmundo's integration
 * requirements mandate that the Talmundo field cannot be edited until 00:01 AM
 * the day after the One field was marked as complete.
 * 
 * This service provides time-based status calculation for the One field to enforce
 * the mandatory waiting period until the next day.
 * 
 * Status Indicators:
 * - Yellow (⚠ Pending): One is true but not yet past 00:01 AM the following day
 * - Green (✓ Complete): One is true and it's past 00:01 AM the following day
 * - Null: One is false or not set
 */

/**
 * Calculate the unlock time (00:01 AM the day after markedAt)
 * 
 * @param markedAt - Timestamp when One was set to true
 * @returns Date object representing 00:01 AM the following day (local time)
 */
export function getUnlockTime(markedAt: Date): Date {
  // Get the next day at 00:01 AM in local time
  const unlockTime = new Date(markedAt);
  unlockTime.setDate(unlockTime.getDate() + 1); // Move to next day
  unlockTime.setHours(0, 1, 0, 0); // Set to 00:01:00.000
  return unlockTime;
}

/**
 * Calculate the current status of the One field based on time until next day 00:01 AM.
 * 
 * This enforces a mandatory waiting period until the following day at 00:01 AM
 * for external system synchronization.
 * 
 * @param oneValue - Current boolean value of the One field
 * @param markedAt - Timestamp when One was set to true
 * @returns 'green' if past 00:01 AM the following day, 'yellow' if not yet, null if One is false
 * 
 * @example
 * // Just marked as true
 * getOneFieldStatus(true, null) // Returns 'yellow'
 * 
 * @example
 * // Marked today at 3 PM, current time is 11 PM same day
 * getOneFieldStatus(true, todayAt3PM) // Returns 'yellow'
 * 
 * @example
 * // Marked yesterday at 3 PM, current time is 00:02 AM today
 * getOneFieldStatus(true, yesterdayAt3PM) // Returns 'green'
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

  const now = new Date();
  const unlockTime = getUnlockTime(markedAt);

  // Return green if we've passed the unlock time (00:01 AM the following day)
  return now >= unlockTime ? 'green' : 'yellow';
}

/**
 * Calculate remaining time until One field status turns green.
 * 
 * This function formats the remaining time in a human-readable format
 * to display in tooltips, showing how long until 00:01 AM the following day.
 * 
 * @param markedAt - Timestamp when One was set to true
 * @returns Formatted string "X hours Y minutes" or "Ready" if time elapsed
 * 
 * @example
 * // Marked today at 8 PM, showing time until tomorrow 00:01 AM
 * getRemainingTime(todayAt8PM) // Returns "4 hours 1 minutes"
 * 
 * @example
 * // Less than 1 hour remaining until 00:01 AM
 * getRemainingTime(todayAt11_30PM) // Returns "31 minutes"
 * 
 * @example
 * // Time has elapsed (past 00:01 AM the next day)
 * getRemainingTime(yesterdayAt3PM) // Returns "Ready"
 */
export function getRemainingTime(markedAt: Date): string {
  const now = new Date();
  const unlockTime = getUnlockTime(markedAt);
  const remaining = unlockTime.getTime() - now.getTime();

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
