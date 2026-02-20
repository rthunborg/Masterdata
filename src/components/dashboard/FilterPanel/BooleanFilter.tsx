"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslations } from "@/lib/i18n";
import type { ColumnConfig } from "@/lib/types/column-config";

interface BooleanFilterProps {
  column: ColumnConfig;
  value: boolean | null; // null = "Either"
  onChange: (value: boolean | null) => void;
}

export function BooleanFilter({ column, value, onChange }: BooleanFilterProps) {
  const tFilter = useTranslations("filter");
  const stringValue =
    value === null ? "either" : value === true ? "true" : "false";

  const handleValueChange = (newValue: string) => {
    if (newValue === "either") {
      onChange(null);
    } else if (newValue === "true") {
      onChange(true);
    } else {
      onChange(false);
    }
  };

  return (
    <div
      className="space-y-2"
      data-testid={`boolean-filter-${column.db_column_name}`}
    >
      <RadioGroup
        value={stringValue}
        onValueChange={handleValueChange}
        aria-label={`Filter ${column.column_name}`}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="either"
            id={`${column.id}-either`}
            data-testid={`boolean-filter-either-${column.db_column_name}`}
          />
          <Label htmlFor={`${column.id}-either`} className="cursor-pointer">
            {tFilter("either")}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="true"
            id={`${column.id}-yes`}
            data-testid={`boolean-filter-yes-${column.db_column_name}`}
          />
          <Label htmlFor={`${column.id}-yes`} className="cursor-pointer">
            {tFilter("yes")}
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
      {value !== null && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          className="h-auto px-0 py-0 text-xs text-muted-foreground hover:text-foreground"
          data-testid={`boolean-filter-clear-${column.db_column_name}`}
        >
          {tFilter("clearFilter")}
        </Button>
      )}
    </div>
  );
}
