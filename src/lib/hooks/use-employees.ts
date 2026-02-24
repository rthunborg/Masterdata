/**
 * Hook for managing employee data with real-time synchronization.
 *
 * Sub-concerns are extracted into dedicated modules:
 *   - employee-comparison.ts   → hasEmployeeChanged
 *   - use-notification-batch.ts → toast batching
 *   - use-optimistic-updates.ts → optimistic edits + conflict resolution
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { employeeService, type EmployeeFilters } from "@/lib/services/employee-service";
import type { Employee } from "@/lib/types/employee";
import { useRealtime } from "./use-realtime";
import type { RealtimeEvent } from "@/lib/types/realtime";
import { debounce, performanceTracker } from "@/lib/utils/animation-helpers";
import type { ViewState } from "@/lib/types/notifications";
import {
  detectViewImpact,
  getChangedField,
} from "@/lib/utils/change-detection";
import { mutationQueueService } from "@/lib/services/mutation-queue";
import { hasEmployeeChanged } from "@/lib/utils/employee-comparison";
import { useNotificationBatch } from "./use-notification-batch";
import { useOptimisticUpdates } from "./use-optimistic-updates";

// ── Module-level cache ──────────────────────────────────────────────

interface EmployeeCache {
  data: Employee[];
  filterKey: string;
  userRole: string | undefined;
  timestamp: number;
}
const EMPLOYEE_CACHE_TTL = 2 * 60 * 1000;
let employeeCache: EmployeeCache | null = null;

/** Reset the module-level cache (exposed for tests). */
export function _clearEmployeeCache() {
  employeeCache = null;
}

// ── Types ───────────────────────────────────────────────────────────

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

