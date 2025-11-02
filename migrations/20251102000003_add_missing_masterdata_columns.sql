-- Migration: Add Missing Masterdata Columns to Employees Table
-- Description: Adds 12 new masterdata columns required for comprehensive column configuration
-- Story: 7.1 - Comprehensive Masterdata Column Migration & Configuration
-- Created: 2025-11-02

-- Add missing columns to employees table
-- All columns are nullable TEXT type to allow flexible data entry
ALTER TABLE public.employees
ADD COLUMN one TEXT,
ADD COLUMN isps TEXT,
ADD COLUMN photo TEXT,
ADD COLUMN origo TEXT,
ADD COLUMN loneiva TEXT,
ADD COLUMN mail_lon TEXT,
ADD COLUMN bankuppgifter TEXT,
ADD COLUMN li TEXT,
ADD COLUMN passport TEXT,
ADD COLUMN kvitto_c17_18 TEXT,
ADD COLUMN c17 TEXT,
ADD COLUMN crewing_done TEXT;

-- Add column comments for documentation
COMMENT ON COLUMN public.employees.one IS 'One - HR Admin only field';
COMMENT ON COLUMN public.employees.isps IS 'ISPS - HR Admin only field';
COMMENT ON COLUMN public.employees.photo IS 'Photo - HR Admin only field';
COMMENT ON COLUMN public.employees.origo IS 'Origo - HR Admin only field';
COMMENT ON COLUMN public.employees.loneiva IS 'Lönenivå - Salary level - HR Admin only field';
COMMENT ON COLUMN public.employees.mail_lon IS 'Mail lön - Salary mail - HR Admin only field';
COMMENT ON COLUMN public.employees.bankuppgifter IS 'Bankuppgifter - Bank details - HR Admin only field';
COMMENT ON COLUMN public.employees.li IS 'LI - HR Admin only field';
COMMENT ON COLUMN public.employees.passport IS 'Passport - HR Admin only field';
COMMENT ON COLUMN public.employees.kvitto_c17_18 IS 'Kvitto C17/18 - Receipt C17/18 - HR Admin only field';
COMMENT ON COLUMN public.employees.c17 IS 'C17 - HR Admin only field';
COMMENT ON COLUMN public.employees.crewing_done IS 'Crewing/Done - HR Admin only field';
