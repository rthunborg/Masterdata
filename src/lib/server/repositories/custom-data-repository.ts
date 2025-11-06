import { SupabaseClient } from "@supabase/supabase-js";
import type { ColumnConfig } from "@/lib/types/column-config";

/**
 * Repository for managing custom column data as real table columns
 * Updated for Story 9.3: Real table columns architecture
 * 
 * Custom columns are now implemented as real columns on the employees table,
 * not as JSONB key-value pairs. This provides better performance, type safety,
 * and native database features (indexing, constraints).
 */
export class CustomDataRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get custom column definitions from column_config table
   * Filters to only custom columns (is_masterdata = false)
   */
  private async getCustomColumnDefinitions(): Promise<ColumnConfig[]> {
    const { data, error } = await this.supabase
      .from("column_config")
      .select("*")
      .eq("is_masterdata", false)
      .order("display_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch column definitions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get custom column data for a specific employee
   * Dynamically selects columns based on column_config definitions
   * 
   * @param employeeId - Employee UUID
   * @param visibleColumns - Optional array of columns visible to the user (for role-based filtering)
   * @returns Object containing custom column data (column_name -> value)
   */
  async getCustomData(
    employeeId: string,
    visibleColumns?: ColumnConfig[]
  ): Promise<Record<string, string | number | boolean | null>> {
    // Get column definitions if not provided
    const columns = visibleColumns || (await this.getCustomColumnDefinitions());
    
    if (columns.length === 0) {
      return {}; // No custom columns defined
    }

    // Build SELECT query with all custom column names
    const columnNames = columns.map((col) => col.column_name);
    const selectQuery = `id, ${columnNames.join(", ")}`;

    const { data, error } = await this.supabase
      .from("employees")
      .select(selectQuery)
      .eq("id", employeeId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch custom data: ${error.message}`);
    }

    if (!data) {
      return {};
    }

    // Extract only custom column values (exclude 'id')
    const customData: Record<string, string | number | boolean | null> = {};
    columnNames.forEach((colName) => {
      const value = (data as unknown as Record<string, unknown>)[colName];
      customData[colName] = value as string | number | boolean | null;
    });

    return customData;
  }

  /**
   * Update custom column data for a specific employee
   * Updates real table columns directly (no JSONB merging needed)
   * 
   * @param employeeId - Employee UUID
   * @param updates - Object containing column name-value pairs to update
   *                  Column names must match real database column names
   */
  async updateCustomData(
    employeeId: string,
    updates: Record<string, string | number | boolean | null>
  ): Promise<void> {
    // Verify that all column names being updated are valid custom columns
    const customColumns = await this.getCustomColumnDefinitions();
    const validColumnNames = new Set(customColumns.map((col) => col.column_name));

    const invalidColumns = Object.keys(updates).filter(
      (col) => !validColumnNames.has(col)
    );

    if (invalidColumns.length > 0) {
      throw new Error(
        `Invalid custom columns: ${invalidColumns.join(", ")}. ` +
          `These columns do not exist in column_config.`
      );
    }

    // Update real table columns directly
    const { error } = await this.supabase
      .from("employees")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId);

    if (error) {
      throw new Error(`Failed to update custom data: ${error.message}`);
    }
  }

  /**
   * Delete specific custom column values for an employee
   * Sets column values to NULL (does not drop the columns themselves)
   * 
   * Note: To permanently remove a column from the database, use a migration.
   * 
   * @param employeeId - Employee UUID
   * @param columnNames - Array of column names to clear (set to NULL)
   */
  async deleteCustomColumns(
    employeeId: string,
    columnNames: string[]
  ): Promise<void> {
    // Verify columns exist
    const customColumns = await this.getCustomColumnDefinitions();
    const validColumnNames = new Set(customColumns.map((col) => col.column_name));

    const invalidColumns = columnNames.filter(
      (col) => !validColumnNames.has(col)
    );

    if (invalidColumns.length > 0) {
      throw new Error(
        `Invalid custom columns: ${invalidColumns.join(", ")}. ` +
          `These columns do not exist in column_config.`
      );
    }

    // Build update object with NULL values for specified columns
    const updates: Record<string, null> = {};
    columnNames.forEach((col) => {
      updates[col] = null;
    });

    const { error } = await this.supabase
      .from("employees")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId);

    if (error) {
      throw new Error(`Failed to delete custom columns: ${error.message}`);
    }
  }

  /**
   * Get all custom columns with data for multiple employees
   * Useful for bulk operations or table views
   * 
   * @param employeeIds - Array of employee UUIDs
   * @param visibleColumns - Optional array of columns visible to the user
   * @returns Array of employee records with custom column data
   */
  async getCustomDataBulk(
    employeeIds: string[],
    visibleColumns?: ColumnConfig[]
  ): Promise<Array<Record<string, string | number | boolean | null>>> {
    const columns = visibleColumns || (await this.getCustomColumnDefinitions());
    
    if (columns.length === 0 || employeeIds.length === 0) {
      return [];
    }

    const columnNames = columns.map((col) => col.column_name);
    const selectQuery = `id, ${columnNames.join(", ")}`;

    const { data, error } = await this.supabase
      .from("employees")
      .select(selectQuery)
      .in("id", employeeIds);

    if (error) {
      throw new Error(`Failed to fetch bulk custom data: ${error.message}`);
    }

    return (data || []) as unknown as Array<Record<string, string | number | boolean | null>>;
  }
}
