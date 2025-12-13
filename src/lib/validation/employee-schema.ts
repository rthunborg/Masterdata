import { z } from "zod";
import { TOWN_DISTRICTS } from "@/lib/constants/options";

/**
 * Swedish SSN format validation
 * 
 * Accepts both formats:
 * - With space: YYMMDD XXXX or YYYYMMDD XXXX (e.g., 850315 1234 or 19850315 1234)
 */
const ssnRegex = /^(?:\d{10}|\d{12}|\d{6,8}[- ]\d{4})$/;

/**
 * Validation error messages
 * These can be overridden by providing a translation function
 * Default messages are in English
 */
export const validationMessages = {
  firstNameRequired: "errors.validation.firstNameRequired",
  firstNameMaxLength: "errors.validation.firstNameMaxLength",
  surnameRequired: "errors.validation.surnameRequired",
  surnameMaxLength: "errors.validation.surnameMaxLength",
  ssnRequired: "errors.validation.ssnRequired",
  ssnFormat: "errors.validation.ssnFormat",
  emailRequired: "errors.validation.emailRequired",
  emailInvalid: "errors.validation.emailInvalid",
  rankRequired: "errors.validation.rankRequired",
  rankInvalid: "errors.validation.rankInvalid",
  genderInvalid: "errors.validation.genderInvalid",
  hireDateRequired: "errors.validation.hireDateRequired",
  hireDateInvalid: "errors.validation.hireDateInvalid",
  hireDateFuture: "errors.validation.hireDateFuture",
  stenaDateRequired: "errors.validation.stenaDateRequired",
  omcDateRequired: "errors.validation.omcDateRequired",
  terminationDateRequired: "errors.validation.terminationDateRequired",
  terminationDateInvalid: "errors.validation.terminationDateInvalid",
  terminationReasonRequired: "errors.validation.terminationReasonRequired",
  terminationReasonMaxLength: "errors.validation.terminationReasonMaxLength",
  updateFieldRequired: "errors.validation.updateFieldRequired",
  dietDetailsRequired: "errors.validation.dietDetailsRequired",
};

/**
 * Create validation schema with custom error messages
 * @param t Optional translation function to override default English messages
 */
