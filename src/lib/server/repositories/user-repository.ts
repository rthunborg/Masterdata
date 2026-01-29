import { createClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types/user";

export class UserRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  async findByAuthId(authUserId: string): Promise<User | null> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role, is_active, created_at, last_active_at")
        .eq("auth_user_id", authUserId)
        .single();

      if (error || !data) {
        if (error) {
          console.error('[UserRepository.findByAuthId] Query failed:', {
            auth_user_id: authUserId,
            error: {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            },
          });
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('[UserRepository.findByAuthId] Unexpected error:', error);
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role, is_active, created_at, last_active_at")
        .eq("id", id)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  async isUserActive(authUserId: string): Promise<boolean> {
    try {
      const user = await this.findByAuthId(authUserId);
      return user?.is_active ?? false;
    } catch {
      return false;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role, is_active, created_at, last_active_at")
        .order("created_at", { ascending: false });

      if (error || !data) {
        return [];
      }

      return data;
    } catch {
      return [];
    }
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<boolean> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { error } = await supabase
        .from("users")
        .update({ is_active: isActive })
        .eq("id", id);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Updates the last_active_at timestamp for a user
   * Used by middleware for activity tracking
   * Fire-and-forget pattern - errors are caught silently
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient();
      
      await supabase
        .from("users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", userId);
      
      // Silently succeed or fail - activity tracking shouldn't break requests
    } catch (error) {
      // Log error but don't throw - this is fire-and-forget
      console.error('Failed to update user activity:', error);
    }
  }
}

export const userRepository = new UserRepository();