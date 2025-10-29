/**
 * Real-time event types for Supabase real-time subscriptions
 */

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimePayload<T = Record<string, unknown>> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: RealtimeEventType;
  new: T | null;
  old: T | null;
  errors: string[] | null;
}

export interface RealtimeEvent<T = Record<string, unknown>> {
  eventType: RealtimeEventType;
  schema: string;
  table: string;
  old?: T;
  new?: T;
  timestamp: string;
}

export interface EmployeeRealtimeEvent extends RealtimeEvent {
  table: "employees";
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
}

export type RealtimeConnectionStatus = 
  | "connected" 
  | "connecting" 
  | "disconnected" 
  | "reconnecting";

export interface RealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  event?: RealtimeEventType | "*";
  filter?: string;
}
