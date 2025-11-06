import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repository for managing custom column data in employees.custom_data JSONB column
 * Simplified architecture after consolidating party-specific tables
 */
export class CustomDataRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get custom column data for a specific employee
   * @param employeeId - Employee UUID
   * @returns Object containing custom column data from employees.custom_data JSONB
   */
  async getCustomData(
    employeeId: string
  ): Promise<Record<string, string | number | boolean | null>> {
    const { data, error } = await this.supabase
      .from("employees")
      .select("custom_data")
      .eq("id", employeeId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch custom data: ${error.message}`);
    }

    return (data?.custom_data as Record<string, string | number | boolean | null>) || {};
  }

  /**
   * Update custom column data for a specific employee
   * Creates new record if custom_data is empty, otherwise merges with existing JSONB data
   * @param employeeId - Employee UUID
   * @param updates - Object containing column name-value pairs to update
   */
  async updateCustomData(
    employeeId: string,
    updates: Record<string, string | number | boolean | null>
  ): Promise<void> {
    // Get existing custom data
    const { data: existing, error: selectError } = await this.supabase
      .from("employees")
      .select("custom_data")
      .eq("id", employeeId)
      .single();

    if (selectError) {
      throw new Error(`Failed to fetch existing custom data: ${selectError.message}`);
    }

    // Merge new values with existing data
    const mergedData = { 
      ...(existing.custom_data as Record<string, string | number | boolean | null> || {}), 
      ...updates 
    };

    // Update the custom_data column
    const { error: updateError } = await this.supabase
      .from("employees")
      .update({ 
        custom_data: mergedData,
        updated_at: new Date().toISOString() 
      })
      .eq("id", employeeId);

    if (updateError) {
      throw new Error(`Failed to update custom data: ${updateError.message}`);
    }
  }

  /**
   * Delete specific columns from custom data
   * @param employeeId - Employee UUID
   * @param columnNames - Array of column names to delete
   */
  async deleteCustomColumns(
    employeeId: string,
    columnNames: string[]
  ): Promise<void> {
    // Get existing data
    const { data: existing, error: selectError } = await this.supabase
      .from("employees")
      .select("custom_data")
      .eq("id", employeeId)
      .single();

    if (selectError) {
      throw new Error(`Failed to fetch existing custom data: ${selectError.message}`);
    }

    // Remove specified columns from JSONB
    const updatedData = { ...(existing.custom_data as Record<string, unknown> || {}) };
    columnNames.forEach((col) => delete updatedData[col]);

    // Update record with modified data
    const { error: updateError } = await this.supabase
      .from("employees")
      .update({ 
        custom_data: updatedData,
        updated_at: new Date().toISOString() 
      })
      .eq("id", employeeId);

    if (updateError) {
      throw new Error(`Failed to delete custom columns: ${updateError.message}`);
    }
  }
}
