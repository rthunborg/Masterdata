/**
 * Hook for managing employee change detection state
 * 
 * Story: 16.3 - Frontend Change Tracking Hook
 * 
 * Provides change information for displaying notifications and highlights.
 * Automatically fetches changes on mount using user's last_active_at as baseline.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";

/**
 * Represents an employee with changed columns
 */
export interface ChangedEmployee {
  employeeId: string;
  changedColumns: string[]; // db_column_names
  lastChangeAt: string;
}

/**
 * API response from changes-since-last-active endpoint
 */
interface ChangesResponse {
  changedEmployees: ChangedEmployee[];
  totalCount: number;
  userLastActive: string | null;
}

/**
 * Return type for useEmployeeChanges hook
 */
export interface UseEmployeeChangesReturn {
  changedEmployees: ChangedEmployee[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  changesBaseline: string | null;
  refreshChanges: () => void;
  isColumnChanged: (employeeId: string, columnName: string) => boolean;
}

const SESSION_STORAGE_KEY = 'employee-changes-baseline';

/**
 * Hook for managing employee change detection state
 * 
 * Features:
 * - Automatically fetches changes on mount
 * - Captures baseline once per session (shared across tabs)
 * - Handles first-time users (null last_active_at)
 * - Provides helper functions for change lookup
 * 
 * @returns Change data, loading state, and helper functions
 */
export function useEmployeeChanges(): UseEmployeeChangesReturn {
  const { user } = useAuth();
  const [changesBaseline, setChangesBaseline] = useState<string | null>(null);
  const [changedEmployees, setChangedEmployees] = useState<ChangedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetches changes from the API using the provided baseline timestamp
   */
  const fetchChanges = useCallback(async (baseline: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/employees/changes-since-last-active?baseline=${encodeURIComponent(baseline)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to fetch changes: ${response.statusText}`
        );
      }
      
      const data: ChangesResponse = await response.json();
      setChangedEmployees(data.changedEmployees);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch changes');
      setError(error);
      console.error('[useEmployeeChanges] Error fetching changes:', error);
      // Don't clear existing changes on error - keep previous state
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initializes baseline and fetches changes on mount
   * Baseline is captured once per session and stored in sessionStorage
   */
  useEffect(() => {
    // First-time users: no changes to show (this is their first view)
    if (!user?.last_active_at) {
      setIsLoading(false);
      setChangedEmployees([]);
      setChangesBaseline(null);
      return;
    }

    // Check sessionStorage for existing baseline (same session, multiple tabs)
    const sessionBaseline = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const baseline = sessionBaseline || user.last_active_at;
    
    // Store baseline in sessionStorage if not already present
    if (!sessionBaseline) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, baseline);
    }
    
    setChangesBaseline(baseline);
    fetchChanges(baseline);
  }, [user?.last_active_at, fetchChanges]);

  /**
   * Refreshes changes by updating baseline to current user.last_active_at
   * and re-fetching changes
   */
  const refreshChanges = useCallback(() => {
    if (user?.last_active_at) {
      const newBaseline = user.last_active_at;
      setChangesBaseline(newBaseline);
      sessionStorage.setItem(SESSION_STORAGE_KEY, newBaseline);
      fetchChanges(newBaseline);
    }
  }, [user?.last_active_at, fetchChanges]);

  /**
   * Checks if a specific column changed for a specific employee
   * Memoized to prevent unnecessary re-computations
   */
  const isColumnChanged = useCallback(
    (employeeId: string, columnName: string): boolean => {
      const employee = changedEmployees.find((e) => e.employeeId === employeeId);
      return employee?.changedColumns.includes(columnName) ?? false;
    },
    [changedEmployees]
  );

  return {
    changedEmployees,
    totalCount: changedEmployees.length,
    isLoading,
    error,
    changesBaseline,
    refreshChanges,
    isColumnChanged,
  };
}

