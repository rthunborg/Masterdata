/**
 * Color Picker Component
 * Provides a color selection interface with predefined palette and custom hex input
 * Follows shadcn/ui design patterns
 */

"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CATEGORY_COLOR_PALETTE,
  isValidHexColor,
  getReadableTextColor,
  meetsContrastRequirement,
} from "@/lib/utils/color-contrast";

export interface ColorPickerProps {
  value?: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
}

export function ColorPicker({
  value,
  onChange,
  disabled = false,
  label = "Color",
  placeholder = "Select or enter color",
  allowClear = true,
}: ColorPickerProps) {
  const [customColor, setCustomColor] = React.useState(value || "");
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [contrastWarning, setContrastWarning] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (value) {
      setCustomColor(value);
    }
  }, [value]);

  const checkContrast = (color: string) => {
    if (!isValidHexColor(color)) {
      setContrastWarning(null);
      return;
    }

    const textColor = getReadableTextColor(color);
    const meetsStandard = meetsContrastRequirement(color, textColor);
    
    if (!meetsStandard) {
      setContrastWarning("This color may have poor contrast. Consider a lighter or darker shade.");
    } else {
      setContrastWarning(null);
    }
  };

  const handleColorSelect = (color: string) => {
    setCustomColor(color);
    onChange(color);
    setError(null);
    checkContrast(color);
    setOpen(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);

    if (!newColor) {
      setError(null);
      setContrastWarning(null);
      onChange(null);
      return;
    }

    if (isValidHexColor(newColor)) {
      onChange(newColor);
      setError(null);
      checkContrast(newColor);
    } else {
      setError("Ogiltigt hexfärgformat (använd #RGB eller #RRGGBB)");
      setContrastWarning(null);
    }
  };

  const handleClear = () => {
    setCustomColor("");
    onChange(null);
    setError(null);
    setContrastWarning(null);
  };

  const selectedTextColor = value && isValidHexColor(value)
    ? getReadableTextColor(value)
    : 'black';

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            {value ? (
              <div className="flex items-center gap-2 w-full">
                <div
                  className="h-5 w-5 rounded border border-gray-300 shrink-0"
                  style={{ backgroundColor: value }}
                />
                <span className="flex-1 truncate">{value}</span>
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Predefined Color Palette */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Predefined Colors
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORY_COLOR_PALETTE.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleColorSelect(color.value)}
                    className={cn(
                      "h-10 w-full rounded border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                      value === color.value
                        ? "border-gray-900 ring-2 ring-gray-900"
                        : "border-gray-300"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={`${color.name} (${color.value})`}
                    aria-label={`Select ${color.name} color`}
                  >
                    {value === color.value && (
                      <Check
                        className="h-4 w-4 mx-auto"
                        style={{ color: color.textColor }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Input */}
            <div>
              <Label htmlFor="custom-color" className="text-sm font-medium mb-2 block">
                Custom Color
              </Label>
              <Input
                id="custom-color"
                type="text"
                placeholder="#3B82F6"
                value={customColor}
                onChange={handleCustomColorChange}
                className={cn(error && "border-red-500")}
                maxLength={7}
              />
              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
              {contrastWarning && !error && (
                <p className="text-xs text-yellow-600 mt-1 flex items-start gap-1">
                  <span className="text-yellow-600">⚠</span>
                  {contrastWarning}
                </p>
              )}
            </div>

            {/* Preview */}
            {value && isValidHexColor(value) && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Preview</Label>
                <div
                  className="h-12 rounded border border-gray-300 flex items-center justify-center font-medium"
                  style={{
                    backgroundColor: value,
                    color: selectedTextColor,
                  }}
                >
                  Sample Text
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {allowClear && value && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1"
                  size="sm"
                >
                  Clear
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1"
                size="sm"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Compact Color Indicator
 * Shows a small color swatch with the color value
 */
export interface ColorIndicatorProps {
  color: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ColorIndicator({
  color,
  size = "md",
  showLabel = false,
  className,
}: ColorIndicatorProps) {
  if (!color) return null;

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          sizeClasses[size],
          "rounded border border-gray-300 shrink-0"
        )}
        style={{ backgroundColor: color }}
        title={color}
      />
      {showLabel && (
        <span className="text-xs text-gray-600 font-mono">{color}</span>
      )}
    </div>
  );
}
