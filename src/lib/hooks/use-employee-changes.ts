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
   * Detects new logins by comparing user.last_active_at with sessionStorage
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
    
    // If user.last_active_at differs from sessionStorage, it's a new login
    // Use the new last_active_at as baseline (user logged out and back in)
    // Otherwise, use sessionStorage value to maintain same baseline across page refreshes
    const baseline = (sessionBaseline && sessionBaseline === user.last_active_at) 
      ? sessionBaseline 
      : user.last_active_at;
    
    // Update sessionStorage with current baseline
    sessionStorage.setItem(SESSION_STORAGE_KEY, baseline);
    
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
   * 
   * Note: Column name matching is now case-insensitive. Both API and frontend
   * normalize to lowercase for consistent matching, handling any potential
   * case mismatches between trigger, column_config, and frontend.
   */
  const isColumnChanged = useCallback(
    (employeeId: string, columnName: string): boolean => {
      if (!columnName) return false;
      
      // Normalize employee ID and column name for consistent matching
      const normalizedEmployeeId = employeeId?.trim();
      const normalizedColumnName = columnName.toLowerCase().trim();
      
      if (!normalizedEmployeeId || !normalizedColumnName) return false;
      
      // Debug logging in development (reduced verbosity)
      // Only log when there's a mismatch or when column is changed
      
      const employee = changedEmployees.find((e) => {
        // Normalize both IDs for comparison (handle any whitespace or case issues)
        return e.employeeId?.trim() === normalizedEmployeeId;
      });
      
      if (!employee) {
        // Employee not found in changedEmployees - no changes for this employee
        return false;
      }
      
      // Normalize column names to lowercase for case-insensitive matching
      const isChanged = employee.changedColumns.some(
        (changedCol) => changedCol.toLowerCase().trim() === normalizedColumnName
      );
      
      // Debug logging only for mismatches (reduced verbosity for normal operation)
      if (process.env.NODE_ENV === 'development' && !isChanged && employee.changedColumns.length > 0) {
        // Only log when we expect a match but don't find one (potential bug)
        console.debug('[useEmployeeChanges] Column not matched:', {
          employeeId: normalizedEmployeeId,
          columnName: normalizedColumnName,
          availableColumns: employee.changedColumns.map(c => c.toLowerCase().trim()),
        });
      }
      
      return isChanged;
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

