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
        .order("display_order", { ascending: true });

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
   * Create a new custom column for an external party
   * Only creates custom columns (is_masterdata = false)
   */
  async createCustomColumn(input: {
    column_name: string;
    column_type: "text" | "number" | "date" | "boolean";
    role: UserRole;
    category?: string;
    display_order?: number;
  }): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();

    // Check for duplicate column name for this role
    const existingColumns = await this.findByRole(input.role);
    const duplicate = existingColumns.find(
      (col) => col.column_name.toLowerCase() === input.column_name.toLowerCase()
    );

    if (duplicate) {
      throw new Error(`Column "${input.column_name}" already exists for this role`);
    }

    // Auto-assign display_order if not provided
    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const allColumns = await this.findAll();
      const maxOrder = Math.max(...allColumns.map(c => c.display_order || 0), 0);
      displayOrder = maxOrder + 1;
    }

    // Create column config with single-role permissions
    const columnData = {
      column_name: input.column_name,
      column_type: input.column_type,
      is_masterdata: false,
      category: input.category || null,
      display_order: displayOrder,
      role_permissions: {
        [input.role]: { view: true, edit: true },
      },
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
   * @param updates - Partial column updates (column_name, category, etc.)
   * @returns Updated column configuration
   * @throws Error if user lacks permission or column not found
   */
  async updateColumn(
    id: string,
    userId: string,
    userRole: UserRole,
    updates: Partial<Pick<ColumnConfig, "column_name" | "category">>
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
   * Create a new column (HR Admin only)
   * Creates custom columns with default permissions
   */
  async create(input: {
    column_name: string;
    column_type: "text" | "number" | "date" | "boolean";
    category?: string | null;
    display_order?: number;
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

    // Auto-assign display_order if not provided
    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const maxOrder = Math.max(...allColumns.map(c => c.display_order || 0), 0);
      displayOrder = maxOrder + 1;
    }

    // Default permissions: HR Admin can view+edit, all external parties cannot
    const defaultPermissions = {
      hr_admin: { view: true, edit: true },
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
    };

    const columnData = {
      column_name: input.column_name,
      column_type: input.column_type,
      is_masterdata: false,
      category: input.category || null,
      display_order: displayOrder,
      role_permissions: defaultPermissions,
    };

    const { data, error } = await supabase
      .from("column_config")
      .insert(columnData)
      .select()
      .single();

    if (error) {
      console.error("Error creating column:", error);
      throw new Error(`Failed to create column: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to create column: No data returned");
    }

    return data;
  }

  /**
   * Update display order for a single column
   */
  async updateDisplayOrder(id: string, newOrder: number): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from("column_config")
      .update({ display_order: newOrder })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating display order:", error);
      throw new Error(`Failed to update display order: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to update display order: No data returned");
    }

    return data;
  }

  /**
   * Batch update display orders for multiple columns
   * Used for drag-and-drop reordering
   */
  async batchUpdateDisplayOrders(
    updates: Array<{ id: string; display_order: number }>
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Execute updates in parallel
    const updatePromises = updates.map(({ id, display_order }) =>
      supabase
        .from("column_config")
        .update({ display_order })
        .eq("id", id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error("Error in batch update:", errors);
      throw new Error("Failed to update column order");
    }
  }

  /**
   * Find column by name (case-insensitive)
   */
  async findByName(name: string): Promise<ColumnConfig | null> {
    const allColumns = await this.findAll();
    return allColumns.find(
      (col) => col.column_name.toLowerCase() === name.toLowerCase()
    ) || null;
  }
}

export const columnConfigRepository = new ColumnConfigRepository();
