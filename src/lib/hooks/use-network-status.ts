"use client";

import { useState, useEffect, useCallback } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType?: string;
}

/**
 * Hook to monitor network connectivity status
 * Uses both navigator.onLine and Network Information API when available
 * 
 * Story 12.3: Offline Support with Local Caching
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(false);
  const [connectionType, setConnectionType] = useState<string | undefined>();

  const updateNetworkStatus = useCallback(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    // Basic online/offline status
    const online = navigator.onLine;
    setIsOnline(online);

    // Network Information API (if available)
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      const saveData = connection.saveData;

      setConnectionType(effectiveType || connection.type || "unknown");

      // Consider slow if 2G or slow-2g, or if save-data mode is enabled
      const isSlow =
        effectiveType === "slow-2g" ||
        effectiveType === "2g" ||
        (effectiveType === "3g" && downlink && downlink < 1.5) ||
        saveData === true;

      setIsSlowConnection(isSlow);
    } else {
      // Fallback: assume connection is not slow if we can't detect it
      setIsSlowConnection(false);
      setConnectionType(undefined);
    }
  }, []);

  useEffect(() => {
    // Initial check
    updateNetworkStatus();

    // Listen for online/offline events
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    // Listen for connection changes (Network Information API)
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);

      if (connection) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return {
    isOnline,
    isSlowConnection,
    connectionType,
  };
}

