-- Migration: Add display_order to column_config
-- Description: Adds display_order column to support custom column ordering in the UI
-- Created: 2025-10-31

-- Add display_order column with default value of 0
ALTER TABLE public.column_config
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for query optimization (ORDER BY display_order)
CREATE INDEX idx_column_config_display_order
ON public.column_config(display_order);

-- Backfill existing masterdata columns with sequential order (1-12)
-- Based on current created_at timestamp to maintain existing order
WITH ordered_masterdata AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.column_config
  WHERE is_masterdata = true
)
UPDATE public.column_config cc
SET display_order = om.rn
FROM ordered_masterdata om
WHERE cc.id = om.id;

-- Backfill custom columns starting from 100 (leaves room for future masterdata)
-- Based on created_at timestamp
WITH ordered_custom AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.column_config
  WHERE is_masterdata = false
)
UPDATE public.column_config cc
SET display_order = 100 + oc.rn
FROM ordered_custom oc
WHERE cc.id = oc.id;

-- Make display_order NOT NULL after backfill
ALTER TABLE public.column_config
ALTER COLUMN display_order SET NOT NULL;
