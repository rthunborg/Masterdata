"use client";

import { useState, useMemo, useEffect, ChangeEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { debounce } from "@/lib/utils/animation-helpers";
import type { ColumnConfig } from "@/lib/types/column-config";

interface TextFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function TextFilter({
  column,
  value,
  onChange,
  onClear,
}: TextFilterProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce onChange to prevent excessive filtering
  const debouncedOnChange = useMemo(
    () => debounce(onChange, 300),
    [onChange]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue("");
    debouncedOnChange.cancel();
    onClear();
  };

  return (
    <div className="relative" data-testid={`text-filter-${column.db_column_name}`}>
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={`Search ${column.column_name}...`}
        className="pr-8"
        aria-label={`Filter ${column.column_name}`}
        data-testid={`text-filter-input-${column.db_column_name}`}
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
          aria-label="Clear filter"
          data-testid={`text-filter-clear-${column.db_column_name}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
