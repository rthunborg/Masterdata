import { z } from "zod";
import { DATE_CATEGORIES } from "@/lib/types/important-date";
import { parseOMCDateInput } from "@/lib/utils/omc-date-formatter";
import { validateTimeFormat } from "@/lib/utils/time-formatter";
import { validateDeadlines } from "@/lib/utils/deadline-validator";
import { getDefaultMaxCapacity } from "@/lib/services/date-capacity";

export const createImportantDateSchema = z.object({
  week_number: z.number().int().min(1).max(53).nullable(),
  year: z.number().int().min(2020).max(2100),
  category: z.enum(DATE_CATEGORIES),
  date_description: z.string(),
  date_value: z.string().min(1, "Date value is required"),
  time_value: z.string().nullable().optional(),
  deadline_submit: z.string().nullable().optional(),
  deadline_cancel: z.string().nullable().optional(),
  notes: z.string().nullable(),
  // Story 8.7: Capacity management fields (0 means unlimited/not tracked)
  // Defaults are set based on category in the transform below
  max_spots: z.number().int().min(0).optional(),
  remaining_spots: z.number().int().min(0).optional(),
})
.transform((data) => {
  // Set default max_spots and remaining_spots based on category if not provided
  const defaultMaxCapacity = getDefaultMaxCapacity(data.category);
  return {
    ...data,
    max_spots: data.max_spots ?? defaultMaxCapacity,
    remaining_spots: data.remaining_spots ?? defaultMaxCapacity,
  };
})
.refine(
  (data) => {
    // Validate ÖMC dates are consecutive two-day ranges
    if (data.category === 'ÖMC Dates') {
      const parsed = parseOMCDateInput(data.date_value);
      return parsed !== null;
    }
    return true;
  },
  {
    message: 'ÖMC-datum måste vara giltiga två på varandra följande dagar (t.ex. "8-9/3", "8-9 mars")',
    path: ['date_value'],
  }
)
.superRefine((data, ctx) => {
  // PE3 dates require time field validation
  if (data.category === 'PE3 Dates') {
    // Check if time_value is null, undefined, or empty string
    if (data.time_value === null || data.time_value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Time is required for PE3 dates',
        path: ['time_value'],
      });
      return;
    }
    
    // Check if time_value is a non-empty string
    if (typeof data.time_value === 'string') {
      if (data.time_value.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Time is required for PE3 dates',
          path: ['time_value'],
        });
        return;
      }
      
      // Validate time format
      const result = validateTimeFormat(data.time_value);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tid måste vara i format HH:MM (00:00 - 23:59)',
          path: ['time_value'],
        });
        return;
      }
    } else {
      // time_value is not a string and not null/undefined - invalid type
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Time is required for PE3 dates',
        path: ['time_value'],
      });
      return;
    }
  } else {
    // For other categories, validate time format if provided
    if (data.time_value && typeof data.time_value === 'string' && data.time_value.trim() !== '') {
      const result = validateTimeFormat(data.time_value);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tid måste vara i format HH:MM (00:00 - 23:59)',
          path: ['time_value'],
        });
      }
    }
  }
})
.refine(
  (data) => {
    // Validate deadline constraints
    const result = validateDeadlines(
      data.deadline_submit || null,
      data.deadline_cancel || null,
      data.date_value
    );
    return result.valid;
  },
  (data) => {
    const result = validateDeadlines(
      data.deadline_submit || null,
      data.deadline_cancel || null,
      data.date_value
    );
    return {
      message: result.error || 'Ogiltiga deadlines',
      path: ['deadline_submit'],
    };
  }
);

