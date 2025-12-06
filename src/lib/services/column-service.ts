import type {
  ColumnConfig,
  UpdateColumnPermissionsRequest,
  UpdateColumnConfigRequest,
  BulkUpdatePermissionsRequest,
  RolePermissions,
  CreateCustomColumnInput,
} from "@/lib/types/column-config";
import type { UpdateColumnInput } from "@/lib/validation/column-validation";

export interface ColumnListResponse {
  data: ColumnConfig[];
}

export interface ColumnResponse {
  data: ColumnConfig;
}

/**
 * Unified Column Service
 * 
 * Consolidates column configuration management for both admin and user operations.
 * Handles:
 * - Admin operations: permissions, visibility, reordering, category management
 * - User operations: custom column CRUD
 * 
 * Story 15.2: Service consolidation - merged column-service.ts and column-config-service.ts
 */
export const columnService = {
  // ============================================
  // User Operations (Custom Column CRUD)
  // ============================================

  /**
   * Fetch all column configurations (user endpoint)
   * Returns all columns with full permission structure
   * @returns Array of column configurations
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

  // ============================================
  // Admin Operations (Permissions & Management)
  // ============================================

  /**
   * Get all column configurations with permissions (admin endpoint)
   * @returns Array of column configurations
   */
  async getAllColumns(): Promise<ColumnConfig[]> {
    const response = await fetch("/api/admin/columns");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch columns");
    }

    const json: ColumnListResponse = await response.json();
    return json.data;
  },

  /**
   * Update permissions for a specific column
   * @param id - Column ID
   * @param permissions - Permission update request
   * @returns Updated column configuration
   */
  async updateColumnPermissions(
    id: string,
    permissions: UpdateColumnPermissionsRequest | UpdateColumnConfigRequest
  ): Promise<ColumnConfig> {
    const response = await fetch(`/api/admin/columns/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(permissions),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || "Failed to update column permissions"
      );
    }

    const json: ColumnResponse = await response.json();
    return json.data;
  },

  /**
   * Bulk update permissions for multiple columns/roles
   * @param request - Bulk update request with column IDs, roles, and permission values
   */
  async bulkUpdatePermissions(
    request: BulkUpdatePermissionsRequest
  ): Promise<void> {
    // For MVP, implement bulk updates by making individual update calls
    // This can be optimized with a dedicated bulk endpoint in the future
    const { column_ids, roles, permission_type, value } = request;

    // Fetch all columns to get current permissions
    const columns = await this.getAllColumns();

    // Update each column
    const updatePromises = column_ids.map(async (columnId) => {
      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      // Build updated permissions
      const updatedPermissions = { ...column.role_permissions };

      for (const role of roles) {
        if (!updatedPermissions[role]) {
          updatedPermissions[role] = { view: false, edit: false };
        }

        if (permission_type === "edit") {
          updatedPermissions[role].edit = value;
          // If enabling edit, also enable view
          if (value) {
            updatedPermissions[role].view = true;
          }
        } else {
          updatedPermissions[role].view = value;
          // If disabling view, also disable edit
          if (!value) {
            updatedPermissions[role].edit = false;
          }
        }
      }

      await this.updateColumnPermissions(columnId, {
        role_permissions: updatedPermissions,
      });
    });

    await Promise.all(updatePromises);
  },

  /**
   * Delete a custom column (admin endpoint)
   * @param id - Column ID to delete
   * @throws Error if deletion fails or column is masterdata
   */
  async deleteColumn(id: string): Promise<void> {
    const response = await fetch(`/api/admin/columns/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to delete column");
    }
  },

  /**
   * Delete a custom column (user endpoint)
   * External party users can only delete columns they own (have edit permission for)
   * @param id - Column ID to delete
   * @throws Error if deletion fails, column is masterdata, or user doesn't have permission
   */
  async deleteCustomColumn(id: string): Promise<void> {
    const response = await fetch(`/api/columns/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to delete column");
    }
  },

  /**
   * Hide a column by setting all role permissions to view=false
   * @param id - Column ID to hide
   * @returns Updated column configuration
   */
  async hideColumn(id: string): Promise<ColumnConfig> {
    // Set all role permissions view=false and edit=false
    const hiddenPermissions: RolePermissions = {
      hr_admin: { view: false, edit: false },
      sodexo: { view: false, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      toplux: { view: false, edit: false },
    };

    return this.updateColumnPermissions(id, {
      role_permissions: hiddenPermissions,
    });
  },

  /**
   * Unhide a column by restoring original permissions
   * @param id - Column ID to unhide
   * @param originalPermissions - Original role permissions to restore
   * @returns Updated column configuration
   */
  async unhideColumn(
    id: string,
    originalPermissions: RolePermissions
  ): Promise<ColumnConfig> {
    return this.updateColumnPermissions(id, {
      role_permissions: originalPermissions,
    });
  },

  /**
   * Reorder columns by updating display_order values
   * @param columns - Array of column IDs and their new display_order values
   */
  async reorderColumns(
    columns: Array<{ id: string; display_order: number }>
  ): Promise<void> {
    const response = await fetch("/api/admin/columns/reorder", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ columns }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to reorder columns");
    }
  },

  /**
   * Toggle column visibility
   * @param id - Column ID
   * @param isVisible - New visibility state
   * @returns Updated column configuration
   */
  async toggleVisibility(id: string, isVisible: boolean): Promise<ColumnConfig> {
    const response = await fetch(`/api/admin/columns/${id}/toggle-visibility`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_visible: isVisible }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to toggle visibility");
    }

    const json: ColumnResponse = await response.json();
    return json.data;
  },

  /**
   * Update category color for all columns in a category
   * @param categoryName - Name of the category to update
   * @param color - Hex color code (e.g., "#3B82F6") or null to remove color
   * @returns Response with affected column IDs
   */
  async updateCategoryColor(
    categoryName: string,
    color: string | null
  ): Promise<{ category: string; color: string | null; affected_columns: string[]; updated_count: number }> {
    const response = await fetch(`/api/admin/categories/${encodeURIComponent(categoryName)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ color }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to update category color");
    }

    const json = await response.json();
    return json.data;
  },
};
