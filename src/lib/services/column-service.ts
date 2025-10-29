import type {
  ColumnConfig,
  UpdateColumnPermissionsRequest,
  BulkUpdatePermissionsRequest,
  RolePermissions,
} from "@/lib/types/column-config";

export interface ColumnListResponse {
  data: ColumnConfig[];
}

export interface ColumnResponse {
  data: ColumnConfig;
}

/**
 * Column Service
 * Frontend service layer for column configuration management
 */
export const columnService = {
  /**
   * Get all column configurations with permissions
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
   */
  async updateColumnPermissions(
    id: string,
    permissions: UpdateColumnPermissionsRequest
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
   * Delete a custom column
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
};
