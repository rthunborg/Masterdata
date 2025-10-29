"use client";

import { UserRole } from "@/lib/types/user";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionToggleProps {
  role: UserRole;
  permissionType: "view" | "edit";
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  tooltip?: string;
}

export function PermissionToggle({
  permissionType,
  value,
  disabled = false,
  onChange,
  tooltip,
}: PermissionToggleProps) {
  const handleChange = (checked: boolean | "indeterminate") => {
    if (checked === "indeterminate") return;
    onChange(checked);
  };

  const checkbox = (
    <Checkbox
      checked={value}
      disabled={disabled}
      onCheckedChange={handleChange}
      aria-label={`${permissionType} permission`}
      className={disabled ? "opacity-50 cursor-not-allowed" : ""}
    />
  );

  if (tooltip && disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{checkbox}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return checkbox;
}
