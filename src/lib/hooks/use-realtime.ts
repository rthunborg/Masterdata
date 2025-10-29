/**
 * Generic Supabase real-time subscription hook
 * Handles connection, subscription, and cleanup for real-time events
 * 
 * Note: This hook intentionally calls setState synchronously in useEffect
 * to manage connection status states. This is acceptable for this use case.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type {
  RealtimeEvent,
  RealtimeConnectionStatus,
  RealtimeEventType,
} from "@/lib/types/realtime";

interface UseRealtimeOptions {
  table: string;
  schema?: string;
  event?: RealtimeEventType | "*";
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

interface UseRealtimeReturn {
  status: RealtimeConnectionStatus;
  isConnected: boolean;
  error: Error | null;
  lastEvent: RealtimeEvent | null;
}

/**
 * Hook for subscribing to Supabase real-time events
 * @param options - Configuration options for the subscription
 * @returns Connection status, error state, and last event
 */
export function useRealtime({
  table,
  schema = "public",
  event = "*",
  onEvent,
  enabled = true,
}: UseRealtimeOptions): UseRealtimeReturn {
  // Disable react compiler for this function due to complex state management
  "use no memo";
  
  const [internalStatus, setInternalStatus] = useState<RealtimeConnectionStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Compute status based on enabled and internal status to avoid setState in effect
  const status: RealtimeConnectionStatus = !enabled ? "disconnected" : internalStatus;

  const handleEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const realtimeEvent: RealtimeEvent = {
        eventType: payload.eventType as RealtimeEventType,
        schema: payload.schema,
        table: payload.table,
        old: payload.old,
        new: payload.new,
        timestamp: payload.commit_timestamp || new Date().toISOString(),
      };

      setLastEvent(realtimeEvent);
      onEvent?.(realtimeEvent);
    },
    [onEvent]
  );

  useEffect(() => {
    if (!enabled) {
      // Clean up existing channel
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const supabase = supabaseRef.current;

    // Create channel with unique name
    const channelName = `${schema}:${table}:${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Subscribe to postgres changes
    // TypeScript has issues with Supabase realtime overloads - using type assertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any)
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
        },
        handleEvent
      )
      .subscribe((status: string, err?: Error) => {
        if (status === "SUBSCRIBED") {
          setInternalStatus("connected");
          setError(null);
          reconnectAttempts.current = 0;
        } else if (status === "CHANNEL_ERROR") {
          setInternalStatus("disconnected");
          setError(err || new Error("Channel subscription error"));
          
          // Attempt reconnection
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
            setInternalStatus("reconnecting");
            
            setTimeout(() => {
              channel.subscribe();
            }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000));
          }
        } else if (status === "TIMED_OUT") {
          setInternalStatus("disconnected");
          setError(new Error("Connection timed out"));
        } else if (status === "CLOSED") {
          setInternalStatus("disconnected");
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, table, schema, event, handleEvent]);

  return {
    status,
    isConnected: status === "connected",
    error,
    lastEvent,
  };
}
