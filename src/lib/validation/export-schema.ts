import { z } from "zod";

const exportRoleSchema = z.enum([
  "hr_admin",
  "recruiter",
  "admin_limited",
  "crewing",
  "sodexo",
  "omc",
  "payroll",
  "toplux",
]);

export const employeeExportRequestSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1),
  fields: z.array(z.string().min(1)).min(1),
  impersonatedRole: exportRoleSchema.optional(),
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

export type EmployeeExportRequestInput = z.input<
  typeof employeeExportRequestSchema
>;
export type EmployeeExportRequest = z.infer<
  typeof employeeExportRequestSchema
>;
