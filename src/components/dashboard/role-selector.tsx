"use client";

import { useUIStore } from "@/lib/store/ui-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { UserRole, getRoleDisplayName } from "@/lib/types/user";
import { Eye } from "lucide-react";

/**
 * Role Selector Dropdown Component
 * 
 * Allows HR Admin to switch to preview mode to see what different roles see.
 * Only renders for HR Admin users.
 * 
 * AC: 1, 6
 * - Dropdown with all role options
 * - Switches preview mode on selection
 * - Only visible to HR Admin
 */
export function RoleSelector() {
  const { user } = useAuth();
  const { previewRole, setPreviewRole, isPreviewMode } = useUIStore();

  // Only render for HR Admin
  if (user?.role !== UserRole.HR_ADMIN) return null;

  const roles: { value: UserRole | "hr_admin"; label: string }[] = [
    { value: "hr_admin", label: "HR Admin (Default)" },
    { value: UserRole.SODEXO, label: getRoleDisplayName(UserRole.SODEXO) },
    { value: UserRole.OMC, label: getRoleDisplayName(UserRole.OMC) },
    { value: UserRole.PAYROLL, label: getRoleDisplayName(UserRole.PAYROLL) },
    { value: UserRole.TOPLUX, label: getRoleDisplayName(UserRole.TOPLUX) },
  ];

  const currentRole = previewRole || UserRole.HR_ADMIN;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="role-selector" className="text-sm font-medium flex items-center gap-1.5">
        <Eye className="h-4 w-4" />
        View As:
      </label>
      <Select
        value={currentRole}
        onValueChange={(value) => {
          if (value === UserRole.HR_ADMIN) {
            setPreviewRole(null); // Exit preview mode
          } else {
            setPreviewRole(value as UserRole);
          }
        }}
      >
        <SelectTrigger id="role-selector" className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPreviewMode && (
        <span className="text-xs text-muted-foreground">
          (Preview Mode Active)
        </span>
      )}
    </div>
  );
}
