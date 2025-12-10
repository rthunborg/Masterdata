import { UserRole } from "@/lib/types/user";

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.HR_ADMIN: return "HR Superuser";
    case UserRole.RECRUITER: return "Recruiter";
    case UserRole.CREWING: return "Crewing";
    case UserRole.SODEXO: return "Sodexo";
    case UserRole.OMC: return "ÖMC";
    case UserRole.PAYROLL: return "Payroll";
    case UserRole.TOPLUX: return "Toplux";
    default: return role;
  }
}

export function canManageSettings(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN;
}

export function canManageEmployees(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN || role === UserRole.RECRUITER;
}

