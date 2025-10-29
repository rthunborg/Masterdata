/**
 * Hook for managing employee data with real-time synchronization
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { employeeService, type EmployeeFilters } from "@/lib/services/employee-service";
import { customDataService } from "@/lib/services/custom-data-service";
import type { Employee } from "@/lib/types/employee";
import { useRealtime } from "./use-realtime";
import type { RealtimeEvent } from "@/lib/types/realtime";
import { debounce, performanceTracker } from "@/lib/utils/animation-helpers";
import type { ViewState, NotificationMetadata } from "@/lib/types/notifications";
import {
  detectViewImpact,
  getChangedField,
  formatNotification,
  formatBatchedNotification,
} from "@/lib/utils/change-detection";
import { toast } from "sonner";

interface UseEmployeesOptions {
  filters?: EmployeeFilters;
  enableRealtime?: boolean;
  userRole?: string;
  enableNotifications?: boolean;
  globalFilter?: string;
}

interface UseEmployeesReturn {
  employees: Employee[];
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
  updatedEmployeeId: string | null;
}

/**
 * Hook for fetching and managing employees with real-time updates
 * @param options - Configuration options
 * @returns Employee data, loading state, connection status, and refetch function
 */
export function useEmployees({
  filters,
  enableRealtime = true,
  userRole,
  enableNotifications = false,
  globalFilter = "",
}: UseEmployeesOptions = {}): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updatedEmployeeId, setUpdatedEmployeeId] = useState<string | null>(null);
  
  // Notification batching
  const notificationBatchRef = useRef<NotificationMetadata[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track current viewState internally
  const viewStateRef = useRef<ViewState>({
    visibleEmployeeIds: new Set<string>(),
    activeFilters: {
      includeArchived: filters?.includeArchived,
      includeTerminated: filters?.includeTerminated,
      globalFilter,
    },
    activeSortColumn: null,
    activeSortDirection: null,
  });

  // Update viewState whenever employees or filters change
  useEffect(() => {
    viewStateRef.current = {
      visibleEmployeeIds: new Set(employees.map((e) => e.id)),
      activeFilters: {
        includeArchived: filters?.includeArchived,
        includeTerminated: filters?.includeTerminated,
        globalFilter,
      },
      activeSortColumn: null,
      activeSortDirection: null,
    };
  }, [employees, filters, globalFilter]);

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await employeeService.getAll(filters);

      // For external party users, fetch custom data
      if (userRole && userRole !== "hr_admin") {
        const employeesWithCustomData = await Promise.all(
          data.map(async (employee) => {
            try {
              const customData = await customDataService.getCustomData(employee.id);
              return { ...employee, customData };
            } catch (err) {
              console.warn(`Failed to fetch custom data for employee ${employee.id}:`, err);
              return { ...employee, customData: {} };
            }
          })
        );
        setEmployees(employeesWithCustomData);
      } else {
        setEmployees(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch employees";
      setError(new Error(errorMessage));
      console.error("Failed to fetch employees:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, userRole]);

  // Notification batching function
  const flushNotificationBatch = useCallback(() => {
    if (notificationBatchRef.current.length === 0) return;

    const batch = [...notificationBatchRef.current];
    notificationBatchRef.current = [];

    if (batch.length === 1) {
      toast.info(formatNotification(batch[0]), {
        duration: 5000,
        action: batch[0].employeeId
          ? {
              label: "View",
              onClick: () => {
                // Scroll to employee handled by parent component
                const event = new CustomEvent("scrollToEmployee", {
                  detail: { employeeId: batch[0].employeeId },
                });
                window.dispatchEvent(event);
              },
            }
          : undefined,
      });
    } else {
      toast.info(formatBatchedNotification(batch), {
        duration: 5000,
      });
    }
  }, []);

  // Add notification to batch
  const addNotificationToBatch = useCallback(
    (notification: NotificationMetadata) => {
      notificationBatchRef.current.push(notification);

      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Set new timeout to flush batch after 200ms
      batchTimeoutRef.current = setTimeout(() => {
        flushNotificationBatch();
      }, 200);
    },
    [flushNotificationBatch]
  );

  // Initial fetch
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle real-time events
  const handleRealtimeEvent = useCallback(
    async (event: RealtimeEvent) => {
      // Track performance
      if (event.timestamp) {
        performanceTracker.trackEventLatency(event.timestamp, 2000);
      }

      // Only process events from employees table (not custom data tables)
      if (event.table !== "employees") return;

      const performanceStart = performance.now();

      if (event.eventType === "INSERT" && event.new) {
        // Add new employee to list
        const newEmployee = event.new as Employee;
        
        // Fetch custom data if needed
        if (userRole && userRole !== "hr_admin") {
          try {
            const customData = await customDataService.getCustomData(newEmployee.id);
            newEmployee.customData = customData;
          } catch (err) {
            console.warn(`Failed to fetch custom data for new employee ${newEmployee.id}:`, err);
            newEmployee.customData = {};
          }
        }

        setEmployees((prev) => {
          // Check if employee already exists (avoid duplicates)
          if (prev.some((emp) => emp.id === newEmployee.id)) {
            return prev;
          }
          return [...prev, newEmployee];
        });
        
        setUpdatedEmployeeId(newEmployee.id);
        setTimeout(() => setUpdatedEmployeeId(null), 2000);

        // Trigger notification if enabled
        if (enableNotifications && viewStateRef.current) {
          const notificationType = detectViewImpact(null, newEmployee, viewStateRef.current);
          if (notificationType === "added") {
            addNotificationToBatch({
              type: "added",
              employeeId: newEmployee.id,
              employeeName: `${newEmployee.first_name} ${newEmployee.surname}`,
              timestamp: new Date(),
            });
          }
        }
      } else if (event.eventType === "UPDATE" && event.new) {
        // Update existing employee
        const updatedEmployee = event.new as Employee;
        const oldEmployee = event.old as Employee | undefined;
        
        // Fetch custom data if needed
        if (userRole && userRole !== "hr_admin") {
          try {
            const customData = await customDataService.getCustomData(updatedEmployee.id);
            updatedEmployee.customData = customData;
          } catch (err) {
            console.warn(`Failed to fetch custom data for updated employee ${updatedEmployee.id}:`, err);
            // Keep existing custom data if fetch fails
          }
        }

        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === updatedEmployee.id
              ? { ...emp, ...updatedEmployee, customData: updatedEmployee.customData || emp.customData }
              : emp
          )
        );
        
        setUpdatedEmployeeId(updatedEmployee.id);
        setTimeout(() => setUpdatedEmployeeId(null), 2000);

        // Trigger notification if enabled
        if (enableNotifications && viewStateRef.current && oldEmployee) {
          const notificationType = detectViewImpact(oldEmployee, updatedEmployee, viewStateRef.current);
          
          if (notificationType === "added") {
            addNotificationToBatch({
              type: "added",
              employeeId: updatedEmployee.id,
              employeeName: `${updatedEmployee.first_name} ${updatedEmployee.surname}`,
              timestamp: new Date(),
            });
          } else if (notificationType === "removed") {
            addNotificationToBatch({
              type: "removed",
              employeeId: updatedEmployee.id,
              employeeName: `${updatedEmployee.first_name} ${updatedEmployee.surname}`,
              timestamp: new Date(),
            });
          } else if (notificationType === "updated") {
            const changedField = getChangedField(oldEmployee, updatedEmployee);
            addNotificationToBatch({
              type: "updated",
              employeeId: updatedEmployee.id,
              employeeName: `${updatedEmployee.first_name} ${updatedEmployee.surname}`,
              changedField,
              timestamp: new Date(),
            });
          }
        }

        // Check if employee should be removed from view based on filters
        if (!filters?.includeArchived && updatedEmployee.is_archived) {
          setEmployees((prev) => prev.filter((emp) => emp.id !== updatedEmployee.id));
        }
        
        if (!filters?.includeTerminated && updatedEmployee.is_terminated) {
          setEmployees((prev) => prev.filter((emp) => emp.id !== updatedEmployee.id));
        }
      } else if (event.eventType === "DELETE" && event.old) {
        // Remove deleted employee
        const deletedEmployee = event.old as Employee;
        setEmployees((prev) => prev.filter((emp) => emp.id !== deletedEmployee.id));

        // Note: DELETE events typically don't trigger notifications as employee is removed from DB
      }

      // Track notification logic performance
      const elapsed = performance.now() - performanceStart;
      if (elapsed > 100) {
        console.warn(`Real-time event processing exceeded 100ms: ${elapsed.toFixed(2)}ms`);
      }
    },
    [filters, userRole, enableNotifications, addNotificationToBatch]
  );

  // Debounce real-time event handling to prevent UI thrashing
  const debouncedHandleRealtimeEvent = useMemo(
    () => debounce(handleRealtimeEvent, 100),
    [handleRealtimeEvent]
  );

  // Subscribe to real-time updates
  const { isConnected } = useRealtime({
    table: "employees",
    schema: "public",
    event: "*",
    onEvent: debouncedHandleRealtimeEvent,
    enabled: enableRealtime,
  });

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedHandleRealtimeEvent.cancel();
      
      // Cleanup notification batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      // Flush any remaining notifications
      if (notificationBatchRef.current.length > 0) {
        flushNotificationBatch();
      }
    };
  }, [debouncedHandleRealtimeEvent, flushNotificationBatch]);

  return {
    employees,
    isLoading,
    error,
    isConnected,
    refetch: fetchEmployees,
    updatedEmployeeId,
  };
}
