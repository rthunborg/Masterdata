export enum UserRole {
  HR_ADMIN = "hr_admin",
  SODEXO = "sodexo",
  OMC = "omc",
  PAYROLL = "payroll",
  TOPLUX = "toplux",
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface SessionUser extends User {
  auth_id: string;
}
