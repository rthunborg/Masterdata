import { z } from "zod";

export const createImportantDateSchema = z.object({
  week_number: z.number().int().min(1).max(53).nullable().default(null),
  year: z.number().int().min(2020).max(2100),
  category: z.enum(["Stena Dates", "ÖMC Dates", "Other"]),
  date_description: z.string().min(1, "Date description is required"),
  date_value: z.string().min(1, "Date value is required"),
  notes: z.string().nullable().default(null),
});

export const updateImportantDateSchema = z.object({
  week_number: z.number().int().min(1).max(53).nullable().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  category: z.enum(["Stena Dates", "ÖMC Dates", "Other"]).optional(),
  date_description: z.string().min(1, "Date description is required").optional(),
  date_value: z.string().min(1, "Date value is required").optional(),
  notes: z.string().nullable().optional(),
});
