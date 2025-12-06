"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const SESSION_STORAGE_KEY = "employee-changes-banner-dismissed";
const BASELINE_TRACKING_KEY = "employee-changes-banner-last-baseline";

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

  // Check sessionStorage on mount to restore dismissal state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  // Clear dismissal state when baseline changes (new login)
  // Track the baseline we've seen before in a separate key to detect changes
  useEffect(() => {
    if (changesBaseline && typeof window !== "undefined") {
      const lastSeenBaseline = sessionStorage.getItem(BASELINE_TRACKING_KEY);
      // If baseline changed (different from what we've seen before), it's a new login
      // Clear dismissal state so banner shows again
      if (lastSeenBaseline && lastSeenBaseline !== changesBaseline) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setIsDismissed(false);
      }
      // Update tracking key with current baseline
      sessionStorage.setItem(BASELINE_TRACKING_KEY, changesBaseline);
    } else if (!changesBaseline && typeof window !== "undefined") {
      // Clear tracking key if baseline is null (first-time user)
      sessionStorage.removeItem(BASELINE_TRACKING_KEY);
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
      className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-4">
        <AlertDescription className="flex-1 text-sm text-blue-900 dark:text-blue-100">
          Changes made to <strong>{totalCount}</strong>{" "}
          {totalCount === 1 ? "employee" : "employees"} since your last login
          on {formattedDate}. See highlighted fields below.
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

