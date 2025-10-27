import type { AuthError } from "@supabase/supabase-js";

export function mapSupabaseAuthError(error: AuthError | Error): string {
  const message = error.message.toLowerCase();

  // Handle Supabase-specific auth errors
  if (message.includes("invalid login credentials") || 
      message.includes("invalid email or password")) {
    return "Invalid email or password";
  }

  if (message.includes("email not confirmed")) {
    return "Please check your email and confirm your account";
  }

  if (message.includes("too many requests")) {
    return "Too many login attempts. Please try again later";
  }

  if (message.includes("signup is disabled")) {
    return "Account registration is currently disabled";
  }

  if (message.includes("email address is invalid")) {
    return "Please enter a valid email address";
  }

  if (message.includes("password is too short")) {
    return "Password must be at least 8 characters long";
  }

  if (message.includes("user not found")) {
    return "Invalid email or password";
  }

  if (message.includes("user already registered")) {
    return "An account with this email already exists";
  }

  // Default fallback
  return "Invalid email or password";
}

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  ACCOUNT_DEACTIVATED: "Account has been deactivated",
  USER_NOT_FOUND: "User account not found",
  VALIDATION_ERROR: "Please check your email format",
  NETWORK_ERROR: "Network error. Please check your connection and try again",
  INTERNAL_ERROR: "Something went wrong. Please try again",
  SESSION_EXPIRED: "Your session has expired. Please log in again",
  TOO_MANY_REQUESTS: "Too many login attempts. Please try again later",
} as const;

export function getErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code as keyof typeof AUTH_ERROR_MESSAGES] || AUTH_ERROR_MESSAGES.INTERNAL_ERROR;
}