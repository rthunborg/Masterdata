import { z } from "zod";
import { UserRole } from "@/lib/types/user";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([
    UserRole.HR_ADMIN,
    UserRole.SODEXO,
    UserRole.OMC,
    UserRole.PAYROLL,
    UserRole.TOPLUX,
  ], { 
    errorMap: () => ({ message: "Invalid role" }) 
  }),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  is_active: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
