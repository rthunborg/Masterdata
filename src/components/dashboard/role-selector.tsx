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
import { Eye, Edit } from "lucide-react";
import { useTranslations } from "@/lib/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const t = useTranslations("dashboard");

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
    <TooltipProvider>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="role-selector" className="text-sm font-medium flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {t("viewAs")}:
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
        </div>
        
        {isPreviewMode && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground font-medium">
              (Preview Mode Active)
            </span>
            <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-gray-700">View only</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This user can see this column but cannot edit it</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="w-px h-4 bg-blue-300" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Edit className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-gray-700">Editable</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This user can both view and edit this column</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
