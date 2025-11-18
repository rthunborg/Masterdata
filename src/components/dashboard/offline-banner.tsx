"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, AlertTriangle } from "lucide-react";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";

/**
 * Offline Banner Component
 * 
 * Displays a banner when the application is in offline mode
 * 
 * Story 12.3: Offline Support with Local Caching (AC: 1)
 */
export function OfflineBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null;
  }

  return (
    <Alert
      variant={isOnline && isSlowConnection ? "default" : "destructive"}
      className="rounded-none border-x-0 border-t-0 mb-0"
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <AlertDescription className="font-medium">
          {isOnline
            ? "Slow connection detected. Some features may be limited."
            : "Offline Mode - You are viewing cached data. Changes will sync when connection is restored."}
        </AlertDescription>
      </div>
    </Alert>
  );
}

