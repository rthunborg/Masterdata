import { z } from "zod";

/**
 * Swedish SSN format validation: YYYYMMDD-XXXX or YYMMDD-XXXX
 * Example: 19850315-1234 or 850315-1234
 */
const ssnRegex = /^\d{6,8}-\d{4}$/;

/**
 * Validation schema for creating a new employee record
 * Used in both frontend form validation and backend API validation
 */
export const createEmployeeSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  surname: z
    .string()
    .min(1, "Surname is required")
    .max(100, "Surname must be less than 100 characters"),
  ssn: z
    .string()
    .min(1, "SSN is required")
    .regex(ssnRegex, "SSN must be in format YYYYMMDD-XXXX or YYMMDD-XXXX"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  mobile: z.string().nullable().default(null),
  rank: z.string().nullable().default(null),
  gender: z
    .enum(["Male", "Female", "Other", "Prefer not to say"])
    .nullable()
    .default(null),
  town_district: z.string().nullable().default(null),
  hire_date: z
    .string()
    .min(1, "Hire date is required")
    .refine((date) => {
      // Check if it's a valid date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) return false;
      
      const parsed = Date.parse(date);
      return !isNaN(parsed);
    }, "Invalid date format")
    .refine((date) => {
      // Parse as UTC to avoid timezone issues
      const parsed = new Date(date + "T00:00:00.000Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return parsed <= today;
    }, "Hire date cannot be in the future"),
  comments: z.string().nullable().default(null),
  // System-managed fields with defaults
  is_terminated: z.boolean().default(false),
  is_archived: z.boolean().default(false),
  termination_date: z.string().nullable().default(null),
  termination_reason: z.string().nullable().default(null),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

/**
 * Validation schema for updating an existing employee record
 * All fields are optional to support partial updates
 * At least one field must be provided for the update
 */
export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

/**
 * Validation schema for terminating an employee
 * Both termination date and reason are required
 */
export const terminateEmployeeSchema = z.object({
  termination_date: z
    .string()
    .min(1, "Termination date is required")
    .refine((date) => {
      // Check if it's a valid date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) return false;
      
      const parsed = Date.parse(date);
      return !isNaN(parsed);
    }, "Invalid date format"),
  termination_reason: z
    .string()
    .min(1, "Termination reason is required")
    .max(500, "Termination reason must be 500 characters or less"),
});

export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;

/**
 * Validation schema for CSV import employee data
 * Email is optional (nullable) for CSV import unlike create form
 * Used for validating each row during CSV import
 */
export const csvImportEmployeeSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  surname: z
    .string()
    .min(1, "Surname is required")
    .max(100, "Surname must be less than 100 characters"),
  ssn: z
    .string()
    .min(1, "SSN is required")
    .regex(ssnRegex, "SSN must be in format YYYYMMDD-XXXX or YYMMDD-XXXX"),
  email: z
    .string()
    .email("Invalid email format")
    .nullable()
    .optional()
    .or(z.literal("")),
  mobile: z.string().nullable().optional().or(z.literal("")),
  rank: z.string().nullable().optional().or(z.literal("")),
  gender: z
    .enum(["Male", "Female", "Other", "Prefer not to say"])
    .nullable()
    .optional()
    .or(z.literal("")),
  town_district: z.string().nullable().optional().or(z.literal("")),
  hire_date: z
    .string()
    .min(1, "Hire date is required")
    .refine((date) => {
      // Check if it's a valid date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) return false;
      
      const parsed = Date.parse(date);
      return !isNaN(parsed);
    }, "Invalid date format. Must be YYYY-MM-DD")
    .refine((date) => {
      // Parse as UTC to avoid timezone issues
      const parsed = new Date(date + "T00:00:00.000Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return parsed <= today;
    }, "Hire date cannot be in the future"),
  comments: z.string().nullable().optional().or(z.literal("")),
  // System-managed fields with defaults
  is_terminated: z.boolean().default(false).optional(),
  is_archived: z.boolean().default(false).optional(),
  termination_date: z.string().nullable().default(null).optional(),
  termination_reason: z.string().nullable().default(null).optional(),
});

export type CSVImportEmployeeInput = z.infer<typeof csvImportEmployeeSchema>;
