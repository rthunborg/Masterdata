"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";
import type { ColumnConfig } from "@/lib/types/column-config";

interface BooleanFilterProps {
  column: ColumnConfig;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}

export function BooleanFilter({ column, value, onChange }: BooleanFilterProps) {
  const tFilter = useTranslations("filter");
  const stringValue =
    value === null ? "" : value === true ? "true" : "false";

  const trueLabel = column.is_checklist_item ? tFilter("done") : tFilter("yes");

  const handleValueChange = (newValue: string) => {
    if (newValue === "true") {
      onChange(true);
    } else {
      onChange(false);
    }
  };

  return (
    <div
      className="space-y-3"
      data-testid={`boolean-filter-${column.db_column_name}`}
    >
      {value !== null && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="h-auto p-1 text-xs"
            data-testid={`boolean-filter-clear-${column.db_column_name}`}
          >
            {tFilter("clear")}
          </Button>
        </div>
      )}
      <RadioGroup
        value={stringValue}
        onValueChange={handleValueChange}
        aria-label={`Filter ${column.column_name}`}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="true"
            id={`${column.id}-yes`}
            data-testid={`boolean-filter-yes-${column.db_column_name}`}
          />
          <Label htmlFor={`${column.id}-yes`} className="cursor-pointer">
            {trueLabel}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="false"
            id={`${column.id}-no`}
            data-testid={`boolean-filter-no-${column.db_column_name}`}
          />
          <Label htmlFor={`${column.id}-no`} className="cursor-pointer">
            {tFilter("no")}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
