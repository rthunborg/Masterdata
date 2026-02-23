"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";
import type { ColumnConfig } from "@/lib/types/column-config";

interface SelectFilterProps {
  column: ColumnConfig;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

export function SelectFilter({
  column,
  options,
  selectedValues,
  onChange,
}: SelectFilterProps) {
  const tFilter = useTranslations("filter");

  const handleToggle = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, option]);
    } else {
      onChange(selectedValues.filter((v) => v !== option));
    }
  };

  const hasSelection = selectedValues.length > 0;

  return (
    <div
      className="space-y-2"
      data-testid={`select-filter-${column.db_column_name}`}
    >
      {options.map((option) => (
        <div key={option} className="flex items-center space-x-2">
          <Checkbox
            id={`${column.id}-${option}`}
            checked={selectedValues.includes(option)}
            onCheckedChange={(checked) =>
              handleToggle(option, checked as boolean)
            }
            data-testid={`select-filter-option-${column.db_column_name}-${option}`}
          />
          <Label
            htmlFor={`${column.id}-${option}`}
            className="text-sm cursor-pointer"
          >
            {option}
          </Label>
        </div>
      ))}
      {hasSelection && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="h-auto px-0 py-0 text-xs text-muted-foreground hover:text-foreground"
          data-testid={`select-filter-clear-${column.db_column_name}`}
        >
          {tFilter("clearFilter")}
        </Button>
      )}
    </div>
  );
}
