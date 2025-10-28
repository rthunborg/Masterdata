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
