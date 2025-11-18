"use client";

import { useEffect, useCallback, useRef } from "react";
import { useNetworkStatus } from "./use-network-status";
import { offlineSyncService, type ConflictResolution } from "@/lib/services/offline-sync";
import { toast } from "sonner";
import type { Employee } from "@/lib/types/employee";

/**
 * Hook to monitor connectivity and automatically sync pending mutations
 * 
 * Story 12.3: Offline Support with Local Caching (AC: 3)
 * 
 * @param conflictResolver Optional function to resolve conflicts via dialog
 */
export function useOfflineSync(
  conflictResolver?: (conflict: {
    mutationId: string;
    employeeId: string;
    localData: Partial<Employee>;
    serverData: Employee;
  }) => Promise<ConflictResolution>
) {
  const { isOnline } = useNetworkStatus();
  const previousOnlineStatus = useRef<boolean | null>(null);

  const syncPendingMutations = useCallback(async () => {
    try {
      const result = await offlineSyncService.syncPendingMutations(conflictResolver);
      
      if (result.syncedCount > 0) {
        toast.success(`${result.syncedCount} pending change${result.syncedCount > 1 ? "s" : ""} synced successfully`);
      }
      
      if (result.failedCount > 0) {
        toast.error(`Failed to sync ${result.failedCount} change${result.failedCount > 1 ? "s" : ""}`);
      }
      
      if (result.conflicts.length > 0 && !conflictResolver) {
        // Only show warning if no resolver was provided (fallback to last-write-wins)
        toast.warning(`${result.conflicts.length} conflict${result.conflicts.length > 1 ? "s" : ""} detected. Using last-write-wins strategy.`);
      }
    } catch (error) {
      console.error("Failed to sync pending mutations:", error);
      toast.error("Failed to sync pending changes");
    }
  }, [conflictResolver]);

  useEffect(() => {
    // Only sync when transitioning from offline to online
    if (previousOnlineStatus.current === false && isOnline === true) {
      // Small delay to ensure network is stable
      const timeoutId = setTimeout(() => {
        syncPendingMutations();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
    
    previousOnlineStatus.current = isOnline;
  }, [isOnline, syncPendingMutations]);
}

