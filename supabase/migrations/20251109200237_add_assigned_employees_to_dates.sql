-- Story 8.8: Important Dates Assigned Employees List
-- Migration: Add assigned_employees JSONB column to important_dates table
-- This enables tracking which specific employees are assigned to each date

-- Add assigned_employees JSONB column with default empty array
ALTER TABLE important_dates
ADD COLUMN assigned_employees JSONB DEFAULT '[]'::jsonb;

-- Add column comment for documentation
COMMENT ON COLUMN important_dates.assigned_employees IS
  'Array of assigned employee objects: [{"id": "uuid", "name": "First Last", "email": "email@example.com", "room_number": 5}]';

-- Add GIN index for efficient JSONB queries (searching within array)
CREATE INDEX idx_important_dates_assigned_employees
ON important_dates USING GIN(assigned_employees);

-- Backfill assigned_employees from existing employee date assignments
-- For each important date, find all employees where stena_date, omc_date, or pe3_date matches
-- Note: room_number is set to NULL since room_number_shared column doesn't exist yet
-- (it will be added in a future story for hotel management)
UPDATE important_dates d
SET assigned_employees = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id::text,
      'name', e.first_name || ' ' || e.surname,
      'email', e.email,
      'room_number', NULL
    )
  ), '[]'::jsonb)
  FROM employees e
  WHERE e.stena_date = d.id
     OR e.omc_date = d.id
     OR e.pe3_date = d.id
);

-- Verify backfill (optional - for logging/debugging)
-- SELECT 
--   d.id, 
--   d.date_description, 
--   jsonb_array_length(d.assigned_employees) as employee_count
-- FROM important_dates d
-- WHERE jsonb_array_length(d.assigned_employees) > 0;
