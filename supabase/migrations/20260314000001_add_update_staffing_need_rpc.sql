BEGIN;

-- Atomic update of staffing need with changelog in a single transaction.
-- Uses SELECT ... FOR UPDATE to prevent concurrent read-then-write races.
CREATE OR REPLACE FUNCTION update_staffing_need(
  p_location text,
  p_new_value integer,
  p_user_id uuid
)
RETURNS TABLE(old_value integer, new_value integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current integer;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT headcount_need INTO v_current
  FROM staffing_needs
  WHERE location = p_location
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staffing need not found for location: %', p_location;
  END IF;

  -- Skip if value unchanged
  IF v_current = p_new_value THEN
    RETURN QUERY SELECT v_current AS old_value, v_current AS new_value;
    RETURN;
  END IF;

  -- Update the staffing need
  UPDATE staffing_needs
  SET headcount_need = p_new_value,
      updated_at = now(),
      updated_by = p_user_id
  WHERE location = p_location;

  -- Insert changelog entry
  INSERT INTO staffing_needs_changelog (location, old_value, new_value, changed_by)
  VALUES (p_location, v_current, p_new_value, p_user_id);

  RETURN QUERY SELECT v_current AS old_value, p_new_value AS new_value;
END;
$$;

COMMIT;
