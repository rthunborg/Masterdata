/**
 * Validation schemas for column configuration operations
 * Updated for Story 9.3: Real table columns architecture
 */

import { z } from "zod";

/**
 * Helper function to convert display name to database column name
 * Converts to lowercase snake_case suitable for PostgreSQL column names
 * 
 * Examples:
 *   "Meal Plan" -> "meal_plan"
 *   "OMC Training Status" -> "omc_training_status"
 *   "Room Number (Shared)" -> "room_number_shared"
 */
export function toSnakeCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, ''); // Trim leading/trailing underscores
}

/**
 * Validates that a string is a valid PostgreSQL column name (snake_case)
 */
const dbColumnNameRegex = /^[a-z][a-z0-9_]*[a-z0-9]$/;

/**
 * Schema for creating a new custom column
 * Note: column_name is now enforced as snake_case for database compatibility
 */
export const createCustomColumnSchema = z.object({
  column_name: z
    .string()
    .min(1, "Column name is required")
    .max(63, "Column name must be less than 63 characters (PostgreSQL limit)")
    .regex(
      dbColumnNameRegex,
      "Column name must be lowercase snake_case (e.g., 'meal_plan', 'training_status'). Only letters, numbers, and underscores allowed."
    )
    .refine(
      (name) => {
        // Reserved PostgreSQL keywords that should not be used as column names
        const reservedWords = ['user', 'group', 'order', 'table', 'column', 'select', 'insert', 'update', 'delete', 'where', 'from'];
        return !reservedWords.includes(name.toLowerCase());
      },
      "Column name cannot be a SQL reserved word"
    ),
  column_type: z.enum(["text", "number", "date", "boolean"], {
    errorMap: () => ({ message: "Invalid column type" }),
  }),
  category: z.string().max(100).optional(),
  category_color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color format (use #RGB or #RRGGBB)")
    .nullable()
    .optional(),
});

/**
 * Type inference for create custom column input
 */
export type CreateCustomColumnInput = z.infer<typeof createCustomColumnSchema>;

/**
 * Schema for updating a column configuration
 * Note: Column renaming requires database migration, so this is rarely used
 */
export const updateColumnSchema = z.object({
  column_name: z
    .string()
    .min(1, "Column name is required")
    .max(63, "Column name must be less than 63 characters (PostgreSQL limit)")
    .regex(
      dbColumnNameRegex,
      "Column name must be lowercase snake_case. Only letters, numbers, and underscores allowed."
    )
    .optional(),
  column_type: z.enum(["text", "number", "date", "boolean"]).optional(),
  category: z.string().max(100).optional(),
});

/**
 * Type inference for update column input
 */
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;

/**
 * Schema for updating custom column data values
 * Validates that values are Record<string, primitive types>
 */
export const updateCustomDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

/**
 * Type inference for custom data update
 */
export type UpdateCustomDataInput = z.infer<typeof updateCustomDataSchema>;

/**
 * Schema for individual role permission
 */
const rolePermissionSchema = z
  .object({
    view: z.boolean(),
    edit: z.boolean(),
  })
  .refine((data) => !data.edit || data.view, {
    message: "Edit permission requires View permission",
  });

/**
 * Schema for updating column permissions
 */
export const updateColumnPermissionsSchema = z.object({
  role_permissions: z.record(z.string(), rolePermissionSchema),
});

/**
 * Type inference for update column permissions
 */
export type UpdateColumnPermissionsInput = z.infer<
  typeof updateColumnPermissionsSchema
>;

/**
 * Schema for updating column configuration (permissions and/or category)
 */
export const updateColumnConfigSchema = z.object({
  role_permissions: z.record(z.string(), rolePermissionSchema).optional(),
  category: z.string().max(100).nullable().optional(),
  category_color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color format (use #RGB or #RRGGBB)")
    .nullable()
    .optional(),
});

/**
 * Type inference for update column config
 */
export type UpdateColumnConfigInput = z.infer<
  typeof updateColumnConfigSchema
>;

/**
 * Schema for bulk permission updates
 */
export const bulkUpdatePermissionsSchema = z.object({
  column_ids: z.array(z.string().uuid()),
  roles: z.array(
    z.enum(["hr_admin", "sodexo", "omc", "payroll", "toplux"])
  ),
  permission_type: z.enum(["view", "edit"]),
  value: z.boolean(),
});

/**
 * Type inference for bulk permission updates
 */
export type BulkUpdatePermissionsInput = z.infer<
  typeof bulkUpdatePermissionsSchema
>;
