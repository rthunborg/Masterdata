/**
 * Deadline Validation Utilities
 * Story 8.11: Important Dates Deadline Columns
 *
 * This module provides validation and status checking for important date deadlines.
 * Business rules:
 * - deadline_submit must be <= deadline_cancel (submission deadline comes first)
 * - deadline_cancel must be <= date_value (cancel deadline before event)
 * - After deadline_submit passes, no new employee assignments allowed
 * - After deadline_cancel passes, no employee unassignments (cancellations) allowed
 */

import { parseISO, isBefore, isAfter, isEqual, differenceInDays } from "date-fns";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type DeadlineStatus = "open" | "submit_closed" | "cancel_closed";

/**
 * Validate deadline date constraints
 * @param submitDate - deadline_submit value (ISO string or null)
 * @param cancelDate - deadline_cancel value (ISO string or null)
 * @param eventDate - date_value (ISO string)
 * @returns Validation result with error message if invalid
 */
export function validateDeadlines(
  submitDate: string | null,
  cancelDate: string | null,
  eventDate: string
): ValidationResult {
  // If both deadlines are null, validation passes (deadlines are optional)
  if (!submitDate && !cancelDate) {
    return { valid: true };
  }

  try {
    const event = parseISO(eventDate);

    // Validate deadline_submit <= deadline_cancel
    if (submitDate && cancelDate) {
      const submit = parseISO(submitDate);
      const cancel = parseISO(cancelDate);

      if (isAfter(submit, cancel)) {
        return {
          valid: false,
          error: "Inlämningsdeadline måste vara före eller samma som avbokningsdeadline",
        };
      }
    }

    // Validate deadline_cancel <= date_value
    if (cancelDate) {
      const cancel = parseISO(cancelDate);

      if (isAfter(cancel, event)) {
        return {
          valid: false,
          error: "Avbokningsdeadline måste vara före eller samma som händelsedatum",
        };
      }
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: "Ogiltigt datumformat",
    };
  }
}

/**
 * Check if submission deadline is still open (current date <= deadline)
 * @param deadline_submit - ISO date string or null
 * @returns true if open (before or on deadline), false if closed (after deadline), true if no deadline
 */
export function isSubmissionOpen(deadline_submit: string | null): boolean {
  if (!deadline_submit) return true; // No deadline = always open

  try {
    const deadline = parseISO(deadline_submit);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day

    // Open if today is before or equal to deadline
    return isBefore(now, deadline) || isEqual(now, deadline);
  } catch {
    return false; // Invalid date = closed for safety
  }
}

/**
 * Check if cancellation deadline is still open (current date <= deadline)
 * @param deadline_cancel - ISO date string or null
 * @returns true if open (before or on deadline), false if closed (after deadline), true if no deadline
 */
export function isCancellationOpen(deadline_cancel: string | null): boolean {
  if (!deadline_cancel) return true; // No deadline = always open

  try {
    const deadline = parseISO(deadline_cancel);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day

    // Open if today is before or equal to deadline
    return isBefore(now, deadline) || isEqual(now, deadline);
  } catch {
    return false; // Invalid date = closed for safety
  }
}

/**
 * Get overall deadline status for display badges
 * @param deadline_submit - ISO date string or null
 * @param deadline_cancel - ISO date string or null
 * @returns Status: 'open', 'submit_closed', or 'cancel_closed'
 */
export function getDeadlineStatus(
  deadline_submit: string | null,
  deadline_cancel: string | null
): DeadlineStatus {
  // Check cancel deadline first (more restrictive)
  if (!isCancellationOpen(deadline_cancel)) {
    return "cancel_closed";
  }

  // Check submit deadline
  if (!isSubmissionOpen(deadline_submit)) {
    return "submit_closed";
  }

  return "open";
}

/**
 * Get human-readable deadline warning message in Swedish
 * @param deadline_submit - ISO date string or null
 * @param deadline_cancel - ISO date string or null
 * @returns Warning message or null if no warning needed
 */
export function getDeadlineWarning(
  deadline_submit: string | null,
  deadline_cancel: string | null
): string | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Check if submission deadline is approaching (within 7 days)
  if (deadline_submit) {
    try {
      const submitDeadline = parseISO(deadline_submit);
      const daysUntilSubmit = differenceInDays(submitDeadline, now);

      if (daysUntilSubmit >= 0 && daysUntilSubmit <= 7) {
        return `OBS: Inlämningsdeadline för detta datum är ${deadline_submit}. Du har ${daysUntilSubmit} dagar kvar.`;
      }

      if (daysUntilSubmit < 0) {
        return "Inlämningsdeadline har passerat. Kan inte tilldela medarbetare.";
      }
    } catch {
      // Invalid date, return null
    }
  }

  // Check if cancellation deadline is approaching (within 7 days)
  if (deadline_cancel) {
    try {
      const cancelDeadline = parseISO(deadline_cancel);
      const daysUntilCancel = differenceInDays(cancelDeadline, now);

      if (daysUntilCancel >= 0 && daysUntilCancel <= 7) {
        return `OBS: Avbokningsdeadline för detta datum är ${deadline_cancel}. Du har ${daysUntilCancel} dagar kvar.`;
      }

      if (daysUntilCancel < 0) {
        return "Avbokningsdeadline har passerat. Kan inte ta bort tilldelning.";
      }
    } catch {
      // Invalid date, return null
    }
  }

  return null;
}

/**
 * Get badge label text based on deadline status
 * @param status - Deadline status
 * @returns Swedish badge label text
 */
export function getDeadlineBadgeLabel(status: DeadlineStatus): string {
  switch (status) {
    case "submit_closed":
      return "Inlämning Stängd";
    case "cancel_closed":
      return "Avbokning Stängd";
    case "open":
      return "Öppen";
  }
}
