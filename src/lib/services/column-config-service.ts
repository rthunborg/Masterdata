import type { ColumnConfig, CreateCustomColumnInput } from "@/lib/types/column-config";
import type { UpdateColumnInput } from "@/lib/validation/column-validation";

/**
 * Frontend service for column configuration operations
 */
export const columnConfigService = {
  /**
   * Fetch all column configurations
   * Returns all columns with full permission structure
   */
  async getAll(): Promise<ColumnConfig[]> {
    const response = await fetch("/api/columns");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch column configurations");
    }

    const json = await response.json();
    return json.data;
  },

  /**
   * Create a new custom column
   * @param data - Column data including name, type, and optional category
   * @returns The created column configuration
   */
  async createCustomColumn(data: CreateCustomColumnInput): Promise<ColumnConfig> {
    const response = await fetch("/api/columns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to create column");
    }

    const json = await response.json();
    return json.data;
  },

  /**
   * Update an existing custom column
   * @param id - Column ID to update
   * @param data - Updated column data (name, category)
   * @returns The updated column configuration
   */
  async updateCustomColumn(id: string, data: UpdateColumnInput): Promise<ColumnConfig> {
    const response = await fetch(`/api/columns/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to update column");
    }

    const json = await response.json();
    return json.data;
  },
};
