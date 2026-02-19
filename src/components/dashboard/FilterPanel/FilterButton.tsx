"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterButtonProps {
  onClick: () => void;
  isActive: boolean;
  filterCount?: number;
  className?: string;
}

export function FilterButton({
  onClick,
  isActive,
  filterCount = 0,
  className,
}: FilterButtonProps) {
  const tFilter = useTranslations("filter");
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "relative gap-2",
        isActive && "border-primary bg-primary/5",
        className
      )}
      aria-label={tFilter("openFilterPanel")}
      data-testid="filter-button"
    >
      <Filter className="h-4 w-4" />
      <span>{tFilter("filterButton")}</span>
      {filterCount > 0 && (
        <Badge
          variant="default"
          className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs animate-pulse"
          data-testid="filter-count-badge"
        >
          {filterCount > 9 ? '9+' : filterCount}
        </Badge>
      )}
    </Button>
  );
}