export function createEmployeeSchemaWithMessages(t?: (key: string) => string) {
  const msg = (key: keyof typeof validationMessages) =>
    t ? t(validationMessages[key]) : validationMessages[key];

  return z.object({
    first_name: z
      .string()
      .min(1, msg('firstNameRequired'))
      .max(100, msg('firstNameMaxLength')),
    surname: z
      .string()
      .min(1, msg('surnameRequired'))
      .max(100, msg('surnameMaxLength')),
    ssn: z
      .string()
      .min(1, msg('ssnRequired'))
      .regex(ssnRegex, msg('ssnFormat')),
    email: z
      .string()
      .email(msg('emailInvalid'))
      .optional()
      .nullable()
      .or(z.literal("")),
    mobile: z.string().nullable(),
    rank: z.enum(["SEV", "CHEF"], {
      errorMap: () => ({ message: msg('rankInvalid') })
    }).nullable(),
    gender: z
      .enum(["Man", "Woman"], {
        errorMap: () => ({ message: msg('genderInvalid') })
      })
      .nullable(),
    town_district: z.enum(TOWN_DISTRICTS, {
      errorMap: () => ({ message: "Invalid Town District" }) // Add translation key if needed
    }).nullable(),
    hire_date: z
      .string()
      .min(1, msg('hireDateRequired'))
      .refine((date) => {
        // Check if it's a valid date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) return false;

        const parsed = Date.parse(date);
        return !isNaN(parsed);
      }, msg('hireDateInvalid'))
      .refine((date) => {
        // Parse as UTC to avoid timezone issues
        const parsed = new Date(date + "T00:00:00.000Z");
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        return parsed <= today;
      }, msg('hireDateFuture')),
    stena_date: z.string().transform(val => val === "" ? null : val).nullable(),
    omc_date: z.string().transform(val => val === "" ? null : val).nullable(),
    pe3_date: z.string().nullable(),
    comments: z.string().nullable(),
    // New masterdata columns (Story 7.1) - Converted to boolean for completion tracking (Story 8.2)
    // All boolean fields default to false and are not nullable
    // Accept null values and transform them to false for backward compatibility
    one: z.boolean(),
    one_marked_at: z.string().datetime().nullable().optional(), // Story 8.3: Timestamp when One field was set to true
    talmundo: z.boolean(), // Story 8.4: Talmundo completion (editable only when One is green)
    isps: z.boolean(),
    photo: z.boolean(),
    origo: z.boolean(),
    loneiva: z
      .number()
      .int('Lönenivå must be a whole number')
      .min(0, 'Lönenivå must be at least 0')
      .max(7, 'Lönenivå must be at most 7')
      .nullable(),
    mail_lon: z.boolean(),
    bankuppgifter: z.boolean(),
    li: z.boolean(),
    passport: z.boolean(),
    kvitto_c17_18: z.boolean(),
    c17: z.boolean(),
    crewing_done: z.boolean(),
    // Story 8.20: ÖMC Room Assignment fields
    hotel_required: z.boolean(),
    room_number_shared: z.number().int().nullable().optional(),
    // System-managed fields with defaults
    is_terminated: z.boolean(),
    is_archived: z.boolean(),
    termination_date: z.string().nullable().optional(),
    termination_reason: z.string().nullable().optional(),

    // Story 8.13: Repayment tracking fields (read-only, auto-managed by termination workflow)
    repayment_needed_omc: z.boolean().nullable().optional(),
    repayment_needed_pe3: z.boolean().nullable().optional(),

    // Story 8.17: Dietary Requirements
    special_diet: z.boolean().default(false),
    diet_details: z.string().nullable().optional(),

    // Story 14.1: ÖMC Masterdata Reminder Notification
    omc_masterdata_reminder_sent_at: z.string().datetime().nullable(),
  }).refine(
    (data) => {
      // Story 8.17: Diet details are mandatory if special_diet is true
      if (data.special_diet && (!data.diet_details || data.diet_details.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: msg('dietDetailsRequired'),
      path: ["diet_details"],
    }
  );
}

/**
 * Default validation schema with English error messages
 * For backwards compatibility
 */
const baseEmployeeSchema = z.object({
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
    .optional()
    .nullable()
    .or(z.literal("")),
  mobile: z.string().nullable(),
  rank: z.enum(["SEV", "CHEF"], {
    errorMap: () => ({ message: "Rank must be SEV or CHEF" })
  }).nullable(),
  gender: z
    .enum(["Man", "Woman"], {
      errorMap: () => ({ message: "Gender must be Man or Woman" })
    })
    .nullable(),
  town_district: z.enum(TOWN_DISTRICTS, {
    errorMap: () => ({ message: "Invalid Town District" })
  }).nullable(),
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
  stena_date: z.string().transform(val => val === "" ? null : val).nullable(),
  omc_date: z.string().transform(val => val === "" ? null : val).nullable(),
  pe3_date: z.string().nullable(),
  comments: z.string().nullable(),
  // New masterdata columns (Story 7.1) - Converted to boolean for completion tracking (Story 8.2)
  // All boolean fields default to false and are not nullable
  // Accept null values and transform them to false for backward compatibility
  one: z.union([z.boolean(), z.null()]).transform(val => val ?? false).pipe(z.boolean()),
    one_marked_at: z.string().datetime().nullable().optional(), // Story 8.3: Timestamp when One field was set to true
    talmundo: z.boolean(), // Story 8.4: Talmundo completion (editable only when One is green)
    isps: z.boolean(),
    photo: z.boolean(),
    origo: z.boolean(),
  loneiva: z
    .number()
    .int('Lönenivå must be a whole number')
    .min(0, 'Lönenivå must be at least 0')
    .max(7, 'Lönenivå must be at most 7')
    .nullable(),
    mail_lon: z.boolean(),
    bankuppgifter: z.boolean(),
    li: z.boolean(),
    passport: z.boolean(),
    kvitto_c17_18: z.boolean(),
    c17: z.boolean(),
    crewing_done: z.boolean(),
    // Story 8.20: ÖMC Room Assignment fields
    hotel_required: z.boolean(),
  room_number_shared: z.number().int().nullable().optional(),
    // System-managed fields with defaults
    is_terminated: z.boolean(),
    is_archived: z.boolean(),
  termination_date: z.string().nullable().optional(),
  termination_reason: z.string().nullable().optional(),

  // Story 13.9: Repayment tracking fields (read-only, auto-managed by termination workflow)
  // Changed to boolean (flag only)
  repayment_needed_omc: z.boolean().nullable().optional(),
  repayment_needed_pe3: z.boolean().nullable().optional(),
  
  // Story 8.17: Dietary Requirements
  special_diet: z.boolean().default(false),
  diet_details: z.string().nullable().optional(),

  // Story 14.1: ÖMC Masterdata Reminder Notification
  omc_masterdata_reminder_sent_at: z.string().datetime().nullable(),
});

/**
 * Story 8.4: Talmundo validation helper function
 * Validates that Talmundo can only be true if One field is green (>= 24 hours)
 */
function validateTalmundoField(data: {
  talmundo?: boolean | null;
  one?: boolean | null;
  one_marked_at?: string | null;
}): boolean {
  // If talmundo is not true, no validation needed
  if (data.talmundo !== true) {
    return true;
  }

  // Check if One field is true
  if (!data.one) {
    return false;
  }

  // Check if one_marked_at timestamp exists and is >= 24 hours ago
  if (!data.one_marked_at) {
    return false;
  }

  try {
    const markedAt = new Date(data.one_marked_at);
    const now = new Date();
    const elapsed = now.getTime() - markedAt.getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // Talmundo can only be true if One field has been true for >= 24 hours
    return elapsed >= twentyFourHours;
  } catch {
    return false;
  }
}

export const createEmployeeSchema = baseEmployeeSchema.refine(
  validateTalmundoField,
  {
    message: 'Talmundo field cannot be set to true - One field must be completed for 24 hours first',
    path: ['talmundo'],
  }
).refine(
  (data) => {
    // Story 8.17: Diet details are mandatory if special_diet is true
    if (data.special_diet && (!data.diet_details || data.diet_details.trim() === '')) {
      return false;
    }
    return true;
  },
  {
    message: "Diet details are required when special diet is selected",
    path: ["diet_details"],
  }
);

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

/**
 * Validation schema for updating an existing employee record
 * All fields are optional to support partial updates
 * At least one field must be provided for the update
 */
export const updateEmployeeSchema = baseEmployeeSchema
  .partial()
  .refine(
    (data: Partial<z.infer<typeof baseEmployeeSchema>>) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided for update",
    }
  );
// Note: Talmundo validation is handled in the API route handler (PATCH /api/employees/[id])
// because it requires current employee data from the database to check the 24-hour rule

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

/**
 * Create update employee schema with custom error messages
 */
export function updateEmployeeSchemaWithMessages(t?: (key: string) => string) {
  const msg = (key: keyof typeof validationMessages) =>
    t ? t(validationMessages[key]) : validationMessages[key];

  return createEmployeeSchemaWithMessages(t)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: msg('updateFieldRequired'),
    });
}

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
 * Create terminate employee schema with custom error messages
 */
