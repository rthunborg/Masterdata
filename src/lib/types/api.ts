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
  };
  session: {
    access_token: string;
    expires_at: string;
  };
}

export interface LogoutResponse {
  message: string;
}