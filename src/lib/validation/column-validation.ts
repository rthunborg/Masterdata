import { z } from "zod";

/**
 * Validation schema for creating a new column
 * Used by HR Admin to add custom columns to the system
 */
export const createColumnSchema = z.object({
  column_name: z
    .string()
    .trim()
    .min(1, "Column name is required")
    .max(100, "Column name must be less than 100 characters"),
  
  column_type: z.enum(["text", "number", "date", "boolean"], {
    errorMap: () => ({ message: "Invalid column type" }),
  }),
  
  category: z
    .string()
    .max(50, "Category must be less than 50 characters")
    .trim()
    .nullable()
    .optional(),
  
  display_order: z.number().int().positive().optional(),
});

export type CreateColumnFormData = z.infer<typeof createColumnSchema>;

/**
 * Validation schema for creating a custom column by external party users
 * Similar to createColumnSchema but without display_order (auto-assigned)
 */
export const createCustomColumnSchema = z.object({
  column_name: z
    .string()
    .trim()
    .min(1, "Column name is required")
    .max(100, "Column name must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Column name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  
  column_type: z.enum(["text", "number", "date", "boolean"], {
    errorMap: () => ({ message: "Invalid column type" }),
  }),
  
  category: z
    .string()
    .max(50, "Category must be less than 50 characters")
    .trim()
    .nullable()
    .optional(),
});

export type CreateCustomColumnFormData = z.infer<typeof createCustomColumnSchema>;

