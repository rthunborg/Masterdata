import type { ImportantDate } from "./important-date";

export interface APIResponse<T = unknown> {
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    auth_id: string;
    created_at: string;
    last_active_at: string | null;
  };
  session: {
    access_token: string;
    expires_at: string;
  };
}

export interface LogoutResponse {
  message: string;
}

export interface AvailablePE3Response {
  data: ImportantDate[];
  meta: {
    total: number;
    timestamp: string;
  };
}
