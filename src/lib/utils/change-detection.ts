/**
 * Change detection utility for notification system
 * Determines if employee changes affect the user's current view
 */

import type { Employee } from "@/lib/types/employee";
import type {
  NotificationType,
  ViewState,
  FilterState,
  NotificationMetadata,
} from "@/lib/types/notifications";

/**
 * Detects the impact of an employee change on the current view
 * @param oldEmployee - Previous employee data (null for INSERT)
 * @param newEmployee - New/updated employee data
 * @param viewState - Current view state (filters, visible employees)
 * @returns Notification type or null if change doesn't affect view
 */
export function detectViewImpact(
  oldEmployee: Employee | null,
  newEmployee: Employee,
  viewState: ViewState
): NotificationType {
  const startTime = performance.now();

  const wasVisible = oldEmployee
    ? viewState.visibleEmployeeIds.has(oldEmployee.id)
    : false;
  const isNowVisible = employeeMatchesFilters(
    newEmployee,
    viewState.activeFilters
  );

  // Track performance
  const elapsed = performance.now() - startTime;
  if (elapsed > 100) {
    console.warn(
      `detectViewImpact exceeded 100ms: ${elapsed.toFixed(2)}ms`
    );
  }

  if (!wasVisible && isNowVisible) return "added";
  if (wasVisible && !isNowVisible) return "removed";
  if (wasVisible && isNowVisible) return "updated";
  return null; // Change doesn't affect this user's view
}

/**
 * Checks if an employee matches the current filter criteria
 * @param employee - Employee to check
 * @param filters - Active filter state
 * @returns true if employee matches filters
 */
export function employeeMatchesFilters(
  employee: Employee,
  filters: FilterState
): boolean {
  // Check archived filter
  if (!filters.includeArchived && employee.is_archived) {
    return false;
  }

  // Check terminated filter
  if (!filters.includeTerminated && employee.is_terminated) {
    return false;
  }

  // Check global filter (search term)
  if (filters.globalFilter && filters.globalFilter.trim() !== "") {
    const searchTerm = filters.globalFilter.toLowerCase();
    const searchableFields = [
      employee.first_name,
      employee.surname,
      employee.email,
      employee.mobile,
      employee.rank,
      employee.ssn,
    ]
      .filter((field) => field !== null)
      .map((field) => field!.toLowerCase());

    const matches = searchableFields.some((field) =>
      field.includes(searchTerm)
    );

    if (!matches) {
      return false;
    }
  }

  return true;
}

/**
 * Determines which field changed in an employee update
 * @param oldEmployee - Previous employee data
 * @param newEmployee - New employee data
 * @returns Human-readable field name that changed
 */
export function getChangedField(
  oldEmployee: Employee,
  newEmployee: Employee
): string | undefined {
  const fieldsToCheck: Array<{
    key: keyof Employee;
    label: string;
  }> = [
    { key: "first_name", label: "First Name" },
    { key: "surname", label: "Surname" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile" },
    { key: "rank", label: "Rank" },
    { key: "hire_date", label: "Hire Date" },
    { key: "termination_date", label: "Termination Date" },
    { key: "is_terminated", label: "Termination Status" },
    { key: "is_archived", label: "Archive Status" },
  ];

  for (const { key, label } of fieldsToCheck) {
    if (oldEmployee[key] !== newEmployee[key]) {
      return label;
    }
  }

  return undefined;
}

/**
 * Formats a notification message
 * @param notification - Notification metadata
 * @returns Formatted notification message
 */
export function formatNotification(
  notification: NotificationMetadata
): string {
  switch (notification.type) {
    case "added":
      return `1 new employee matches your filters: ${notification.employeeName}`;
    case "removed":
      return `1 employee no longer matches your filters: ${notification.employeeName}`;
    case "updated":
      if (notification.changedField) {
        return `Employee ${notification.employeeName} was updated (${notification.changedField} changed)`;
      }
      return `Employee ${notification.employeeName} was updated`;
    default:
      return "";
  }
}

/**
 * Formats batched notification messages
 * @param notifications - Array of notifications
 * @returns Formatted batched notification message
 */
export function formatBatchedNotification(
  notifications: NotificationMetadata[]
): string {
  if (notifications.length === 0) return "";
  if (notifications.length === 1) return formatNotification(notifications[0]);

  const typeGroups = notifications.reduce(
    (acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (typeGroups.added) {
    return `${typeGroups.added} new employee${
      typeGroups.added > 1 ? "s" : ""
    } match your filters`;
  }

  if (typeGroups.removed) {
    return `${typeGroups.removed} employee${
      typeGroups.removed > 1 ? "s" : ""
    } no longer match your filters`;
  }

  if (typeGroups.updated) {
    return `${typeGroups.updated} employee${
      typeGroups.updated > 1 ? "s were" : " was"
    } updated`;
  }

  return "";
}
