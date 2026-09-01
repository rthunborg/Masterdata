-- Story 8.20: ÖMC Room Assignment Algorithm Implementation
-- Migration: Create RPC functions for atomic room assignment operations
-- Addresses AC6: Concurrency Handling

-- Function: Atomically recalculate all room assignments for a date
-- Uses SELECT FOR UPDATE to lock employees and prevent race conditions
CREATE OR REPLACE FUNCTION recalculate_rooms_for_date(
  p_date_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_employees RECORD;
  v_room_assignments JSONB := '[]'::jsonb;
  v_room_number INTEGER;
  v_max_room INTEGER := 0;
  v_room_occupancy JSONB := '{}'::jsonb;
  v_room_count INTEGER;
  v_employee_data JSONB;
BEGIN
  -- Lock all employees for this date to prevent concurrent modifications
  PERFORM id FROM employees
  WHERE omc_date = p_date_id
    AND hotel_required = true
  FOR UPDATE;

  -- Get all employees for this date, ordered by rank (CHEF first) and hire_date
  FOR v_employees IN
    SELECT 
      id,
      rank,
      gender,
      hotel_required,
      room_number_shared,
      hire_date
    FROM employees
    WHERE omc_date = p_date_id
      AND hotel_required = true
    ORDER BY 
      CASE rank WHEN 'CHEF' THEN 0 ELSE 1 END,  -- CHEF first
      hire_date ASC
  LOOP
    -- Reset room number
    v_room_number := NULL;

    -- Rule 1: First employee gets room 1
    IF jsonb_array_length(v_room_assignments) = 0 THEN
      v_room_number := 1;
    -- Rule 2: CHEF rank gets private room (next available number)
    ELSIF v_employees.rank = 'CHEF' THEN
      v_room_number := v_max_room + 1;
    -- Rule 3 & 4: SEV rank shares room with same gender (max 2 per room)
    ELSIF v_employees.rank = 'SEV' THEN
      -- If gender is null, assign private room
      IF v_employees.gender IS NULL THEN
        v_room_number := v_max_room + 1;
      ELSE
        -- Find room with 1 SEV occupant of same gender (room not full)
        v_room_number := NULL;
        FOR v_employee_data IN SELECT * FROM jsonb_array_elements(v_room_assignments)
        LOOP
          -- Check if this room has exactly 1 occupant
          v_room_count := (v_room_occupancy->>(v_employee_data->>'room_number'))::INTEGER;
          IF v_room_count = 1 
            AND (v_employee_data->>'rank') = 'SEV'
            AND (v_employee_data->>'gender') = v_employees.gender::TEXT
          THEN
            v_room_number := (v_employee_data->>'room_number')::INTEGER;
            EXIT;
          END IF;
        END LOOP;

        -- No matching room found - assign next available room
        IF v_room_number IS NULL THEN
          v_room_number := v_max_room + 1;
        END IF;
      END IF;
    END IF;

    -- Update room occupancy tracking
    IF v_room_occupancy ? v_room_number::TEXT THEN
      v_room_occupancy := jsonb_set(
        v_room_occupancy,
        ARRAY[v_room_number::TEXT],
        to_jsonb((v_room_occupancy->>v_room_number::TEXT)::INTEGER + 1)
      );
    ELSE
      v_room_occupancy := v_room_occupancy || jsonb_build_object(v_room_number::TEXT, 1);
    END IF;

    -- Update max room number
    IF v_room_number > v_max_room THEN
      v_max_room := v_room_number;
    END IF;

    -- Add to room assignments list
    v_room_assignments := v_room_assignments || jsonb_build_object(
      'id', v_employees.id,
      'rank', v_employees.rank,
      'gender', v_employees.gender,
      'room_number', v_room_number
    );

    -- Update employee's room number if it changed
    IF v_employees.room_number_shared IS DISTINCT FROM v_room_number THEN
      UPDATE employees
      SET room_number_shared = v_room_number
      WHERE id = v_employees.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate room number for a new employee (atomic with locking)
-- Returns the room number that should be assigned
CREATE OR REPLACE FUNCTION calculate_room_number(
  p_date_id UUID,
  p_rank TEXT,
  p_gender TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_existing_employees RECORD;
  v_room_assignments JSONB := '[]'::jsonb;
  v_room_number INTEGER;
  v_max_room INTEGER := 0;
  v_room_occupancy JSONB := '{}'::jsonb;
  v_room_count INTEGER;
  v_employee_data JSONB;
BEGIN
  -- Lock all employees for this date to prevent concurrent modifications
  PERFORM id FROM employees
  WHERE omc_date = p_date_id
    AND hotel_required = true
    AND room_number_shared IS NOT NULL
  FOR UPDATE;

  -- Get existing employees with assigned rooms
  FOR v_existing_employees IN
    SELECT 
      rank,
      gender,
      room_number_shared
    FROM employees
    WHERE omc_date = p_date_id
      AND hotel_required = true
      AND room_number_shared IS NOT NULL
    ORDER BY 
      CASE rank WHEN 'CHEF' THEN 0 ELSE 1 END,  -- CHEF first
      hire_date ASC
  LOOP
    -- Track room occupancy
    IF v_room_occupancy ? v_existing_employees.room_number_shared::TEXT THEN
      v_room_occupancy := jsonb_set(
        v_room_occupancy,
        ARRAY[v_existing_employees.room_number_shared::TEXT],
        to_jsonb((v_room_occupancy->>v_existing_employees.room_number_shared::TEXT)::INTEGER + 1)
      );
    ELSE
      v_room_occupancy := v_room_occupancy || jsonb_build_object(
        v_existing_employees.room_number_shared::TEXT, 
        1
      );
    END IF;

    -- Update max room number
    IF v_existing_employees.room_number_shared > v_max_room THEN
      v_max_room := v_existing_employees.room_number_shared;
    END IF;

    -- Add to room assignments list
    v_room_assignments := v_room_assignments || jsonb_build_object(
      'rank', v_existing_employees.rank,
      'gender', v_existing_employees.gender,
      'room_number', v_existing_employees.room_number_shared
    );
  END LOOP;

  -- Calculate room number for new employee using FR40 algorithm
  -- Rule 1: First employee gets room 1
  IF jsonb_array_length(v_room_assignments) = 0 THEN
    v_room_number := 1;
  -- Rule 2: CHEF rank gets private room (next available number)
  ELSIF p_rank = 'CHEF' THEN
    v_room_number := v_max_room + 1;
  -- Rule 3 & 4: SEV rank shares room with same gender (max 2 per room)
  ELSIF p_rank = 'SEV' THEN
    -- If gender is null, assign private room
    IF p_gender IS NULL THEN
      v_room_number := v_max_room + 1;
    ELSE
      -- Find room with 1 SEV occupant of same gender (room not full)
      v_room_number := NULL;
      FOR v_employee_data IN SELECT * FROM jsonb_array_elements(v_room_assignments)
      LOOP
        -- Check if this room has exactly 1 occupant
        v_room_count := (v_room_occupancy->>(v_employee_data->>'room_number'))::INTEGER;
        IF v_room_count = 1 
          AND (v_employee_data->>'rank') = 'SEV'
          AND (v_employee_data->>'gender') = p_gender
        THEN
          v_room_number := (v_employee_data->>'room_number')::INTEGER;
          EXIT;
        END IF;
      END LOOP;

      -- No matching room found - assign next available room
      IF v_room_number IS NULL THEN
        v_room_number := v_max_room + 1;
      END IF;
    END IF;
  ELSE
    -- Default: next available room (shouldn't reach here, but safety fallback)
    v_room_number := v_max_room + 1;
  END IF;

  RETURN v_room_number;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_rooms_for_date(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_room_number(UUID, TEXT, TEXT) TO authenticated;

