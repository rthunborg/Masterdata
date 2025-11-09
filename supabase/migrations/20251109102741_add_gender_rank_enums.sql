-- Migration: Add Gender and Rank Enum Constraints
-- Description: Converts gender and rank columns to use CHECK constraints for enum values
-- Story: 8.1 - Gender & Rank Enum Restrictions
-- Created: 2025-11-09

-- Step 1: Query existing distinct values to understand current data
-- Run these queries manually before applying migration:
-- SELECT DISTINCT gender FROM public.employees WHERE gender IS NOT NULL;
-- SELECT DISTINCT rank FROM public.employees WHERE rank IS NOT NULL;

-- Step 2: Standardize existing data
-- Convert common variants to standard enum values

-- Standardize Gender values
UPDATE public.employees 
SET gender = 'Man' 
WHERE LOWER(gender) IN ('man', 'male', 'm');

UPDATE public.employees 
SET gender = 'Woman' 
WHERE LOWER(gender) IN ('woman', 'female', 'f', 'kvinna');

-- Standardize Rank values
UPDATE public.employees 
SET rank = 'SEV' 
WHERE UPPER(rank) = 'SEV';

UPDATE public.employees 
SET rank = 'CHEF' 
WHERE UPPER(rank) IN ('CHEF', 'CHIEF');

-- Step 3: Set non-conforming values to NULL (for manual review if needed)
-- This allows the migration to succeed while flagging problematic data
UPDATE public.employees 
SET gender = NULL 
WHERE gender IS NOT NULL 
  AND gender NOT IN ('Man', 'Woman');

UPDATE public.employees 
SET rank = NULL 
WHERE rank IS NOT NULL 
  AND rank NOT IN ('SEV', 'CHEF');

-- Step 4: Add CHECK constraints for Gender
ALTER TABLE public.employees 
ADD CONSTRAINT employees_gender_check 
CHECK (gender IN ('Man', 'Woman') OR gender IS NULL);

-- Step 5: Add CHECK constraints for Rank
ALTER TABLE public.employees 
ADD CONSTRAINT employees_rank_check 
CHECK (rank IN ('SEV', 'CHEF') OR rank IS NULL);

-- Step 6: Create index on gender for improved query performance
CREATE INDEX IF NOT EXISTS idx_employees_gender ON public.employees(gender) 
WHERE gender IS NOT NULL;

-- Step 7: Create index on rank for improved query performance
CREATE INDEX IF NOT EXISTS idx_employees_rank ON public.employees(rank) 
WHERE rank IS NOT NULL;

-- Verification queries:
-- SELECT gender, COUNT(*) FROM public.employees GROUP BY gender;
-- SELECT rank, COUNT(*) FROM public.employees GROUP BY rank;

-- Rollback instructions (if needed):
-- ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_gender_check;
-- ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_rank_check;
-- DROP INDEX IF EXISTS idx_employees_gender;
-- DROP INDEX IF EXISTS idx_employees_rank;
