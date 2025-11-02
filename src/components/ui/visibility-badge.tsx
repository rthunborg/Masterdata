import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";

interface VisibilityBadgeProps {
  isVisible: boolean;
  showIcon?: boolean;
}

export function VisibilityBadge({ isVisible, showIcon = true }: VisibilityBadgeProps) {
  return (
    <Badge
      variant={isVisible ? "default" : "secondary"}
      className={
        isVisible
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }
    >
      {showIcon && (
        <>
          {isVisible ? (
            <Eye className="h-3 w-3 mr-1" />
          ) : (
            <EyeOff className="h-3 w-3 mr-1" />
          )}
        </>
      )}
      {isVisible ? "Visible" : "Hidden"}
    </Badge>
  );
}
