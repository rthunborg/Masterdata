/**
 * Column Configuration Types
 * Defines the structure for column configurations and permissions in the HR Masterdata system.
 */

/**
 * Role-based permissions structure for a column
 */
export interface RolePermissions {
  [role: string]: {
    view: boolean;
    edit: boolean;
  };
}

/**
 * Column type enum - supported data types for columns
 */
export type ColumnType = 'text' | 'number' | 'date' | 'boolean';

/**
 * Column Configuration interface - represents a single column's metadata and permissions
 */
export interface ColumnConfig {
  id: string;
  column_name: string; // Display name (user-friendly)
  db_column_name: string; // Database column name (snake_case)
  column_type: ColumnType;
  role_permissions: RolePermissions;
  is_masterdata: boolean;
  category: string | null;
  category_color: string | null; // Hex color code (e.g., '#3B82F6') or null for no color
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Helper type for permission checks on a specific column for a specific role
 */
export interface ColumnPermission {
  canView: boolean;
  canEdit: boolean;
}

/**
 * Input type for creating a custom column
 */
export interface CreateCustomColumnInput {
  column_name: string; // Display name
  db_column_name: string; // Database column name
  column_type: ColumnType;
  category?: string;
  category_color?: string | null; // Hex color code for the category
}

/**
 * Custom column value - represents a single custom field value for an employee
 */
export interface CustomColumnValue {
  employee_id: string;
  column_name: string;
  value: string | number | boolean | null;
}

/**
 * External party data - represents all custom column data for a single employee in a party table
 */
export interface ExternalPartyData {
  id: string;
  employee_id: string;
  data: Record<string, string | number | boolean | null>; // JSONB: { columnName: value }
  created_at: string;
  updated_at: string;
}

/**
 * Request type for updating column permissions
 */
export interface UpdateColumnPermissionsRequest {
  role_permissions: RolePermissions;
}

/**
 * Request type for updating column configuration (permissions and/or category)
 */
export interface UpdateColumnConfigRequest {
  role_permissions?: RolePermissions;
  category?: string | null;
  category_color?: string | null; // Update category color
  column_name?: string; // Update display name
}

/**
 * Request type for bulk updating permissions across multiple columns/roles
 */
export interface BulkUpdatePermissionsRequest {
  column_ids: string[];
  roles: string[];
  permission_type: 'view' | 'edit';
  value: boolean;
}

/**
 * Request type for reordering columns
 */
export interface ReorderColumnsRequest {
  columns: Array<{
    id: string;
    display_order: number;
  }>;
}

/**
 * Request type for toggling column visibility
 */
export interface ToggleVisibilityRequest {
  is_visible: boolean;
}
