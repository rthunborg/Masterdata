import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/types/user";

class AuthService {
  private supabase = createClient();

  async login(email: string, password: string): Promise<SessionUser> {
    try {
      // Call API route instead of direct Supabase client
      // This bypasses network-level blocks (like Cisco Umbrella) since API is same-origin
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || "Invalid email or password";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const userData = result.data?.user;

      if (!userData) {
        throw new Error("Invalid email or password");
      }

      // Return user data (previous_last_active_at not needed for API-based login)
      return {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        is_active: userData.is_active,
        auth_id: userData.id,
        created_at: userData.created_at,
        last_active_at: userData.last_active_at,
      } as SessionUser;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw new Error("Failed to log out");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to log out");
    }
  }

  async getCurrentUser(): Promise<SessionUser | null> {
    try {
      // Use API route instead of direct database query to avoid RLS issues
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });

      if (!response.ok) {
        // 401/403/404 are expected when not authenticated or inactive
        if ([401, 403, 404].includes(response.status)) {
          return null;
        }
        
        // Log unexpected errors
        console.error(
          "[AuthService] Failed to get current user:",
          response.status,
          response.statusText
        );
        return null;
      }

      const userData = await response.json();
      return userData as SessionUser;
    } catch (error) {
      console.error("[AuthService] Error in getCurrentUser:", error);
      return null;
    }
  }

  private mapSupabaseAuthError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes("invalid login credentials") || 
        lowerMessage.includes("invalid email or password")) {
      return "Invalid email or password";
    }
    
    if (lowerMessage.includes("email not confirmed")) {
      return "Please check your email and confirm your account";
    }
    
    if (lowerMessage.includes("too many requests")) {
      return "Too many login attempts. Please try again later";
    }
    
    return "Invalid email or password";
  }
}

export const authService = new AuthService();