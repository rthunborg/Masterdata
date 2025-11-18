"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { offlineCacheService } from "@/lib/services/offline-cache";

const CACHE_WARNING_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Cache Expiration Warning Component
 * 
 * Displays a warning when cached data is older than 24 hours
 * 
 * Story 12.3: Offline Support with Local Caching (AC: 5)
 */
export function CacheExpirationWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  useEffect(() => {
    const checkCacheAge = async () => {
      const age = await offlineCacheService.getCacheAge();
      setCacheAge(age);
      
      if (age !== null && age > CACHE_WARNING_THRESHOLD) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    checkCacheAge();
    // Check every minute
    const interval = setInterval(checkCacheAge, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!showWarning || cacheAge === null) {
    return null;
  }

  const hoursOld = Math.floor(cacheAge / (60 * 60 * 1000));

  return (
    <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="font-medium text-yellow-800">
          Data may be outdated. Cache is {hoursOld} hour{hoursOld !== 1 ? "s" : ""} old. Connect to refresh.
        </AlertDescription>
      </div>
    </Alert>
  );
}

