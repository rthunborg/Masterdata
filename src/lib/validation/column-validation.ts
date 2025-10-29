/**
 * Validation schemas for column configuration operations
 */

import { z } from "zod";

/**
 * Schema for creating a new custom column
 */
export const createCustomColumnSchema = z.object({
  column_name: z
    .string()
    .min(1, "Column name is required")
    .max(100, "Column name must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Column name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  column_type: z.enum(["text", "number", "date", "boolean"], {
    errorMap: () => ({ message: "Invalid column type" }),
  }),
  category: z.string().max(100).optional(),
});

/**
 * Type inference for create custom column input
 */
export type CreateCustomColumnInput = z.infer<typeof createCustomColumnSchema>;

/**
 * Schema for updating a column configuration
 */
export const updateColumnSchema = z.object({
  column_name: z
    .string()
    .min(1, "Column name is required")
    .max(100, "Column name must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Column name can only contain letters, numbers, spaces, hyphens, and underscores"
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
