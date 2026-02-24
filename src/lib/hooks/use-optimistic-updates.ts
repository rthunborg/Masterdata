"use client";

import { useCallback, useRef } from "react";
import type { Employee } from "@/lib/types/employee";

const OPTIMISTIC_TTL_MS = 5000;

interface OptimisticEntry {
  timestamp: number;
  updates: Partial<Employee>;
  previousValues: Partial<Employee>;
}

/**
 * Manages optimistic-update tracking for real-time conflict resolution.
 *
 * When the user edits a cell, we store (a) the new value and (b) the
 * previous value.  When a real-time event arrives within the TTL window
 * we can decide whether to keep the optimistic value, accept the server
 * value, or merge.
 */
export function useOptimisticUpdates(
  employees: Employee[],
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>
) {
  const recentUpdatesRef = useRef<Map<string, OptimisticEntry>>(new Map());

  const updateOptimistically = useCallback(
    (id: string, updates: Partial<Employee>) => {
      const existing = employees.find((emp) => emp.id === id);

      const previousValues: Partial<Employee> = {};
      if (existing) {
        for (const key of Object.keys(updates)) {
          const k = key as keyof Employee;
          (previousValues as Record<string, unknown>)[k] = existing[k];
        }
      }

      recentUpdatesRef.current.set(id, {
        timestamp: Date.now(),
        updates,
        previousValues: previousValues as Partial<Employee>,
      });

      setTimeout(() => {
        recentUpdatesRef.current.delete(id);
      }, OPTIMISTIC_TTL_MS);

      setEmployees((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp))
      );

      return () => {
        setEmployees((prev) =>
          prev.map((emp) => {
            if (emp.id !== id) return emp;
            const reverted = { ...emp };
            for (const key of Object.keys(updates)) {
              const k = key as keyof Employee;
              const prev = (previousValues as Record<string, unknown>)[k];
              if (prev !== undefined) {
                (reverted as Record<string, unknown>)[k] = prev;
              }
            }
            return reverted;
          })
        );
        recentUpdatesRef.current.delete(id);
      };
    },
    [employees, setEmployees]
  );

  return { recentUpdatesRef, updateOptimistically };
}
