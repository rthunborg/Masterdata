"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { ColorIndicator, ColorPicker } from "@/components/ui/color-picker";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnConfig } from "@/lib/types/column-config";

interface EditableCategoryCellProps {
  value: string;
  columnId: string;
  allColumns: ColumnConfig[];
  onUpdate: (columnId: string, newCategory: string) => Promise<void>;
  onColorUpdate: (categoryName: string, color: string | null) => Promise<void>;
  isUpdating: boolean;
}

export function EditableCategoryCell({
  value,
  columnId,
  allColumns,
  onUpdate,
  onColorUpdate,
  isUpdating,
}: EditableCategoryCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const existingCategories = Array.from(
    new Map(
      allColumns
        .filter((col) => col.category !== null && col.category !== "")
        .map((col) => [col.category!, { name: col.category!, color: col.category_color }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const currentColor = allColumns.find((col) => col.id === columnId)?.category_color;

  const handleSelect = async (newCategory: string) => {
    setIsOpen(false);
    setInputValue("");
    if (newCategory !== value) {
      await onUpdate(columnId, newCategory);
    }
  };

  const handleColorChange = async (color: string | null) => {
    if (value) {
      await onColorUpdate(value, color);
    }
    setIsColorPickerOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setInputValue("");
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "flex-1 justify-start font-normal h-8 px-2",
              !value && "text-muted-foreground"
            )}
            disabled={isUpdating}
          >
            <span className="truncate flex-1 min-w-0">{value || "Ingen kategori"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Sök eller skriv ny kategori..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandEmpty>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => handleSelect(inputValue)}
              >
                Skapa &ldquo;{inputValue}&rdquo;
              </Button>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => handleSelect("")}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "" ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground italic">Ingen kategori</span>
              </CommandItem>
              {existingCategories.map((category) => (
                <CommandItem
                  key={category.name}
                  value={category.name}
                  onSelect={() => handleSelect(category.name)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {category.color && <ColorIndicator color={category.color} size="sm" />}
                    <span>{category.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {value && (
        <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={isUpdating}
              title="Edit category color"
            >
              {currentColor ? (
                <ColorIndicator color={currentColor} size="sm" />
              ) : (
                <div className="h-4 w-4 rounded border-2 border-dashed border-gray-400" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Category Color</label>
                <p className="text-xs text-muted-foreground">
                  This color applies to all columns in this category
                </p>
              </div>
              <ColorPicker
                value={currentColor}
                onChange={handleColorChange}
                allowClear={true}
                placeholder="Select color"
              />
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
