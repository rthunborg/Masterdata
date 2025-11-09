BEGIN;

-- 1) Add temporary UUID columns
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS stena_date_uuid uuid,
  ADD COLUMN IF NOT EXISTS omc_date_uuid uuid,
  ADD COLUMN IF NOT EXISTS pe3_date_uuid uuid;

-- 2) Backfill from existing text columns if they match important_dates.id
-- Only rows where the text value exactly matches an existing important_dates.id::text
UPDATE employees e
SET stena_date_uuid = d.id
FROM important_dates d
WHERE e.stena_date IS NOT NULL
  AND e.stena_date_uuid IS NULL
  AND e.stena_date = d.id::text;

UPDATE employees e
SET omc_date_uuid = d.id
FROM important_dates d
WHERE e.omc_date IS NOT NULL
  AND e.omc_date_uuid IS NULL
  AND e.omc_date = d.id::text;

UPDATE employees e
SET pe3_date_uuid = d.id
FROM important_dates d
WHERE e.pe3_date IS NOT NULL
  AND e.pe3_date_uuid IS NULL
  AND e.pe3_date = d.id::text;

-- NOTE:
-- Any values in stena_date/omc_date/pe3_date that do NOT match an important_dates.id
-- will simply not be migrated and become NULL after the swap.
-- If those represented something meaningful, they'd need a manual mapping.

-- 3) Add FKs on the temporary columns
ALTER TABLE employees
  ADD CONSTRAINT fk_employees_stena_date
    FOREIGN KEY (stena_date_uuid) REFERENCES important_dates(id);

ALTER TABLE employees
  ADD CONSTRAINT fk_employees_omc_date
    FOREIGN KEY (omc_date_uuid) REFERENCES important_dates(id);

ALTER TABLE employees
  ADD CONSTRAINT fk_employees_pe3_date
    FOREIGN KEY (pe3_date_uuid) REFERENCES important_dates(id);

-- 4) Drop old text columns & rename UUID columns to original names
DROP INDEX IF EXISTS idx_employees_pe3_date; -- old index uses old column

ALTER TABLE employees
  DROP COLUMN stena_date,
  DROP COLUMN omc_date,
  DROP COLUMN pe3_date;

ALTER TABLE employees
  RENAME COLUMN stena_date_uuid TO stena_date;
ALTER TABLE employees
  RENAME COLUMN omc_date_uuid TO omc_date;
ALTER TABLE employees
  RENAME COLUMN pe3_date_uuid TO pe3_date;

-- 5) Recreate indexes on new UUID columns (optional but sensible)
CREATE INDEX IF NOT EXISTS idx_employees_stena_date
  ON employees (stena_date);

CREATE INDEX IF NOT EXISTS idx_employees_omc_date
  ON employees (omc_date);

CREATE INDEX IF NOT EXISTS idx_employees_pe3_date
  ON employees (pe3_date)
  WHERE pe3_date IS NOT NULL;

COMMIT;
BEGIN;

-- 1) Capacity columns
ALTER TABLE important_dates
  ADD COLUMN max_spots INTEGER DEFAULT 99 NOT NULL,
  ADD COLUMN remaining_spots INTEGER DEFAULT 99 NOT NULL;

-- 2) Sanity check constraint
ALTER TABLE important_dates
  ADD CONSTRAINT important_dates_remaining_spots_check
  CHECK (remaining_spots >= 0 AND remaining_spots <= max_spots);

-- 3) Documentation
COMMENT ON COLUMN important_dates.max_spots IS
  'Maximum capacity for this date (default: ÖMC=20, Stena=99, PE3=1)';
COMMENT ON COLUMN important_dates.remaining_spots IS
  'Remaining available spots (decrements on employee assignment, increments on unassignment)';

-- 4) Category-specific defaults
UPDATE important_dates
SET max_spots = 20,
    remaining_spots = 20
WHERE category = 'ÖMC';

UPDATE important_dates
SET max_spots = 1,
    remaining_spots = 1
WHERE category = 'PE3';

UPDATE important_dates
SET max_spots = 99,
    remaining_spots = 99
WHERE category = 'Stena';

-- 5) Recalculate remaining_spots based on current employee assignments
UPDATE important_dates d
SET remaining_spots = max_spots - COALESCE((
  SELECT COUNT(*)
  FROM employees e
  WHERE e.omc_date   = d.id
     OR e.stena_date = d.id
     OR e.pe3_date   = d.id
), 0);

COMMIT;
BEGIN;

-- Atomic capacity + assignment update
CREATE OR REPLACE FUNCTION update_date_spots(
  employee_id UUID,
  new_date_id UUID,
  old_date_id UUID,
  date_type   TEXT
)
RETURNS VOID AS $$
DECLARE
  remaining INT;
BEGIN
  -- Lock affected dates to avoid race conditions
  PERFORM id
  FROM important_dates
  WHERE id IN (new_date_id, old_date_id)
  FOR UPDATE;

  -- If moving away from an old date: free one spot
  IF old_date_id IS NOT NULL THEN
    UPDATE important_dates
    SET remaining_spots = remaining_spots + 1
    WHERE id = old_date_id;
  END IF;

  -- Reserve a spot on the new date
  UPDATE important_dates
  SET remaining_spots = remaining_spots - 1
  WHERE id = new_date_id
  RETURNING remaining_spots INTO remaining;

  IF remaining < 0 THEN
    RAISE EXCEPTION 'No remaining spots available for this date';
  END IF;

  -- Update the employee's FK column (now UUID)
  -- Example: date_type = 'omc_date'
  EXECUTE format('UPDATE employees SET %I = $1 WHERE id = $2', date_type)
  USING new_date_id, employee_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_date_spots(UUID, UUID, UUID, TEXT) TO authenticated;


-- Helper: release capacity for a given date_id (if manually unassigning)
CREATE OR REPLACE FUNCTION release_date_capacity(
  date_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE important_dates
  SET remaining_spots = remaining_spots + 1
  WHERE id = date_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION release_date_capacity(UUID) TO authenticated;

COMMIT;
