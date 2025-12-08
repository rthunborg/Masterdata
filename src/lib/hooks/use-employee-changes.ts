/**
 * Hook for managing employee change detection state
 * 
 * Story: 16.3 - Frontend Change Tracking Hook
 * 
 * Provides change information for displaying notifications and highlights.
 * Automatically fetches changes on mount using user's last_active_at as baseline.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./use-auth";
import { isHRAdmin } from "@/lib/types/user";

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
const SESSION_USER_ID_KEY = 'employee-changes-user-id';

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
  const { user, checkAuth } = useAuth();
  const [changesBaseline, setChangesBaseline] = useState<string | null>(null);
  const [changedEmployees, setChangedEmployees] = useState<ChangedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

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
   * Detects new logins by tracking user ID changes
   * 
   * Note: This feature is only for external users (Epic 16). HR admins should not see
   * change notifications or highlights, so we skip all logic for them.
   */
  useEffect(() => {
    // Skip all logic for HR admins - this feature is only for external users
    if (user && isHRAdmin(user.role)) {
      setIsLoading(false);
      setChangedEmployees([]);
      setChangesBaseline(null);
      // Clear sessionStorage for HR admins to prevent any leftover state
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_USER_ID_KEY);
      }
      previousUserIdRef.current = null;
      return;
    }

    // First-time users: no changes to show (this is their first view)
    if (!user?.last_active_at) {
      setIsLoading(false);
      setChangedEmployees([]);
      setChangesBaseline(null);
      // Clear sessionStorage when user becomes null (logout)
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_USER_ID_KEY);
      }
      previousUserIdRef.current = null;
      return;
    }

    const currentUserId = user.id;
    const previousUserId = previousUserIdRef.current;
    const sessionUserId = typeof window !== "undefined" 
      ? sessionStorage.getItem(SESSION_USER_ID_KEY) 
      : null;
    
    // Check sessionStorage for existing baseline (same session, multiple tabs)
    const sessionBaseline = typeof window !== "undefined"
      ? sessionStorage.getItem(SESSION_STORAGE_KEY)
      : null;
    
    // Detect new login:
    // 1. User ID changed (different user logged in)
    // 2. User ID is null/undefined in ref but now has a user (transition from logout to login)
    // 3. SessionStorage has different user ID (new login in same browser session)
    const isNewLogin = 
      (previousUserId !== null && previousUserId !== currentUserId) ||
      (previousUserId === null && currentUserId !== null) ||
      (sessionUserId !== null && sessionUserId !== currentUserId);
    
    let baseline: string;
    
    if (isNewLogin || !sessionBaseline) {
      // New login session - use current user.last_active_at as baseline
      // Note: last_active_at might not be updated immediately if <5 min since last update.
      // Refresh user object after a short delay to get updated last_active_at from middleware
      baseline = user.last_active_at;
    } else if (sessionBaseline === user.last_active_at) {
      // Same session, page refresh - maintain baseline
      baseline = sessionBaseline;
    } else {
      // user.last_active_at has changed (middleware updated it) - use new value
      baseline = user.last_active_at;
    }
    
    // Update sessionStorage with current baseline and user ID
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, baseline);
      sessionStorage.setItem(SESSION_USER_ID_KEY, currentUserId);
    }
    
    // Update ref for next render
    previousUserIdRef.current = currentUserId;
    
    setChangesBaseline(baseline);
    fetchChanges(baseline);
    
    // If this is a new login, refresh user object after a delay to get updated last_active_at
    // This ensures we get the timestamp updated by middleware (even if <5 min rule applies)
    // Return cleanup function to clear timeout if component unmounts or user changes
    if (isNewLogin && checkAuth) {
      const refreshTimeout = setTimeout(() => {
        checkAuth();
      }, 1000); // 1 second delay to allow middleware to complete
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [user, user?.id, user?.last_active_at, user?.role, fetchChanges, checkAuth]);

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

