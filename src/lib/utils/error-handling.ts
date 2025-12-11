import type { AuthError } from "@supabase/supabase-js";

export function mapSupabaseAuthError(error: AuthError | Error): string {
  const message = error.message.toLowerCase();

  // Handle Supabase-specific auth errors
  if (message.includes("invalid login credentials") || 
      message.includes("invalid email or password")) {
    return "Ogiltig e-post eller lösenord";
  }

  if (message.includes("email not confirmed")) {
    return "Vänligen kontrollera din e-post och bekräfta ditt konto";
  }

  if (message.includes("too many requests")) {
    return "För många inloggningsförsök. Försök igen senare";
  }

  if (message.includes("signup is disabled")) {
    return "Kontoregistrering är för närvarande inaktiverad";
  }

  if (message.includes("email address is invalid")) {
    return "Vänligen ange en giltig e-postadress";
  }

  if (message.includes("password is too short")) {
    return "Lösenordet måste vara minst 8 tecken långt";
  }

  if (message.includes("user not found")) {
    return "Ogiltig e-post eller lösenord";
  }

  if (message.includes("user already registered")) {
    return "Ett konto med denna e-postadress finns redan";
  }

  // Default fallback
  return "Ogiltig e-post eller lösenord";
}

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Ogiltig e-post eller lösenord",
  ACCOUNT_DEACTIVATED: "Kontot har inaktiverats",
  USER_NOT_FOUND: "Användarkonto hittades inte",
  VALIDATION_ERROR: "Vänligen kontrollera e-postformatet",
  NETWORK_ERROR: "Nätverksfel. Kontrollera din anslutning och försök igen",
  INTERNAL_ERROR: "Något gick fel. Försök igen",
  SESSION_EXPIRED: "Din session har gått ut. Logga in igen",
  TOO_MANY_REQUESTS: "För många inloggningsförsök. Försök igen senare",
} as const;

export function getErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code as keyof typeof AUTH_ERROR_MESSAGES] || AUTH_ERROR_MESSAGES.INTERNAL_ERROR;
}
