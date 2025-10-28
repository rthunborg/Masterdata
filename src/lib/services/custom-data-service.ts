/**
 * Frontend service for custom column data operations
 * Handles CRUD operations for employee custom column values in party-specific tables
 */

export const customDataService = {
  /**
   * Update custom column data for a specific employee
   * @param employeeId - Employee UUID
   * @param data - Object containing column name-value pairs to update
   * @returns Promise that resolves when update is complete
   */
  async updateCustomData(
    employeeId: string,
    data: Record<string, string | number | boolean | null>
  ): Promise<void> {
    const response = await fetch(`/api/employees/${employeeId}/custom-data`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle validation errors
      if (response.status === 400 && error.error?.code === "VALIDATION_ERROR") {
        throw new Error(error.error.message);
      }

      // Handle forbidden errors
      if (response.status === 403) {
        throw new Error("You do not have permission to update this data");
      }

      // Handle not found errors
      if (response.status === 404) {
        throw new Error("Employee not found");
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to update custom data");
    }
  },

  /**
   * Get custom column data for a specific employee
   * @param employeeId - Employee UUID
   * @returns Promise resolving to custom data object
   */
  async getCustomData(
    employeeId: string
  ): Promise<Record<string, string | number | boolean | null>> {
    const response = await fetch(`/api/employees/${employeeId}/custom-data`);

    if (!response.ok) {
      // Return empty object if not found (no custom data yet)
      if (response.status === 404) {
        return {};
      }

      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch custom data");
    }

    const json = await response.json();
    return json.data.columns || {};
  },
};
