-- Migration: Set All Boolean Fields to NOT NULL with DEFAULT false
-- Description: Ensures all boolean fields in employees table default to false and disallow null values
-- Created: 2025-11-23
-- Rationale: Prevent null values in boolean fields and ensure consistent defaults for new employees

BEGIN;

-- Update all boolean fields to NOT NULL with DEFAULT false
-- First, set any existing NULL values to false, then add NOT NULL constraint and default

-- one
ALTER TABLE public.employees
  ALTER COLUMN one SET DEFAULT false;
UPDATE public.employees SET one = false WHERE one IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN one SET NOT NULL;

-- talmundo (may already have DEFAULT false, but ensure NOT NULL)
ALTER TABLE public.employees
  ALTER COLUMN talmundo SET DEFAULT false;
UPDATE public.employees SET talmundo = false WHERE talmundo IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN talmundo SET NOT NULL;

-- isps
ALTER TABLE public.employees
  ALTER COLUMN isps SET DEFAULT false;
UPDATE public.employees SET isps = false WHERE isps IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN isps SET NOT NULL;

-- photo
ALTER TABLE public.employees
  ALTER COLUMN photo SET DEFAULT false;
UPDATE public.employees SET photo = false WHERE photo IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN photo SET NOT NULL;

-- origo
ALTER TABLE public.employees
  ALTER COLUMN origo SET DEFAULT false;
UPDATE public.employees SET origo = false WHERE origo IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN origo SET NOT NULL;

-- mail_lon
ALTER TABLE public.employees
  ALTER COLUMN mail_lon SET DEFAULT false;
UPDATE public.employees SET mail_lon = false WHERE mail_lon IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN mail_lon SET NOT NULL;

-- bankuppgifter
ALTER TABLE public.employees
  ALTER COLUMN bankuppgifter SET DEFAULT false;
UPDATE public.employees SET bankuppgifter = false WHERE bankuppgifter IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN bankuppgifter SET NOT NULL;

-- li
ALTER TABLE public.employees
  ALTER COLUMN li SET DEFAULT false;
UPDATE public.employees SET li = false WHERE li IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN li SET NOT NULL;

-- passport
ALTER TABLE public.employees
  ALTER COLUMN passport SET DEFAULT false;
UPDATE public.employees SET passport = false WHERE passport IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN passport SET NOT NULL;

-- kvitto_c17_18
ALTER TABLE public.employees
  ALTER COLUMN kvitto_c17_18 SET DEFAULT false;
UPDATE public.employees SET kvitto_c17_18 = false WHERE kvitto_c17_18 IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN kvitto_c17_18 SET NOT NULL;

-- c17
ALTER TABLE public.employees
  ALTER COLUMN c17 SET DEFAULT false;
UPDATE public.employees SET c17 = false WHERE c17 IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN c17 SET NOT NULL;

-- crewing_done
ALTER TABLE public.employees
  ALTER COLUMN crewing_done SET DEFAULT false;
UPDATE public.employees SET crewing_done = false WHERE crewing_done IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN crewing_done SET NOT NULL;

-- hotel_required
ALTER TABLE public.employees
  ALTER COLUMN hotel_required SET DEFAULT false;
UPDATE public.employees SET hotel_required = false WHERE hotel_required IS NULL;
ALTER TABLE public.employees
  ALTER COLUMN hotel_required SET NOT NULL;

-- Note: is_terminated and is_archived already have NOT NULL DEFAULT false from initial schema

-- Update column_config table to reflect that these fields are now boolean (not text)
-- These were originally added as TEXT but were later converted to BOOLEAN in the employees table
UPDATE public.column_config
SET column_type = 'boolean'
WHERE db_column_name IN (
  'one',
  'talmundo',
  'isps',
  'photo',
  'origo',
  'mail_lon',
  'bankuppgifter',
  'li',
  'passport',
  'kvitto_c17_18',
  'c17',
  'crewing_done',
  'hotel_required'
)
AND is_masterdata = true;

-- Also update hotel_required if it's a custom column (is_masterdata = false)
UPDATE public.column_config
SET column_type = 'boolean'
WHERE db_column_name = 'hotel_required'
AND is_masterdata = false;

-- Verification: List all boolean columns in employees table
DO $$
DECLARE
  bool_cols TEXT;
  config_updated INTEGER;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY column_name)
  INTO bool_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND data_type = 'boolean';
  
  RAISE NOTICE 'Boolean columns in employees table: %', bool_cols;
  
  -- Verify column_config updates
  SELECT COUNT(*) INTO config_updated
  FROM public.column_config
  WHERE db_column_name IN (
    'one', 'talmundo', 'isps', 'photo', 'origo', 'mail_lon', 
    'bankuppgifter', 'li', 'passport', 'kvitto_c17_18', 'c17', 
    'crewing_done', 'hotel_required'
  )
  AND column_type = 'boolean';
  
  RAISE NOTICE 'Column config entries updated to boolean: %', config_updated;
END $$;

COMMIT;

