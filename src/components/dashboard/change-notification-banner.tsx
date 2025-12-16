"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useTranslations } from "@/lib/i18n";

const SESSION_STORAGE_KEY = "employee-changes-banner-dismissed";
const BASELINE_TRACKING_KEY = "employee-changes-banner-last-baseline";

// Use useLayoutEffect to avoid flash of content when restoring dismissal state
// but fallback to useEffect on server to avoid warnings
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Change Notification Banner Component
 * 
 * Story: 16.4 - Change Notification Banner Component
 * 
 * Displays a dismissible banner showing how many employees have changes
 * since the user's last login. Banner is hidden when dismissed and persists
 * dismissal state in sessionStorage for the current session.
 */
interface ChangeNotificationBannerProps {
  totalCount: number;
  changesBaseline: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function ChangeNotificationBanner({
  totalCount,
  changesBaseline,
  isLoading,
  error,
}: ChangeNotificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  // Fix: Initialize with null to avoid stale closure from prop
  const [prevBaseline, setPrevBaseline] = useState<string | null>(null);
  const tDashboard = useTranslations('dashboard');

  // Handle baseline changes (Derived State Pattern)
  // Store computed values in regular variables or use useEffect with proper dependency handling
  // Here we use useEffect to sync state when prop changes
  useEffect(() => {
    if (changesBaseline !== prevBaseline) {
      setPrevBaseline(changesBaseline);
      
      // Only reset dismissal if we have a previous baseline to compare against
      // (i.e. not the first render)
      if (prevBaseline !== null) {
        setIsDismissed(false);
      }
    }
  }, [changesBaseline, prevBaseline]);

  // Handle side effects (Storage Sync) and initial restore
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;

    // Prevent race condition: Don't process storage if baseline isn't loaded yet
    // BUT allow restoring dismissal state if we have a stored baseline
    const storedBaseline = sessionStorage.getItem(BASELINE_TRACKING_KEY);
    
    if (!changesBaseline && !storedBaseline) return;

    // Case 1: Baseline changed since last session (or new login)
    // We detect this by comparing prop to storage
    // NOTE: We only reset if we have a stored baseline to compare against.
    // If storedBaseline is null (first tracking), we assume existing dismissal state is valid/relevant
    // (or just respect the current session state).
    if (storedBaseline && storedBaseline !== changesBaseline) {
      if (changesBaseline) {
        sessionStorage.setItem(BASELINE_TRACKING_KEY, changesBaseline);
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      // isDismissed is already false (default or reset via derived state)
    }  
    // Case 2: Same baseline as stored OR first time tracking this baseline
    // We update tracking key and restore dismissal state
    else {
      if (changesBaseline) {
        sessionStorage.setItem(BASELINE_TRACKING_KEY, changesBaseline);
      }
      
      const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, [changesBaseline]);

  // Handle dismiss button click
  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    }
  };

  // Format date/time for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      // Format: "January 15, 2025 at 8:00 AM" (or locale-appropriate)
      return format(date, "PPPP 'at' p", { locale: sv });
    } catch (error) {
      console.error("[ChangeNotificationBanner] Error formatting date:", error);
      return dateString;
    }
  };

  // Don't show banner if:
  // - Loading (wait for data)
  // - Error occurred (don't show misleading info)
  // - Dismissed
  // - No changes (totalCount === 0)
  // - No baseline (first-time user)
  if (
    isLoading ||
    error ||
    isDismissed ||
    totalCount === 0 ||
    !changesBaseline
  ) {
    return null;
  }

  const formattedDate = formatDate(changesBaseline);

  return (
    <Alert
      className="mb-4 p-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-4">
        <AlertDescription className="flex-1 text-sm text-blue-900 dark:text-blue-100">
          {tDashboard('changeNotification.changesMadeTo')} <strong>{totalCount}</strong>{" "}
          {totalCount === 1 
            ? tDashboard('changeNotification.employee') 
            : tDashboard('changeNotification.employees')} {tDashboard('changeNotification.sinceLastLogin')}{" "}
          {formattedDate}. {tDashboard('changeNotification.seeHighlightedFields')}
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="shrink-0 h-8 w-8 p-0 text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-300 dark:hover:text-blue-100 dark:hover:bg-blue-900/40"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
