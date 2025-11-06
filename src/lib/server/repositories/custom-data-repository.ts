import { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types/user";

/**
 * Repository for managing custom column data in party-specific tables
 * Handles CRUD operations for sodexo_data, omc_data, payroll_data, toplux_data
 */
export class CustomDataRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Map user role to corresponding party data table name
   */
  private getTableName(role: UserRole): string {
    const tableMap: Record<string, string> = {
      sodexo: "sodexo_data",
      omc: "omc_data",
      payroll: "payroll_data",
      toplux: "toplux_data",
    };

    const tableName = tableMap[role];
    if (!tableName) {
      throw new Error(`No custom data table found for role: ${role}`);
    }

    return tableName;
  }

  /**
   * Get custom column data for a specific employee
   * @param employeeId - Employee UUID
   * @param role - User role to determine which table to query
   * @returns Object containing custom column data (JSONB)
   */
  async getCustomData(
    employeeId: string,
    role: UserRole
  ): Promise<Record<string, string | number | boolean | null>> {
    const table = this.getTableName(role);

    const { data, error } = await this.supabase
      .from(table)
      .select("data")
      .eq("employee_id", employeeId)
      .single();

    if (error) {
      // PGRST116 = no rows returned (employee has no custom data yet)
      if (error.code === "PGRST116") {
        return {};
      }
      throw new Error(`Failed to fetch custom data: ${error.message}`);
    }

    return (data?.data as Record<string, string | number | boolean | null>) || {};
  }

  /**
   * Get all custom column data for a specific employee from all party tables
   * Used by HR Admin to view all custom data
   * @param employeeId - Employee UUID
   * @returns Merged object containing custom column data from all tables
   */
  async getAllCustomDataForEmployee(
    employeeId: string
  ): Promise<Record<string, string | number | boolean | null>> {
    const tables = ["sodexo_data", "omc_data", "payroll_data", "toplux_data"];
    const allData: Record<string, string | number | boolean | null> = {};

    for (const table of tables) {
      const { data, error } = await this.supabase
        .from(table)
        .select("data")
        .eq("employee_id", employeeId)
        .single();

      if (!error && data?.data) {
        // Merge data from this table
        Object.assign(allData, data.data);
      }
    }

    return allData;
  }

  /**
   * Update custom column data for a specific employee
   * Creates new record if none exists, otherwise updates existing JSONB data
   * @param employeeId - Employee UUID
   * @param role - User role to determine which table to update
   * @param updates - Object containing column name-value pairs to update
   */
  async updateCustomData(
    employeeId: string,
    role: UserRole,
    updates: Record<string, string | number | boolean | null>
  ): Promise<void> {
    const table = this.getTableName(role);

    // Check if record exists
    const { data: existing } = await this.supabase
      .from(table)
      .select("id, data")
      .eq("employee_id", employeeId)
      .single();

    if (!existing) {
      // Insert new record with employee_id and initial data
      const { error: insertError } = await this.supabase.from(table).insert({
        employee_id: employeeId,
        data: updates,
      });

      if (insertError) {
        throw new Error(`Failed to create custom data: ${insertError.message}`);
      }
    } else {
      // Update existing record - merge new values into existing JSONB
      const mergedData = { 
        ...(existing.data as Record<string, string | number | boolean | null>), 
        ...updates 
      };

      const { error: updateError } = await this.supabase
        .from(table)
        .update({ 
          data: mergedData, 
          updated_at: new Date().toISOString() 
        })
        .eq("employee_id", employeeId);

      if (updateError) {
        throw new Error(`Failed to update custom data: ${updateError.message}`);
      }
    }
  }

  /**
   * Update custom column data for HR Admin across all party tables
   * Updates the data in all party tables where the column might exist
   * @param employeeId - Employee UUID
   * @param updates - Object containing column name-value pairs to update
   */
  async updateCustomDataForAllParties(
    employeeId: string,
    updates: Record<string, string | number | boolean | null>
  ): Promise<void> {
    const tables = ["sodexo_data", "omc_data", "payroll_data", "toplux_data"];
    
    // Update each table that has existing data for this employee
    for (const table of tables) {
      const { data: existing } = await this.supabase
        .from(table)
        .select("id, data")
        .eq("employee_id", employeeId)
        .single();

      if (!existing) {
        // Insert new record if it doesn't exist
        const { error: insertError } = await this.supabase.from(table).insert({
          employee_id: employeeId,
          data: updates,
        });

        // Ignore errors for tables where we don't have permission (should not happen with migration)
        if (insertError) {
          console.warn(`Failed to insert into ${table}:`, insertError.message);
        }
      } else {
        // Update existing record - merge new values
        const mergedData = { 
          ...(existing.data as Record<string, string | number | boolean | null>), 
          ...updates 
        };

        const { error: updateError } = await this.supabase
          .from(table)
          .update({ 
            data: mergedData, 
            updated_at: new Date().toISOString() 
          })
          .eq("employee_id", employeeId);

        // Ignore errors for tables where we don't have permission (should not happen with migration)
        if (updateError) {
          console.warn(`Failed to update ${table}:`, updateError.message);
        }
      }
    }
  }

  /**
   * Delete specific columns from custom data
   * @param employeeId - Employee UUID
   * @param role - User role to determine which table to update
   * @param columnNames - Array of column names to delete
   */
  async deleteCustomColumns(
    employeeId: string,
    role: UserRole,
    columnNames: string[]
  ): Promise<void> {
    const table = this.getTableName(role);

    // Get existing data
    const { data: existing } = await this.supabase
      .from(table)
      .select("id, data")
      .eq("employee_id", employeeId)
      .single();

    if (!existing) {
      // No data to delete
      return;
    }

    // Remove specified columns from JSONB
    const updatedData = { ...(existing.data as Record<string, unknown>) };
    columnNames.forEach((col) => delete updatedData[col]);

    // Update record with modified data
    const { error } = await this.supabase
      .from(table)
      .update({ 
        data: updatedData, 
        updated_at: new Date().toISOString() 
      })
      .eq("employee_id", employeeId);

    if (error) {
      throw new Error(`Failed to delete custom columns: ${error.message}`);
    }
  }
}
