-- Story 22.13: make a partial staging restore compatible with runtime employee
-- columns represented by column_config before the employee COPY is replayed.
--
-- This script runs after column_config data is restored and inside the same
-- transaction as TRUNCATE + both table replays. It adds missing columns only;
-- it never drops or rewrites staging schema. Existing columns are deliberately
-- not type-compared because column_config contains UI-semantic types that can
-- differ from physical storage for migrated built-in columns.

DO $$
DECLARE
  runtime_column record;
  sql_type text;
  index_name text;
  migration_owned_column text;
  migration_owned_columns CONSTANT text[] := ARRAY[
    'id',
    'first_name',
    'surname',
    'ssn',
    'email',
    'mobile',
    'rank',
    'gender',
    'town_district',
    'hire_date',
    'termination_date',
    'termination_reason',
    'is_terminated',
    'is_archived',
    'comments',
    'created_at',
    'updated_at',
    'one',
    'isps',
    'photo',
    'origo',
    'loneiva',
    'mail_lon',
    'bankuppgifter',
    'li',
    'passport',
    'kvitto_c17_18',
    'c17',
    'crewing_done',
    'sodexo_meal_plan',
    'tester',
    'one_marked_at',
    'talmundo',
    'loneiva_backup',
    'stena_date',
    'omc_date',
    'pe3_date',
    'omc_masterdata_reminder_sent_at',
    'hotel_required',
    'room_number_shared',
    'repayment_needed_omc',
    'repayment_needed_pe3',
    'special_diet',
    'diet_details',
    'archived_at',
    'is_anonymized'
  ];
BEGIN
  -- Missing migration-owned columns indicate schema drift. Recreating one from
  -- UI metadata would lose constraints, defaults, indexes, and its real SQL
  -- type, so abort the transaction and require migrations to repair staging.
  FOREACH migration_owned_column IN ARRAY migration_owned_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'employees'
        AND column_name = migration_owned_column
    ) THEN
      RAISE EXCEPTION 'Missing migration-owned employee column: %',
        migration_owned_column;
    END IF;
  END LOOP;

  FOR runtime_column IN
    SELECT
      db_column_name AS column_name,
      min(lower(column_type)) AS column_type,
      count(DISTINCT lower(column_type)) AS column_type_count
    FROM public.column_config
    GROUP BY db_column_name
    ORDER BY db_column_name
  LOOP
    IF runtime_column.column_name !~ '^[a-z][a-z0-9_]*$'
      OR octet_length(runtime_column.column_name) > 63
    THEN
      RAISE EXCEPTION 'Invalid runtime employee column identifier: %',
        runtime_column.column_name;
    END IF;

    IF runtime_column.column_type_count <> 1 THEN
      RAISE EXCEPTION 'Conflicting runtime types for employee column: %',
        runtime_column.column_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'employees'
        AND column_name = runtime_column.column_name
    ) THEN
      sql_type := CASE runtime_column.column_type
        WHEN 'text' THEN 'TEXT'
        WHEN 'number' THEN 'NUMERIC(20,2)'
        WHEN 'date' THEN 'DATE'
        WHEN 'boolean' THEN 'BOOLEAN'
        ELSE NULL
      END;

      IF sql_type IS NULL THEN
        RAISE EXCEPTION 'Unsupported runtime type "%" for employee column "%"',
          runtime_column.column_type,
          runtime_column.column_name;
      END IF;

      EXECUTE format(
        'ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS %I %s',
        runtime_column.column_name,
        sql_type
      );

      index_name := CASE
        WHEN octet_length('idx_employees_' || runtime_column.column_name) <= 63
          THEN 'idx_employees_' || runtime_column.column_name
        ELSE
          'idx_emp_' || left(runtime_column.column_name, 42) || '_' ||
            substr(md5(runtime_column.column_name), 1, 8)
      END;

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.employees(%I)',
        index_name,
        runtime_column.column_name
      );
    END IF;
  END LOOP;
END;
$$;