export const updateImportantDateSchema = z.object({
  week_number: z.number().int().min(1).max(53).nullable().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  category: z.enum(DATE_CATEGORIES).optional(),
  date_description: z.string().optional(),
  date_value: z.string().min(1, "Date value is required").optional(),
  time_value: z.string().nullable().optional(),
  deadline_submit: z.string().nullable().optional(),
  deadline_cancel: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // Story 8.7: Capacity management fields (0 means unlimited/not tracked)
  max_spots: z.number().int().min(0).optional(),
  remaining_spots: z.number().int().min(0).optional(),
})
.refine(
  (data) => {
    // Validate ÖMC dates are consecutive two-day ranges (only if both category and date_value are provided)
    if (data.category === 'ÖMC Dates' && data.date_value) {
      const parsed = parseOMCDateInput(data.date_value);
      return parsed !== null;
    }
    return true;
  },
  {
    message: 'ÖMC-datum måste vara giltiga två på varandra följande dagar (t.ex. "8-9/3", "8-9 mars")',
    path: ['date_value'],
  }
)
.refine(
  (data) => {
    // PE3 dates require time field - if category is PE3 Dates, time_value must be provided and valid
    if (data.category === 'PE3 Dates') {
      // If time_value is undefined, it means it wasn't provided in the update
      // This is invalid for PE3 dates - they must have a time
      if (data.time_value === undefined) {
        return false;
      }
      // Reject null or empty string
      if (data.time_value === null || (typeof data.time_value === 'string' && data.time_value.trim() === '')) {
        return false;
      }
      // Validate format if provided
      if (data.time_value && typeof data.time_value === 'string') {
        const result = validateTimeFormat(data.time_value);
        return result.valid;
      }
      return false;
    }
    // For other categories, validate time format if provided
    if (data.time_value && typeof data.time_value === 'string' && data.time_value.trim() !== '') {
      const result = validateTimeFormat(data.time_value);
      return result.valid;
    }
    return true;
  },
  (data) => {
    // PE3 dates require time
    if (data.category === 'PE3 Dates') {
      // If time_value is undefined, it means it wasn't provided in the update
      // This is invalid for PE3 dates - they must have a time
      if (data.time_value === undefined) {
        return {
          message: 'Time is required for PE3 dates',
          path: ['time_value'],
        };
      }
      // Check if time_value is null or empty
      if (data.time_value === null || (typeof data.time_value === 'string' && data.time_value.trim() === '')) {
        return {
          message: 'Time is required for PE3 dates',
          path: ['time_value'],
        };
      }
      // Validate format if provided
      if (data.time_value && typeof data.time_value === 'string') {
        const result = validateTimeFormat(data.time_value);
        if (!result.valid) {
          return {
            message: 'Tid måste vara i format HH:MM (00:00 - 23:59)',
            path: ['time_value'],
          };
        }
      }
    }
    // For other categories, validate format if provided
    if (data.time_value && typeof data.time_value === 'string' && data.time_value.trim() !== '') {
      const result = validateTimeFormat(data.time_value);
      if (!result.valid) {
        return {
          message: 'Tid måste vara i format HH:MM (00:00 - 23:59)',
          path: ['time_value'],
        };
      }
    }
    // Return empty error if validation passes (shouldn't reach here)
    return {
      message: '',
      path: ['time_value'],
    };
  }
)
.refine(
  (data) => {
    // Validate deadline constraints (only if date_value is provided)
    if (data.date_value) {
      const result = validateDeadlines(
        data.deadline_submit || null,
        data.deadline_cancel || null,
        data.date_value
      );
      return result.valid;
    }
    return true;
  },
  (data) => {
    if (data.date_value) {
      const result = validateDeadlines(
        data.deadline_submit || null,
        data.deadline_cancel || null,
        data.date_value
      );
      return {
        message: result.error || 'Ogiltiga deadlines',
        path: ['deadline_submit'],
      };
    }
    return {
      message: '',
      path: ['deadline_submit'],
    };
  }
)
.refine(
  (data) => {
    // Validate remaining_spots <= max_spots when both are provided
    if (data.max_spots !== undefined && data.remaining_spots !== undefined) {
      return data.remaining_spots <= data.max_spots;
    }
    return true;
  },
  {
    message: 'Remaining spots cannot exceed max spots',
    path: ['remaining_spots'],
  }
);

