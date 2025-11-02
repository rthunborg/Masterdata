-- Migration: Add employee date fields (stena_date, omc_date, pe3_date)
-- Created: 2025-10-30
-- Story: 6.1 - Update Employee Form Field Validation

-- Add three new columns to employees table for Important Dates references
ALTER TABLE employees
ADD COLUMN stena_date TEXT,
ADD COLUMN omc_date TEXT,
ADD COLUMN pe3_date TEXT;

-- Add column comments for documentation
COMMENT ON COLUMN employees.stena_date IS 'Stena Date - links to important_dates.id';
COMMENT ON COLUMN employees.omc_date IS 'ÖMC Date - links to important_dates.id';
COMMENT ON COLUMN employees.pe3_date IS 'PE3 Date - links to important_dates.id';
