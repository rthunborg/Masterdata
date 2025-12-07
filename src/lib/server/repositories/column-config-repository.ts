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
   * Can create custom columns (is_masterdata = false) or masterdata columns (is_masterdata = true)
   * - HR Admin: Creates with HR Admin having full access, other roles no access by default
   * - External parties: Creates with creating role having full access
   * 
   * Automatically creates the actual database column in the employees table
   */
  async createCustomColumn(input: {
    column_name: string; // Display name
    db_column_name: string; // Database column name
    column_type: "text" | "number" | "date" | "boolean";
    is_masterdata: boolean; // Whether this is a masterdata column
    role: UserRole;
    category?: string;
    category_color?: string | null;
  }): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();

    // Check for duplicate db_column_name
    const allColumns = await this.findAll();
    const duplicate = allColumns.find(
      (col) => col.db_column_name.toLowerCase() === input.db_column_name.toLowerCase()
    );

    if (duplicate) {
      throw new Error(`Column with database name "${input.db_column_name}" already exists`);
    }

    // Map column type to SQL type
    const sqlTypeMap: Record<string, string> = {
      text: "TEXT",
      number: "NUMERIC(20,2)",
      date: "DATE",
      boolean: "BOOLEAN",
    };
    const sqlType = sqlTypeMap[input.column_type];

    // Step 1: Create the actual database column in the employees table
    // Use the add_custom_column_to_employees database function
    const { error: alterError } = await supabase.rpc('add_custom_column_to_employees', { 
      column_name_param: input.db_column_name,
      column_type_param: sqlType
    });

    if (alterError) {
      console.error("Error creating database column:", alterError);
      throw new Error(`Failed to create database column: ${alterError.message}`);
    }

    // Step 2: Create default role permissions
    // Only the creating role gets permissions by default
    // HR Admin can add themselves later via column settings if needed
    const rolePermissions: Record<string, { view: boolean; edit: boolean }> = {
      hr_admin: { view: false, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: false, edit: false },
      toplux: { view: false, edit: false },
    };

    // Give the creating role full access
    rolePermissions[input.role] = { view: true, edit: true };

    // Step 3: Create column config entry
    const columnData = {
      column_name: input.column_name,
      db_column_name: input.db_column_name,
      column_type: input.column_type,
      is_masterdata: input.is_masterdata,
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
      console.error("Error creating custom column config:", error);
      throw new Error(`Failed to create column config: ${error.message}`);
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

    // Determine the category to use for shared color updates
    // Use the new category if provided, otherwise use the existing category
    const targetCategory = updates.category !== undefined ? updates.category : existing.category;

    // If category_color is being updated and we have a category, update all columns with that category
    // (AC4: "the color is applied to all columns sharing that category")
    if (updates.category_color !== undefined && targetCategory) {
      // First, find all columns with the same category that the user has edit permission for
      const allColumns = await this.findAll();
      const columnsToUpdate = allColumns.filter((col) => {
        // Only update custom columns (not masterdata)
        if (col.is_masterdata) return false;
        
        // Only update columns with the same category (the target category after update)
        if (col.category !== targetCategory) return false;
        
        // Only update columns the user has edit permission for
        const colRolePerms = col.role_permissions[userRole];
        if (!colRolePerms || !colRolePerms.edit) return false;
        
        return true;
      });

      // Always include the original column in the update (it might be changing category)
      const columnIdsToUpdate = columnsToUpdate
        .map((col) => col.id)
        .filter((colId) => colId !== id); // Remove original if already in list
      
      // Add the original column ID to ensure it's updated
      columnIdsToUpdate.push(id);
      
      if (columnIdsToUpdate.length > 0) {
        // Update all columns with the same category (including the original column)
        // First update category_color for all matching columns
        const { error: bulkError } = await supabase
          .from("column_config")
          .update({ category_color: updates.category_color })
          .in("id", columnIdsToUpdate);

        if (bulkError) {
          console.error("Error updating category color for multiple columns:", bulkError);
          throw new Error(`Failed to update category color: ${bulkError.message}`);
        }
      }

      // Now apply other updates (column_name, category) to the original column if needed
      const otherUpdates: Partial<ColumnConfig> = {};
      if (updates.column_name !== undefined) {
        otherUpdates.column_name = updates.column_name;
      }
      if (updates.category !== undefined) {
        otherUpdates.category = updates.category;
      }

      // If we have other updates, apply them to the original column
      if (Object.keys(otherUpdates).length > 0) {
        const { data: finalData, error: finalError } = await supabase
          .from("column_config")
          .update(otherUpdates)
          .eq("id", id)
          .select()
          .single();

        if (finalError) {
          console.error("Error applying other updates:", finalError);
          throw new Error(`Failed to update column: ${finalError.message}`);
        }

        if (!finalData) {
          throw new Error("Failed to update column: No data returned");
        }

        return finalData;
      }

      // If no other updates, just fetch and return the updated original column
      const { data, error } = await supabase
        .from("column_config")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching updated column:", error);
        throw new Error(`Failed to fetch updated column: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to fetch updated column: No data returned");
      }

      return data;
    }

    // If not updating category_color with a category, or if no category exists, update only the single column
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
   * For external users: Only allows deleting columns they have edit permission for (ownership check)
   * For HR Admin: Can delete any custom column
   */
  async deleteColumn(id: string, userId: string, userRole: UserRole): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Verify column exists and is not masterdata
    const column = await this.findById(id);

    if (!column) {
      throw new Error("Column not found");
    }

    if (column.is_masterdata) {
      throw new Error("Cannot delete masterdata column");
    }

    // For external users, check ownership (must have edit permission)
    if (userRole !== "hr_admin") {
      const rolePerms = column.role_permissions[userRole];
      if (!rolePerms || !rolePerms.edit) {
        throw new Error("You do not have permission to delete this column");
      }
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

    // If setting column as inactive, clear all permissions
    const updateData: { is_visible: boolean; role_permissions?: Record<string, { view: boolean; edit: boolean }> } = {
      is_visible: isVisible
    };

    if (!isVisible) {
      // When deactivating, set all permissions to false
      updateData.role_permissions = {
        hr_admin: { view: false, edit: false },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false }
      };
    }

    const { data, error } = await supabase
      .from("column_config")
      .update(updateData)
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
