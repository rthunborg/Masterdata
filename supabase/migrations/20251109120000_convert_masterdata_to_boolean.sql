-- Migration: Convert Masterdata Columns from TEXT to BOOLEAN
-- Description: Converts 12 masterdata completion tracking columns from TEXT to BOOLEAN type
-- Story: 8.2 - Visual Status Indicators for Boolean Fields (prerequisite fix)
-- Created: 2025-11-09
-- Rationale: Epic 8 requires boolean type for visual status indicators and completion tracking logic

-- Step 1: Convert existing TEXT values to BOOLEAN
-- Any non-empty TEXT value will be considered TRUE, empty/null will be FALSE/NULL

-- Note: This migration assumes that existing TEXT data (if any) follows a pattern where:
-- - Empty string, NULL, or 'false'/'no'/'0' = false
-- - Any other value = true
-- If data exists, manual review may be needed before running this migration

-- Convert each column from TEXT to BOOLEAN using ALTER COLUMN TYPE with USING clause
ALTER TABLE public.employees
  ALTER COLUMN one TYPE BOOLEAN USING (
    CASE 
      WHEN one IS NULL THEN NULL
      WHEN LOWER(TRIM(one)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN isps TYPE BOOLEAN USING (
    CASE 
      WHEN isps IS NULL THEN NULL
      WHEN LOWER(TRIM(isps)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN photo TYPE BOOLEAN USING (
    CASE 
      WHEN photo IS NULL THEN NULL
      WHEN LOWER(TRIM(photo)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN origo TYPE BOOLEAN USING (
    CASE 
      WHEN origo IS NULL THEN NULL
      WHEN LOWER(TRIM(origo)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN loneiva TYPE BOOLEAN USING (
    CASE 
      WHEN loneiva IS NULL THEN NULL
      WHEN LOWER(TRIM(loneiva)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN mail_lon TYPE BOOLEAN USING (
    CASE 
      WHEN mail_lon IS NULL THEN NULL
      WHEN LOWER(TRIM(mail_lon)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN bankuppgifter TYPE BOOLEAN USING (
    CASE 
      WHEN bankuppgifter IS NULL THEN NULL
      WHEN LOWER(TRIM(bankuppgifter)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN li TYPE BOOLEAN USING (
    CASE 
      WHEN li IS NULL THEN NULL
      WHEN LOWER(TRIM(li)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN passport TYPE BOOLEAN USING (
    CASE 
      WHEN passport IS NULL THEN NULL
      WHEN LOWER(TRIM(passport)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN kvitto_c17_18 TYPE BOOLEAN USING (
    CASE 
      WHEN kvitto_c17_18 IS NULL THEN NULL
      WHEN LOWER(TRIM(kvitto_c17_18)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN c17 TYPE BOOLEAN USING (
    CASE 
      WHEN c17 IS NULL THEN NULL
      WHEN LOWER(TRIM(c17)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

ALTER TABLE public.employees
  ALTER COLUMN crewing_done TYPE BOOLEAN USING (
    CASE 
      WHEN crewing_done IS NULL THEN NULL
      WHEN LOWER(TRIM(crewing_done)) IN ('', 'false', 'no', '0', 'n') THEN FALSE
      ELSE TRUE
    END
  );

-- Step 2: Update column comments to reflect boolean type
COMMENT ON COLUMN public.employees.one IS 'One - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.isps IS 'ISPS - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.photo IS 'Photo - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.origo IS 'Origo - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.loneiva IS 'Lönenivå - Salary level - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.mail_lon IS 'Mail lön - Salary mail - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.bankuppgifter IS 'Bankuppgifter - Bank details - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.li IS 'LI - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.passport IS 'Passport - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.kvitto_c17_18 IS 'Kvitto C17/18 - Receipt C17/18 - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.c17 IS 'C17 - HR Admin only field (Boolean completion status)';
COMMENT ON COLUMN public.employees.crewing_done IS 'Crewing/Done - HR Admin only field (Boolean completion status)';
