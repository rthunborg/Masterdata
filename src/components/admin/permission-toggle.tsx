"use client";

import { UserRole } from "@/lib/types/user";
import { Eye, EyeOff, Edit, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const handleClick = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  // Determine icon and styling based on permission type and value
  const getIconAndStyle = () => {
    if (permissionType === "view") {
      if (value) {
        // Has view permission: blue background with white eye
        return {
          icon: <Eye className="h-3.5 w-3.5 text-white" />,
          bgColor: "bg-blue-500",
          borderColor: "border-blue-600",
        };
      } else {
        // No view permission: unfilled with black eye-off
        return {
          icon: <EyeOff className="h-3.5 w-3.5 text-black" />,
          bgColor: "bg-transparent",
          borderColor: "border-gray-300",
        };
      }
    } else {
      // edit permission
      if (value) {
        // Has edit permission: blue background with white edit icon
        return {
          icon: <Edit className="h-3.5 w-3.5 text-white" />,
          bgColor: "bg-blue-500",
          borderColor: "border-blue-600",
        };
      } else {
        // No edit permission: unfilled with black minus/dash
        return {
          icon: <Minus className="h-3.5 w-3.5 text-black" />,
          bgColor: "bg-transparent",
          borderColor: "border-gray-300",
        };
      }
    }
  };

  const { icon, bgColor, borderColor } = getIconAndStyle();

  const toggleButton = (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={`${permissionType} permission`}
      className={cn(
        "h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors",
        bgColor,
        borderColor,
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"
      )}
    >
      {icon}
    </button>
  );

  if (tooltip && disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{toggleButton}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return toggleButton;
}
