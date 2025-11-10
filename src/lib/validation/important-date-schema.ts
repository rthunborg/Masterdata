import { z } from "zod";
import { parseOMCDateInput } from "@/lib/utils/omc-date-formatter";

export const createImportantDateSchema = z.object({
  week_number: z.number().int().min(1).max(53).nullable().default(null),
  year: z.number().int().min(2020).max(2100),
  category: z.enum(["Stena Dates", "ÖMC Dates", "PE3 Dates", "Other"]),
  date_description: z.string().optional().default(""),
  date_value: z.string().min(1, "Date value is required"),
  notes: z.string().nullable().default(null),
  // Story 8.7: Capacity management fields
  max_spots: z.number().int().min(1).default(99),
  remaining_spots: z.number().int().min(0).default(99),
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
);

export const updateImportantDateSchema = z.object({
  week_number: z.number().int().min(1).max(53).nullable().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  category: z.enum(["Stena Dates", "ÖMC Dates", "PE3 Dates", "Other"]).optional(),
  date_description: z.string().optional(),
  date_value: z.string().min(1, "Date value is required").optional(),
  notes: z.string().nullable().optional(),
  // Story 8.7: Capacity management fields
  max_spots: z.number().int().min(1).optional(),
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
);

