"use client";

import { useEffect, useCallback, useRef } from "react";
import { useNetworkStatus } from "./use-network-status";
import { offlineSyncService, type ConflictResolution } from "@/lib/services/offline-sync";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n";
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
  const t = useTranslations("toasts");

  const syncPendingMutations = useCallback(async () => {
    try {
      const result = await offlineSyncService.syncPendingMutations(conflictResolver);
      
      if (result.syncedCount > 0) {
        const message = result.syncedCount === 1 
          ? t("offlineSync.syncedSuccess", { count: result.syncedCount, plural: "" })
          : t("offlineSync.syncedSuccessPlural", { count: result.syncedCount });
        toast.success(message);
      }
      
      if (result.failedCount > 0) {
        const message = result.failedCount === 1
          ? t("offlineSync.syncFailed", { count: result.failedCount, plural: "" })
          : t("offlineSync.syncFailedPlural", { count: result.failedCount });
        toast.error(message);
      }
      
      if (result.conflicts.length > 0 && !conflictResolver) {
        // Only show warning if no resolver was provided (fallback to last-write-wins)
        const message = result.conflicts.length === 1
          ? t("offlineSync.conflictsDetected", { count: result.conflicts.length, plural: "" })
          : t("offlineSync.conflictsDetectedPlural", { count: result.conflicts.length });
        toast.warning(message);
      }
    } catch (error) {
      console.error("Failed to sync pending mutations:", error);
      toast.error(t("offlineSync.syncPendingFailed"));
    }
  }, [conflictResolver, t]);

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

