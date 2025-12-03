/**
 * Change detection utility for preventing unnecessary view refreshes
 * Story 13.10: Prevent Unnecessary View Refreshes
 */

import type { Employee } from "@/lib/types/employee";
import type { ViewState, NotificationMetadata, FilterState } from "@/lib/types/notifications";

/**
 * Checks if a value has actually changed from its original value.
 * Handles different data types including strings, numbers, dates, booleans, null, and undefined.
 * 
 * @param original - The original value
 * @param current - The current/new value
 * @returns true if the value has changed, false otherwise
 */
export function hasValueChanged(original: unknown, current: unknown): boolean {
  // Handle null/undefined cases - treat them as different values
  if (original === null && current === undefined) return true;
  if (original === undefined && current === null) return true;
  if (original === null || original === undefined) {
    return current !== null && current !== undefined;
  }
  if (current === null || current === undefined) {
    return original !== null && original !== undefined;
  }
  
  // Handle dates - compare by timestamp
  if (original instanceof Date && current instanceof Date) {
    return original.getTime() !== current.getTime();
  }
  
  // Handle date strings (ISO format) - convert to Date and compare
  if (typeof original === 'string' && typeof current === 'string') {
    const originalDate = new Date(original);
    const currentDate = new Date(current);
    // Check if both are valid dates
    if (!isNaN(originalDate.getTime()) && !isNaN(currentDate.getTime())) {
      return originalDate.getTime() !== currentDate.getTime();
    }
  }
  
  // Handle strings - trim whitespace for comparison
  if (typeof original === 'string' && typeof current === 'string') {
    return original.trim() !== current.trim();
  }
  
  // Handle numbers - use strict equality (handles NaN, Infinity, etc.)
  if (typeof original === 'number' && typeof current === 'number') {
    // Handle NaN case
    if (isNaN(original) && isNaN(current)) {
      return false;
    }
    return original !== current;
  }
  
  // Handle booleans
  if (typeof original === 'boolean' && typeof current === 'boolean') {
    return original !== current;
  }
  
  // Default: strict equality comparison
  return original !== current;
}

/**
 * Detects the impact of an employee change on the current view.
 * Determines if the employee was added, removed, or updated in the view.
 * 
 * @param oldEmployee - The previous employee state (null for INSERT events)
 * @param newEmployee - The new employee state
 * @param viewState - The current view state (filters, visible IDs, etc.)
 * @returns "added" | "removed" | "updated" | null
 */
export function detectViewImpact(
  oldEmployee: Employee | null,
  newEmployee: Employee,
  viewState: ViewState
): "added" | "removed" | "updated" | null {
  const wasVisible = oldEmployee
    ? viewState.visibleEmployeeIds.has(oldEmployee.id)
    : false;
  const isNowVisible = employeeMatchesFilters(
    newEmployee,
    viewState.activeFilters
  );

  if (!wasVisible && isNowVisible) return "added";
  if (wasVisible && !isNowVisible) return "removed";
  if (wasVisible && isNowVisible) return "updated";
  return null; // Change doesn't affect this user's view
}

/**
 * Checks if an employee matches the active filters.
 * 
 * @param employee - The employee to check
 * @param filters - The active filter state
 * @returns true if employee matches filters, false otherwise
 */
export function employeeMatchesFilters(
  employee: Employee,
  filters: FilterState
): boolean {
  // Check archived filter
  if (filters.includeArchived === false && employee.is_archived) {
    return false;
  }

  // Check terminated filter
  if (filters.includeTerminated === false && employee.is_terminated) {
    return false;
  }

  // Check global filter (search)
  if (filters.globalFilter) {
    const searchTerm = filters.globalFilter.toLowerCase();
    const searchableText = [
      employee.first_name,
      employee.surname,
      employee.email,
      employee.mobile,
      employee.ssn,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    
    if (!searchableText.includes(searchTerm)) {
      return false;
    }
  }

  // If no filters exclude this employee, it matches
  return true;
}

/**
 * Gets the human-readable name of the field that changed between two employee records.
 * 
 * @param oldEmployee - The previous employee state
 * @param newEmployee - The new employee state
 * @returns The field name that changed, or undefined if no tracked field changed
 */
export function getChangedField(
  oldEmployee: Employee,
  newEmployee: Employee
): string | undefined {
  // Field mapping: employee property -> human-readable name
  const fieldMap: Record<string, string> = {
    first_name: "First Name",
    surname: "Surname",
    email: "Email",
    mobile: "Mobile",
    rank: "Rank",
    gender: "Gender",
    town_district: "Town District",
    hire_date: "Hire Date",
    termination_date: "Termination Date",
    termination_reason: "Termination Reason",
    is_terminated: "Termination Status",
    is_archived: "Archive Status",
    comments: "Comments",
  };

  // Check each tracked field
  for (const [field, displayName] of Object.entries(fieldMap)) {
    if (hasValueChanged(oldEmployee[field as keyof Employee], newEmployee[field as keyof Employee])) {
      return displayName;
    }
  }

  return undefined;
}

/**
 * Formats a single notification message.
 * 
 * @param notification - The notification metadata
 * @returns Formatted notification string
 */
export function formatNotification(notification: NotificationMetadata): string {
  const { type, employeeName, changedField } = notification;

  switch (type) {
    case "added":
      return `1 new employee matches your filters: ${employeeName}`;
    case "removed":
      return `1 employee no longer matches your filters: ${employeeName}`;
    case "updated":
      if (changedField) {
        return `Employee ${employeeName} was updated (${changedField} changed)`;
      }
      return `Employee ${employeeName} was updated`;
    default:
      return "";
  }
}

/**
 * Formats a batched notification message for multiple changes.
 * 
 * @param notifications - Array of notification metadata
 * @returns Formatted batched notification string, or empty string if no notifications
 */
export function formatBatchedNotification(
  notifications: NotificationMetadata[]
): string {
  if (notifications.length === 0) {
    return "";
  }

  if (notifications.length === 1) {
    return formatNotification(notifications[0]);
  }

  // Group by type
  const added = notifications.filter((n) => n.type === "added");
  const removed = notifications.filter((n) => n.type === "removed");
  const updated = notifications.filter((n) => n.type === "updated");

  const parts: string[] = [];

  if (added.length > 0) {
    parts.push(`${added.length} new employee${added.length > 1 ? "s" : ""} match your filters`);
  }

  if (removed.length > 0) {
    parts.push(`${removed.length} employee${removed.length > 1 ? "s" : ""} no longer match your filters`);
  }

  if (updated.length > 0) {
    parts.push(`${updated.length} employee${updated.length > 1 ? "s" : ""} were updated`);
  }

  return parts.join(", ");
}
