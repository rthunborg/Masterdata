-- Migration: Add Category Colors to Column Config
-- Description: Adds category_color field to column_config table to support visual categorization
-- Created: 2025-11-06
-- Story: 9.1 - Category Color Coding for Column Headers

-- Add category_color column to column_config table
-- Stores hex color codes (e.g., '#3B82F6') or NULL for no color
ALTER TABLE public.column_config
ADD COLUMN IF NOT EXISTS category_color TEXT DEFAULT NULL;

-- Add check constraint to validate hex color format (optional but recommended)
-- Allows NULL or valid hex colors like #RGB or #RRGGBB
ALTER TABLE public.column_config
ADD CONSTRAINT check_category_color_format 
CHECK (
  category_color IS NULL 
  OR category_color ~ '^#[0-9A-Fa-f]{6}$'
  OR category_color ~ '^#[0-9A-Fa-f]{3}$'
);

-- Add comment for documentation
COMMENT ON COLUMN public.column_config.category_color IS 'Hex color code for category visualization in table headers. Format: #RRGGBB or #RGB. NULL = no color (default header style).';

-- Create index for faster lookups by category and color
CREATE INDEX IF NOT EXISTS idx_column_config_category ON public.column_config(category) 
WHERE category IS NOT NULL;

-- Note: No data migration needed - existing records will have NULL category_color (default behavior)
-- Backward compatible: columns without colors display standard header styling
