BEGIN;

-- 1) Make sure the employees column exists (your part)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS talmundo BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN employees.talmundo IS
  'Talmundo system completion status - editable only after One field 24-hour waiting period';

-- 2) Ensure a unique constraint exists on (column_name, is_masterdata)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'column_config'
    AND    c.conname = 'column_config_column_name_is_masterdata_key'
  ) THEN
    ALTER TABLE column_config
      ADD CONSTRAINT column_config_column_name_is_masterdata_key
      UNIQUE (column_name, is_masterdata);
  END IF;
END $$;

-- 3) Now the upsert works because the target exists
INSERT INTO column_config (
  column_name, db_column_name, column_type, is_masterdata, category, role_permissions, display_order
) VALUES (
  'Talmundo',
  'talmundo',
  'boolean',
  true,
  NULL,
  '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'::jsonb,
  31
)
ON CONFLICT ON CONSTRAINT column_config_column_name_is_masterdata_key DO NOTHING;

-- 4) Verification (your part kept as-is)
DO $$
DECLARE
  col_exists BOOLEAN;
  config_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'talmundo'
  ) INTO col_exists;

  SELECT EXISTS (
    SELECT 1 FROM column_config
    WHERE column_name = 'Talmundo' AND is_masterdata = true
  ) INTO config_exists;

  IF col_exists AND config_exists THEN
    RAISE NOTICE 'Talmundo field migration completed successfully';
    RAISE NOTICE '  - Column added to employees table: %', col_exists;
    RAISE NOTICE '  - Column config entry created: %', config_exists;
  ELSE
    RAISE WARNING 'Talmundo field migration incomplete';
    RAISE WARNING '  - Column exists: %', col_exists;
    RAISE WARNING '  - Config exists: %', config_exists;
  END IF;
END $$;

COMMIT;
