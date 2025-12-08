import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/types/user";

class AuthService {
  private supabase = createClient();

  async login(email: string, password: string): Promise<SessionUser> {
    try {
      // Call Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(this.mapSupabaseAuthError(authError.message));
      }

      if (!authData.user) {
        throw new Error("Invalid email or password");
      }

      // Get user record from users table with role
      // IMPORTANT: Fetch BEFORE updating last_active_at so we can use the previous value as baseline
      const { data: userData, error: userError } = await this.supabase
        .from("users")
        .select("id, email, role, is_active, created_at, last_active_at")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (userError) {
        throw new Error("Failed to retrieve user information");
      }

      if (!userData.is_active) {
        throw new Error("Account has been deactivated");
      }

      // Store the PREVIOUS last_active_at before updating it
      // This will be used as the baseline for change detection
      const previousLastActiveAt = userData.last_active_at;

      // Update last_active_at immediately on login (regardless of 5-minute rule)
      // This ensures the timestamp is always current when user logs in
      // Use fire-and-forget pattern - don't block login if update fails
      try {
        await this.supabase
          .from("users")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", userData.id);
      } catch (error) {
        // Silently fail - login should succeed even if activity update fails
        console.error('[AuthService] Failed to update last_active_at on login:', error);
      }

      // Fetch updated user data to include the new last_active_at timestamp
      const { data: updatedUserData } = await this.supabase
        .from("users")
        .select("id, email, role, is_active, created_at, last_active_at")
        .eq("id", userData.id)
        .single();

      const finalUserData = updatedUserData || userData;
      
      // Store previous last_active_at in a custom property for change detection
      // The hook will use this as the baseline instead of the new last_active_at
      // Type assertion needed because SessionUser doesn't include this temporary property
      if (!authData.user) {
        throw new Error("Invalid email or password");
      }
      
      return {
        ...finalUserData,
        auth_id: authData.user.id,
        previous_last_active_at: previousLastActiveAt,
      } as SessionUser & { previous_last_active_at?: string | null };
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
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return null;
      }

      // Get user record from users table
      const { data: userData, error: userError } = await this.supabase
        .from("users")
        .select("id, email, role, is_active, created_at, last_active_at")
        .eq("auth_user_id", session.user.id)
        .single();

      if (userError || !userData) {
        return null;
      }

      if (!userData.is_active) {
        return null;
      }

      return {
        ...userData,
        auth_id: session.user.id,
      };
    } catch {
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