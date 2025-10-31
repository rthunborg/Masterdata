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
  column_name: string;
  column_type: ColumnType;
  role_permissions: RolePermissions;
  is_masterdata: boolean;
  category: string | null;
  display_order: number;
  created_at: string;
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
  column_name: string;
  column_type: ColumnType;
  category?: string;
  display_order?: number;
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
  display_order?: number;
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
 * Request type for creating a new column (HR Admin only)
 */
export interface CreateColumnRequest {
  column_name: string;
  column_type: ColumnType;
  category?: string | null;
  display_order?: number;
}

/**
 * Request type for batch updating display order
 */
export interface UpdateDisplayOrderRequest {
  updates: Array<{
    id: string;
    display_order: number;
  }>;
}
