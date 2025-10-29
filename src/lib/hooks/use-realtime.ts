/**
 * Generic Supabase real-time subscription hook
 * Handles connection, subscription, and cleanup for real-time events
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
  const [status, setStatus] = useState<RealtimeConnectionStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const handleEvent = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
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
      setStatus("disconnected");
      return;
    }

    const supabase = supabaseRef.current;
    setStatus("connecting");

    // Create channel with unique name
    const channelName = `${schema}:${table}:${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Subscribe to postgres changes
    channel
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
        },
        handleEvent
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setStatus("connected");
          setError(null);
          reconnectAttempts.current = 0;
        } else if (status === "CHANNEL_ERROR") {
          setStatus("disconnected");
          setError(err || new Error("Channel subscription error"));
          
          // Attempt reconnection
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
            setStatus("reconnecting");
            
            setTimeout(() => {
              channel.subscribe();
            }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000));
          }
        } else if (status === "TIMED_OUT") {
          setStatus("disconnected");
          setError(new Error("Connection timed out"));
        } else if (status === "CLOSED") {
          setStatus("disconnected");
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