export function terminateEmployeeSchemaWithMessages(t?: (key: string) => string) {
  const msg = (key: keyof typeof validationMessages) =>
    t ? t(validationMessages[key]) : validationMessages[key];

  return z.object({
    termination_date: z
      .string()
      .min(1, msg('terminationDateRequired'))
      .refine((date) => {
        // Check if it's a valid date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) return false;

        const parsed = Date.parse(date);
        return !isNaN(parsed);
      }, msg('terminationDateInvalid')),
    termination_reason: z
      .string()
      .min(1, msg('terminationReasonRequired'))
      .max(500, msg('terminationReasonMaxLength')),
  });
}

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
    .union([
      z.string().email("Invalid email format"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable(),
  mobile: z.string().nullable().optional().or(z.literal("")),
  rank: z.enum(["SEV", "CHEF"], {
    errorMap: () => ({ message: "Rank must be SEV or CHEF" })
  }),
  gender: z
    .enum(["Man", "Woman"], {
      errorMap: () => ({ message: "Gender must be Man or Woman" })
    })
    .nullable()
    .optional()
    .or(z.literal("")),
  town_district: z.enum(TOWN_DISTRICTS).nullable().optional().or(z.literal("")),
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
  stena_date: z.string().nullable().optional().or(z.literal("")),
  omc_date: z.string().nullable().optional().or(z.literal("")),
  pe3_date: z.string().nullable().optional().or(z.literal("")),
  comments: z.string().nullable().optional().or(z.literal("")),
  // New masterdata columns (Story 7.1) - Converted to boolean for completion tracking (Story 8.2)
  // CSV import accepts string values and converts them to boolean
  one: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  one_marked_at: z.string().datetime().nullable().optional().or(z.literal("")), // Story 8.3: Timestamp when One field was set to true
  talmundo: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")), // Story 8.4: Talmundo completion
  isps: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  photo: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  origo: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  loneiva: z.union([z.number().int().min(0).max(7), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  mail_lon: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  bankuppgifter: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  li: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  passport: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  kvitto_c17_18: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  c17: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  crewing_done: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  // Story 8.20: ÖMC Room Assignment fields
  hotel_required: z.union([z.boolean(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  room_number_shared: z.union([z.number().int(), z.string(), z.null()]).nullable().optional().or(z.literal("")),
  // System-managed fields with defaults
  is_terminated: z.boolean().default(false).optional(),
  is_archived: z.boolean().default(false).optional(),
  termination_date: z.string().nullable().default(null).optional(),
  termination_reason: z.string().nullable().default(null).optional(),

  // Story 13.9: Repayment tracking fields (read-only, auto-managed by termination workflow)
  // Changed to boolean (flag only)
  repayment_needed_omc: z.union([z.boolean(), z.string(), z.null()]).nullable().default(null).optional(),
  repayment_needed_pe3: z.union([z.boolean(), z.string(), z.null()]).nullable().default(null).optional(),

  // Story 8.17: Dietary Requirements
  special_diet: z.union([z.boolean(), z.string(), z.null()]).nullable().default(false).optional(),
  diet_details: z.string().nullable().optional(),
});

export type CSVImportEmployeeInput = z.infer<typeof csvImportEmployeeSchema>;
