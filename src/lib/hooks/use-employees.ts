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
  hasValueChanged,
} from "@/lib/utils/change-detection";
import { toast } from "sonner";
import { mutationQueueService } from "@/lib/services/mutation-queue";

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
  updateEmployeeOptimistically: (id: string, updates: Partial<Employee>) => () => void;
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
      needsRepayment: filters?.needsRepayment, // Story 8.13 AC 9
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
        needsRepayment: filters?.needsRepayment, // Story 8.13 AC 9
        globalFilter,
      },
      activeSortColumn: null,
      activeSortDirection: null,
    };
  }, [employees, filters, globalFilter]);

  // Fetch employees from API or cache
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let data: Employee[];
      data = await employeeService.getAll(filters);

      // Apply pending mutations optimistically (Story 12.3)
      const pendingMutations = await mutationQueueService.getPendingMutations();
      for (const mutation of pendingMutations) {
        if (mutation.type === "update" && mutation.employeeId) {
          const employeeIndex = data.findIndex((e) => e.id === mutation.employeeId);
          if (employeeIndex !== -1) {
            data[employeeIndex] = { ...data[employeeIndex], ...mutation.data };
          }
        } else if (mutation.type === "create" && mutation.tempId) {
          // Add new employee with temp ID, explicitly typing without 'any'
          data.push({
            ...(mutation.data as Omit<Employee, "id">),
            id: mutation.tempId,
          });
        } else if (mutation.type === "delete" && mutation.employeeId) {
          data = data.filter((e) => e.id !== mutation.employeeId);
        }
      }

      // For external party users, fetch custom data
      if (userRole && userRole !== "hr_admin") {
        const employeesWithCustomData = await Promise.all(
          data.map(async (employee) => {
            try {
              const customData = await customDataService.getCustomData(employee.id);
              return { ...employee, customData };
            } catch (err) {
              console.warn(`Failed to fetch custom data for employee ${employee.id}:`, err);
              return { ...employee, customData: employee.customData || {} };
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

  /**
   * Helper function to check if an employee has actually changed.
   * Compares all relevant fields between old and new employee data.
   * Story 13.10: Prevent unnecessary view refreshes
   */
  const hasEmployeeChanged = useCallback((oldEmployee: Employee, newEmployee: Employee): boolean => {
    // Get all keys from both objects (union of keys)
    const allKeys = new Set([
      ...Object.keys(oldEmployee),
      ...Object.keys(newEmployee),
    ]);

    // Compare each field
    for (const key of allKeys) {
      // Skip metadata fields that change on every update
      if (key === 'updated_at' || key === 'created_at') {
        continue;
      }

      const oldValue = oldEmployee[key as keyof Employee];
      const newValue = newEmployee[key as keyof Employee];

      // Special handling for customData (deep comparison)
      if (key === 'customData') {
        const oldCustomData = oldValue as Record<string, unknown> | undefined;
        const newCustomData = newValue as Record<string, unknown> | undefined;

        // If both are undefined/null, they're the same
        if (!oldCustomData && !newCustomData) {
          continue;
        }

        // If one is undefined/null and the other isn't, they're different
        if (!oldCustomData || !newCustomData) {
          return true;
        }

        // Compare all keys in customData
        const customDataKeys = new Set([
          ...Object.keys(oldCustomData),
          ...Object.keys(newCustomData),
        ]);

        for (const customKey of customDataKeys) {
          if (hasValueChanged(oldCustomData[customKey], newCustomData[customKey])) {
            return true;
          }
        }
        continue;
      }

      // Use hasValueChanged for all other fields
      if (hasValueChanged(oldValue, newValue)) {
        return true;
      }
    }

    return false;
  }, []);

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
        const newEmployee = event.new as unknown as Employee;

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
      } else if (event.eventType === "UPDATE" && event.new && event.old) {
        // Update existing employee
        const updatedEmployee = event.new as unknown as Employee;
        const oldEmployee = event.old as unknown as Employee | undefined;

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

        // Story 13.10: Only update state if data actually changed
        // Also check if we have a recent optimistic update that should be preserved
        setEmployees((prev) => {
          const currentEmployee = prev.find((emp) => emp.id === updatedEmployee.id);

          // If employee not found in current state, add it (shouldn't happen, but handle gracefully)
          if (!currentEmployee) {
            return prev;
          }

          // Check if we have a recent optimistic update for this employee
          const recentUpdate = recentOptimisticUpdatesRef.current.get(updatedEmployee.id);
          if (recentUpdate) {
            const timeSinceUpdate = Date.now() - recentUpdate.timestamp;
            // If optimistic update was less than 5 seconds ago, check if we should preserve it
            if (timeSinceUpdate < 5000) {
              
              // Check if the real-time update matches the optimistic update for the fields we updated
              // If it matches, the server has processed it - use the real-time update
              // If it matches the PREVIOUS value, it's a stale update - ignore it and keep optimistic
              // If it's different from both, someone else changed it - use real-time
              const optimisticFields = Object.keys(recentUpdate.updates);
              let allFieldsMatchOptimistic = true;
              let allFieldsMatchPrevious = true;
              
              for (const field of optimisticFields) {
                const optimisticValue = recentUpdate.updates[field as keyof Employee];
                const previousValue = recentUpdate.previousValues[field as keyof Employee];
                const realtimeValue = updatedEmployee[field as keyof Employee];
                
                const matchesOptimistic = optimisticValue === realtimeValue;
                const matchesPrevious = previousValue === realtimeValue;
                
                
                if (!matchesOptimistic) allFieldsMatchOptimistic = false;
                if (!matchesPrevious) allFieldsMatchPrevious = false;
              }
              
              if (allFieldsMatchOptimistic) {
                // Server has processed the update - use real-time update and clear optimistic tracking
                recentOptimisticUpdatesRef.current.delete(updatedEmployee.id);
                // Continue with normal merge below - this will apply the real-time update
              } else if (allFieldsMatchPrevious) {
                // Real-time update matches previous value - this is a stale update, ignore it
                // Don't update, keep the optimistic update that's already in prev state
                return prev;
              } else {
                // Real-time update has different values - someone else changed it, but we still want our optimistic update
                // Keep optimistic update for fields we changed, but merge other fields from real-time
                const mergedEmployee: Employee = {
                  ...currentEmployee,
                  ...updatedEmployee, // Start with real-time update (has other changes)
                  customData: updatedEmployee.customData || currentEmployee.customData,
                };
                // Override with our optimistic updates for the fields we changed
                Object.assign(mergedEmployee, recentUpdate.updates);
                
                // Check if employee data actually changed
                if (!hasEmployeeChanged(currentEmployee, mergedEmployee)) {
                  return prev;
                }
                
                return prev.map((emp) =>
                  emp.id === updatedEmployee.id ? mergedEmployee : emp
                );
              }
            }
          }

          // Merge updated employee with current employee to preserve customData
          const mergedEmployee: Employee = {
            ...currentEmployee,
            ...updatedEmployee,
            customData: updatedEmployee.customData || currentEmployee.customData,
          };

          // Check if employee data actually changed
          if (!hasEmployeeChanged(currentEmployee, mergedEmployee)) {
            // No changes detected, return previous state to prevent unnecessary re-render
            return prev;
          }

          // Data changed, update the employee
          return prev.map((emp) =>
            emp.id === updatedEmployee.id ? mergedEmployee : emp
          );
        });

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
        const deletedEmployee = event.old as unknown as Employee;
        setEmployees((prev) => prev.filter((emp) => emp.id !== deletedEmployee.id));

        // Note: DELETE events typically don't trigger notifications as employee is removed from DB
      }

      // Track notification logic performance
      const elapsed = performance.now() - performanceStart;
      if (elapsed > 100) {
        console.warn(`Real-time event processing exceeded 100ms: ${elapsed.toFixed(2)}ms`);
      }
    },
    [filters, userRole, enableNotifications, addNotificationToBatch, hasEmployeeChanged]
  );

  // Debounce real-time event handling to prevent UI thrashing
  const debouncedHandleRealtimeEvent = useMemo(
    () => debounce((event: RealtimeEvent) => handleRealtimeEvent(event), 100),
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

  // Track recent optimistic updates to prevent real-time sync from overwriting them
  // Stores: employeeId -> { timestamp, updates, previousValues }
  const recentOptimisticUpdatesRef = useRef<Map<string, { 
    timestamp: number; 
    updates: Partial<Employee>;
    previousValues: Partial<Employee>; // Values before the optimistic update
  }>>(new Map());

  // Optimistic update function
  const updateEmployeeOptimistically = useCallback((id: string, updates: Partial<Employee>) => {
    const employeeToUpdate = employees.find(emp => emp.id === id);
    
    // Store previous values for the fields being updated
    const previousValues: Partial<Employee> = {};
    if (employeeToUpdate) {
      Object.keys(updates).forEach(key => {
        const fieldKey = key as keyof Employee;
        const value = employeeToUpdate[fieldKey];
        // Type assertion needed because Partial<Employee> doesn't allow all value types directly
        (previousValues as Record<string, unknown>)[fieldKey] = value;
      });
    }

    // Track this optimistic update with timestamp and previous values
    recentOptimisticUpdatesRef.current.set(id, {
      timestamp: Date.now(),
      updates,
      previousValues: previousValues as Partial<Employee>
    });
    // Clear after 5 seconds (enough time for server to process and real-time sync to catch up)
    setTimeout(() => {
      recentOptimisticUpdatesRef.current.delete(id);
    }, 5000);

    // Apply updates immediately
    setEmployees((prev) => {
      const updated = prev.map((emp) => {
        if (emp.id === id) {
          const merged = { ...emp, ...updates };
          return merged;
        }
        return emp;
      });
      return updated;
    });

    // Return rollback function
    return () => {
      // Revert to previous state by removing the optimistic update
      setEmployees((prev) => {
        return prev.map((emp) => {
          if (emp.id === id) {
            // Revert the fields that were optimistically updated
            const reverted = { ...emp };
            Object.keys(updates).forEach(key => {
              const fieldKey = key as keyof Employee;
              if (fieldKey in previousValues) {
                const previousValue = (previousValues as Record<string, unknown>)[fieldKey];
                if (previousValue !== undefined) {
                  (reverted as Record<string, unknown>)[fieldKey] = previousValue;
                }
              }
            });
            return reverted;
          }
          return emp;
        });
      });
      recentOptimisticUpdatesRef.current.delete(id);
    };
  }, [employees]);

  return {
    employees,
    isLoading,
    error,
    isConnected,
    refetch: fetchEmployees,
    updatedEmployeeId,
    updateEmployeeOptimistically,
  };
}
