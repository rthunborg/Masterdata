import { createClient } from "@/lib/supabase/server";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { UserRole } from "@/lib/types/user";

/**
 * Repository for column configuration data access
 */
export class ColumnConfigRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Fetch all column configurations
   */
  async findAll(): Promise<ColumnConfig[]> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("column_config")
        .select("*")
        .order("display_order", { ascending: true })
        .order("column_name", { ascending: true });

      if (error || !data) {
        console.error("Error fetching column configurations:", error);
        return [];
      }

      return data;
    } catch (error) {
      console.error("Unexpected error fetching column configurations:", error);
      return [];
    }
  }

  /**
   * Fetch specific column configuration by ID
   */
  async findById(id: string): Promise<ColumnConfig | null> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("column_config")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        if (error?.code === "PGRST116") {
          // Not found
          return null;
        }
        console.error("Error fetching column config by id:", id, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected error fetching column config by id:", id, error);
      return null;
    }
  }

  /**
   * Fetch columns visible to a specific role
   * Filters by role_permissions[role].view = true
   */
  async findByRole(role: UserRole): Promise<ColumnConfig[]> {
    try {
      // Fetch all columns and filter on client side
      // (JSONB filtering in PostgreSQL is complex; simpler to filter in code)
      const allColumns = await this.findAll();

      return allColumns.filter((column) => {
        const rolePerms = column.role_permissions[role];
        return rolePerms && rolePerms.view === true;
      });
    } catch (error) {
      console.error("Unexpected error fetching columns by role:", role, error);
      return [];
    }
  }

  /**
   * Create a new custom column
   * Only creates custom columns (is_masterdata = false)
   * - HR Admin: Creates with HR Admin having full access, other roles no access by default
   * - External parties: Creates with creating role having full access
   */
  async createCustomColumn(input: {
    column_name: string;
    column_type: "text" | "number" | "date" | "boolean";
    role: UserRole;
    category?: string;
    category_color?: string | null;
  }): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();

    // Check for duplicate column name
    const allColumns = await this.findAll();
    const duplicate = allColumns.find(
      (col) => col.column_name.toLowerCase() === input.column_name.toLowerCase()
    );

    if (duplicate) {
      throw new Error(`Column "${input.column_name}" already exists`);
    }

    // Create default role permissions
    // HR Admin always has view permission (required), edit can be modified later
    // Other roles default to no access
    const rolePermissions: Record<string, { view: boolean; edit: boolean }> = {
      hr_admin: { view: true, edit: true },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: false, edit: false },
      toplux: { view: false, edit: false },
    };

    // If created by external party, give them full access
    if (input.role !== 'hr_admin') {
      rolePermissions[input.role] = { view: true, edit: true };
    }

    // Create column config
    const columnData = {
      column_name: input.column_name,
      column_type: input.column_type,
      is_masterdata: false,
      category: input.category || null,
      category_color: input.category_color || null,
      role_permissions: rolePermissions,
    };

    const { data, error } = await supabase
      .from("column_config")
      .insert(columnData)
      .select()
      .single();

    if (error) {
      console.error("Error creating custom column:", error);
      throw new Error(`Failed to create column: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to create column: No data returned");
    }

    return data;
  }

  /**
   * Update a column configuration
   * Validates user has permission to edit the column based on role_permissions
   * 
   * @param id - Column ID to update
   * @param userId - User ID attempting the update
   * @param userRole - Role of the user attempting the update
   * @param updates - Partial column updates (column_name, category, category_color, etc.)
   * @returns Updated column configuration
   * @throws Error if user lacks permission or column not found
   */
  async updateColumn(
    id: string,
    userId: string,
    userRole: UserRole,
    updates: Partial<Pick<ColumnConfig, "column_name" | "category" | "category_color">>
  ): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();

    // Verify column exists and user has permission
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Column not found");
    }

    if (existing.is_masterdata) {
      throw new Error("Cannot update masterdata column via this endpoint");
    }

    // Check if user has edit permission for this column
    const rolePerms = existing.role_permissions[userRole];
    if (!rolePerms || !rolePerms.edit) {
      throw new Error("You do not have permission to edit this column");
    }

    // Only allow updating specific fields
    const safeUpdates: Partial<ColumnConfig> = {};
    if (updates.column_name !== undefined) {
      safeUpdates.column_name = updates.column_name;
    }
    if (updates.category !== undefined) {
      safeUpdates.category = updates.category;
    }
    if (updates.category_color !== undefined) {
      safeUpdates.category_color = updates.category_color;
    }

    const { data, error } = await supabase
      .from("column_config")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating column:", error);
      throw new Error(`Failed to update column: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to update column: No data returned");
    }

    return data;
  }

  /**
   * Delete a custom column
   * Only allows deleting custom columns (is_masterdata = false)
   */
  async deleteColumn(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Verify column exists and is not masterdata
    const column = await this.findById(id);

    if (!column) {
      throw new Error("Column not found");
    }

    if (column.is_masterdata) {
      throw new Error("Cannot delete masterdata column");
    }

    const { error } = await supabase.from("column_config").delete().eq("id", id);

    if (error) {
      console.error("Error deleting column:", error);
      throw new Error(`Failed to delete column: ${error.message}`);
    }
  }

  /**
   * Update display order for multiple columns
   * Used for drag-and-drop reordering
   */
  async updateDisplayOrder(
    columns: Array<{ id: string; display_order: number }>
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Update each column's display_order
    const updatePromises = columns.map(({ id, display_order }) =>
      supabase
        .from("column_config")
        .update({ display_order })
        .eq("id", id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Error updating display order:", errors);
      throw new Error("Failed to update column display order");
    }
  }

  /**
   * Toggle column visibility
   */
  async toggleVisibility(id: string, isVisible: boolean): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from("column_config")
      .update({ is_visible: isVisible })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling column visibility:", error);
      throw new Error(`Failed to toggle visibility: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to toggle visibility: No data returned");
    }

    return data;
  }
}

export const columnConfigRepository = new ColumnConfigRepository();
