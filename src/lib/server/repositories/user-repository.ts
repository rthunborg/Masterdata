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
        .select("id, email, role, is_active, created_at")
        .eq("auth_user_id", authUserId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role, is_active, created_at")
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
        .select("id, email, role, is_active, created_at")
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
}

export const userRepository = new UserRepository();