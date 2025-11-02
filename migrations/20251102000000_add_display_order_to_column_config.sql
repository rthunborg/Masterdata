-- Migration: Add display_order and is_visible to column_config
-- Description: Adds display_order for column reordering and is_visible for hide/show functionality
-- Story: 6.6 - Column Management UX Improvements
-- Created: 2025-11-02

-- Add display_order column to control column rendering order
ALTER TABLE public.column_config
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Add is_visible column to control column visibility
ALTER TABLE public.column_config
ADD COLUMN is_visible BOOLEAN DEFAULT true;

-- Add updated_at column for tracking modifications
ALTER TABLE public.column_config
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_column_config_updated_at
  BEFORE UPDATE ON public.column_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Populate default display_order for existing columns
-- Assign sequential order based on creation date
WITH ordered_columns AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS new_order
  FROM public.column_config
)
UPDATE public.column_config
SET display_order = ordered_columns.new_order
FROM ordered_columns
WHERE column_config.id = ordered_columns.id;

-- Create index on display_order for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_column_config_display_order 
ON public.column_config(display_order);

-- Create index on is_visible for filtering queries
CREATE INDEX IF NOT EXISTS idx_column_config_is_visible 
ON public.column_config(is_visible);

-- Add comment for documentation
COMMENT ON COLUMN public.column_config.display_order IS 
'Determines the rendering order of columns in the employee table. Lower values appear first.';

COMMENT ON COLUMN public.column_config.is_visible IS 
'Controls whether the column is displayed in the employee table. Hidden columns are not shown.';
