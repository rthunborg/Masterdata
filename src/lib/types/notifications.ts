/**
 * Notification type definitions for change notifications
 */

export type NotificationType = "added" | "removed" | "updated" | null;

export interface ViewState {
  visibleEmployeeIds: Set<string>;
  activeFilters: FilterState;
  activeSortColumn: string | null;
  activeSortDirection: "asc" | "desc" | null;
}

export interface FilterState {
  includeArchived?: boolean;
  includeTerminated?: boolean;
  globalFilter?: string;
  // Add other filter fields as needed
}

export interface NotificationMetadata {
  type: "added" | "removed" | "updated";
  employeeId: string;
  employeeName: string;
  changedField?: string;
  timestamp: Date;
}

export interface NotificationBatch {
  notifications: NotificationMetadata[];
  timestamp: Date;
}
