import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  auth_id: z.string(),
  email: z.string().email(),
  role: z.enum(["hr_admin", "sodexo", "omc", "payroll", "toplux"]),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type SessionUserSchema = z.infer<typeof sessionUserSchema>;