// ── Hook ────────────────────────────────────────────────────────────

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

  // Composed hooks
  const { addNotification } = useNotificationBatch();
  const { recentUpdatesRef, updateOptimistically } = useOptimisticUpdates(employees, setEmployees);

  // Track current viewState internally
  const viewStateRef = useRef<ViewState>({
    visibleEmployeeIds: new Set<string>(),
    activeFilters: {
      includeArchived: filters?.includeArchived,
      includeTerminated: filters?.includeTerminated,
      needsRepayment: filters?.needsRepayment,
      globalFilter,
    },
    activeSortColumn: null,
    activeSortDirection: null,
  });

  useEffect(() => {
    viewStateRef.current = {
      visibleEmployeeIds: new Set(employees.map((e) => e.id)),
      activeFilters: {
        includeArchived: filters?.includeArchived,
        includeTerminated: filters?.includeTerminated,
        needsRepayment: filters?.needsRepayment,
        globalFilter,
      },
      activeSortColumn: null,
      activeSortDirection: null,
    };
  }, [employees, filters, globalFilter]);

  // ── Fetch (with module-level caching) ─────────────────────────────

  const fetchEmployees = useCallback(async () => {
    const filterKey = JSON.stringify(filters || {});

    if (
      employeeCache &&
      employeeCache.filterKey === filterKey &&
      employeeCache.userRole === userRole &&
      Date.now() - employeeCache.timestamp < EMPLOYEE_CACHE_TTL
    ) {
      setEmployees(employeeCache.data);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let data: Employee[] = await employeeService.getAll(filters);

      const pendingMutations = await mutationQueueService.getPendingMutations();
      for (const mutation of pendingMutations) {
        if (mutation.type === "update" && mutation.employeeId) {
          const idx = data.findIndex((e) => e.id === mutation.employeeId);
          if (idx !== -1) data[idx] = { ...data[idx], ...mutation.data };
        } else if (mutation.type === "create" && mutation.tempId) {
          data.push({ ...(mutation.data as Omit<Employee, "id">), id: mutation.tempId });
        } else if (mutation.type === "delete" && mutation.employeeId) {
          data = data.filter((e) => e.id !== mutation.employeeId);
        }
      }

      setEmployees(data);
      employeeCache = { data, filterKey, userRole, timestamp: Date.now() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Misslyckades att hämta anställda";
      setError(new Error(msg));
      console.error("Misslyckades att hämta anställda:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, userRole]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Keep module-level cache in sync with realtime/optimistic state changes
  useEffect(() => {
    if (employees.length > 0) {
      employeeCache = {
        data: employees,
        filterKey: JSON.stringify(filters || {}),
        userRole,
        timestamp: Date.now(),
      };
    }
  }, [employees, filters, userRole]);

  // ── Real-time event handler ───────────────────────────────────────

  const handleRealtimeEvent = useCallback(
    async (event: RealtimeEvent) => {
      if (event.timestamp) {
        performanceTracker.trackEventLatency(event.timestamp, 2000);
      }

      if (event.table !== "employees") return;

      const performanceStart = performance.now();

      if (event.eventType === "INSERT" && event.new) {
        const newEmp = event.new as unknown as Employee;

        setEmployees((prev) => {
          if (prev.some((e) => e.id === newEmp.id)) return prev;
          return [...prev, newEmp];
        });

        setUpdatedEmployeeId(newEmp.id);
        setTimeout(() => setUpdatedEmployeeId(null), 2000);

        if (enableNotifications && viewStateRef.current) {
          const type = detectViewImpact(null, newEmp, viewStateRef.current);
          if (type === "added") {
            addNotification({
              type: "added",
              employeeId: newEmp.id,
              employeeName: `${newEmp.first_name} ${newEmp.surname}`,
              timestamp: new Date(),
            });
          }
        }
      } else if (event.eventType === "UPDATE" && event.new && event.old) {
        const updated = event.new as unknown as Employee;
        const old = event.old as unknown as Employee | undefined;

        setEmployees((prev) => {
          const current = prev.find((e) => e.id === updated.id);
          if (!current) return prev;

          // Optimistic-update conflict resolution
          const recentUpdate = recentUpdatesRef.current.get(updated.id);
          if (recentUpdate && Date.now() - recentUpdate.timestamp < 5000) {
            const fields = Object.keys(recentUpdate.updates);
            let allMatchOptimistic = true;
            let allMatchPrevious = true;

            for (const f of fields) {
              const k = f as keyof Employee;
              if (recentUpdate.updates[k] !== updated[k]) allMatchOptimistic = false;
              if (recentUpdate.previousValues[k] !== updated[k]) allMatchPrevious = false;
            }

            if (allMatchOptimistic) {
              recentUpdatesRef.current.delete(updated.id);
              // fall through to normal merge
            } else if (allMatchPrevious) {
              return prev; // stale event – keep optimistic value
            } else {
              // Concurrent edit: merge server changes but preserve our optimistic fields
              const merged: Employee = {
                ...current,
                ...updated,
                customData: updated.customData || current.customData,
              };
              Object.assign(merged, recentUpdate.updates);

              if (!hasEmployeeChanged(current, merged)) return prev;
              return prev.map((e) => (e.id === updated.id ? merged : e));
            }
          }

          const merged: Employee = {
            ...current,
            ...updated,
            customData: updated.customData || current.customData,
          };

          if (!hasEmployeeChanged(current, merged)) return prev;
          return prev.map((e) => (e.id === updated.id ? merged : e));
        });

        setUpdatedEmployeeId(updated.id);
        setTimeout(() => setUpdatedEmployeeId(null), 2000);

        if (enableNotifications && viewStateRef.current && old) {
          const impact = detectViewImpact(old, updated, viewStateRef.current);
          if (impact === "added") {
            addNotification({
              type: "added",
              employeeId: updated.id,
              employeeName: `${updated.first_name} ${updated.surname}`,
              timestamp: new Date(),
            });
          } else if (impact === "removed") {
            addNotification({
              type: "removed",
              employeeId: updated.id,
              employeeName: `${updated.first_name} ${updated.surname}`,
              timestamp: new Date(),
            });
          } else if (impact === "updated") {
            addNotification({
              type: "updated",
              employeeId: updated.id,
              employeeName: `${updated.first_name} ${updated.surname}`,
              changedField: getChangedField(old, updated),
              timestamp: new Date(),
            });
          }
        }

        if (!filters?.includeArchived && updated.is_archived) {
          setEmployees((prev) => prev.filter((e) => e.id !== updated.id));
        }
        if (!filters?.includeTerminated && updated.is_terminated) {
          setEmployees((prev) => prev.filter((e) => e.id !== updated.id));
        }
      } else if (event.eventType === "DELETE" && event.old) {
        const deleted = event.old as unknown as Employee;
        setEmployees((prev) => prev.filter((e) => e.id !== deleted.id));
      }

      const elapsed = performance.now() - performanceStart;
      if (elapsed > 100) {
        console.warn(`Real-time event processing exceeded 100ms: ${elapsed.toFixed(2)}ms`);
      }
    },
    [filters, enableNotifications, addNotification, recentUpdatesRef]
  );

  // Ref-stable wrapper: prevents debounce recreation when handleRealtimeEvent
  // changes (e.g. filters change). The debounced function is created once and
  // always calls the latest handler via the ref.
  const handleRealtimeEventRef = useRef(handleRealtimeEvent);
  useEffect(() => {
    handleRealtimeEventRef.current = handleRealtimeEvent;
  });

  const stableHandleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => handleRealtimeEventRef.current(event),
    []
  );

  const debouncedHandleRealtimeEvent = useMemo(
    () => debounce(stableHandleRealtimeEvent, 100),
    [stableHandleRealtimeEvent]
  );

  const { isConnected } = useRealtime({
    table: "employees",
    schema: "public",
    event: "*",
    onEvent: debouncedHandleRealtimeEvent,
    enabled: enableRealtime,
  });

  useEffect(() => {
    return () => {
      debouncedHandleRealtimeEvent.cancel();
    };
  }, [debouncedHandleRealtimeEvent]);

  const refetch = useCallback(async () => {
    employeeCache = null;
    await fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    isLoading,
    error,
    isConnected,
    refetch,
    updatedEmployeeId,
    updateEmployeeOptimistically: updateOptimistically,
  };
}
