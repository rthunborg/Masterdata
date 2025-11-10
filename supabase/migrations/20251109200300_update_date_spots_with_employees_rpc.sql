-- Story 8.8: Important Dates Assigned Employees List
-- Migration: Create RPC functions to manage assigned_employees array alongside capacity

-- Drop old functions to recreate with new parameters
DROP FUNCTION IF EXISTS update_date_spots;
DROP FUNCTION IF EXISTS release_date_capacity;

-- Updated function: Atomically update date spots AND manage assigned_employees array
-- This replaces the original update_date_spots function from Story 8.7
CREATE OR REPLACE FUNCTION update_date_spots(
  employee_id UUID,
  new_date_id UUID,
  old_date_id UUID,
  date_type TEXT,
  employee_data JSONB  -- NEW: employee object to add to assigned_employees
)
RETURNS VOID AS $$
DECLARE
  v_employee_id_text TEXT;
BEGIN
  -- Convert employee_id to text for JSONB comparison
  v_employee_id_text := employee_id::text;

  -- Lock rows to prevent concurrent modification (isolation for capacity management)
  PERFORM id FROM important_dates
  WHERE id IN (new_date_id, old_date_id)
  FOR UPDATE;

  -- If old date exists: increment spots and remove employee from assigned_employees
  IF old_date_id IS NOT NULL THEN
    UPDATE important_dates
    SET
      remaining_spots = remaining_spots + 1,
      -- Remove employee from array by filtering out matching ID
      assigned_employees = (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(assigned_employees) AS elem
        WHERE elem->>'id' != v_employee_id_text
      )
    WHERE id = old_date_id;
  END IF;

  -- Decrement new date spots and add employee to assigned_employees
  UPDATE important_dates
  SET
    remaining_spots = remaining_spots - 1,
    -- Append employee object to array (using || operator for concatenation)
    assigned_employees = assigned_employees || employee_data::jsonb
  WHERE id = new_date_id;

  -- Check constraint: remaining_spots must not go negative
  IF (SELECT remaining_spots FROM important_dates WHERE id = new_date_id) < 0 THEN
    RAISE EXCEPTION 'No remaining spots available for this date';
  END IF;

  -- Update employee date field
  EXECUTE format('UPDATE employees SET %I = $1 WHERE id = $2', date_type)
  USING new_date_id, employee_id;
END;
$$ LANGUAGE plpgsql;

-- Updated function: Release date capacity AND remove employee from assigned_employees
-- This replaces the original release_date_capacity function from Story 8.7
CREATE OR REPLACE FUNCTION release_date_capacity(
  date_id UUID,
  employee_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_employee_id_text TEXT;
BEGIN
  -- Convert employee_id to text for JSONB comparison
  v_employee_id_text := employee_id::text;

  UPDATE important_dates
  SET
    remaining_spots = remaining_spots + 1,
    -- Remove employee from array by filtering out matching ID
    assigned_employees = (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(assigned_employees) AS elem
      WHERE elem->>'id' != v_employee_id_text
    )
  WHERE id = date_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_date_spots TO authenticated;
GRANT EXECUTE ON FUNCTION release_date_capacity TO authenticated;
