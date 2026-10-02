-- Story 22.13: Remediate PR #91 direct-database authorization findings.
--
-- This migration is intentionally environment-agnostic. It hardens the
-- SECURITY DEFINER RPCs at their trust boundary, removes authenticated users'
-- direct UPDATE privilege on public.users in favour of a caller-bound activity
-- RPC, and limits employee audit history to rows/columns visible to the caller.

BEGIN;

-- -------------------------------------------------------------------------
-- Staffing needs: authorize inside the SECURITY DEFINER function and bind the
-- audit actor to auth.uid(). RLS alone cannot protect a definer function.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_staffing_need(
  p_location text,
  p_new_value integer,
  p_user_id uuid
)
RETURNS TABLE(old_value integer, new_value integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current integer;
  v_actor_id uuid;
  v_actor_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT id, role
  INTO v_actor_id, v_actor_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF v_actor_id IS NULL OR v_actor_role NOT IN ('hr_admin', 'crewing') THEN
    RAISE EXCEPTION 'Insufficient permission to update staffing needs'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Staffing need actor does not match the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  SELECT headcount_need
  INTO v_current
  FROM public.staffing_needs
  WHERE location = p_location
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staffing need not found for location: %', p_location;
  END IF;

  IF v_current = p_new_value THEN
    RETURN QUERY SELECT v_current, v_current;
    RETURN;
  END IF;

  UPDATE public.staffing_needs
  SET headcount_need = p_new_value,
      updated_at = now(),
      updated_by = v_actor_id
  WHERE location = p_location;

  INSERT INTO public.staffing_needs_changelog (
    location,
    old_value,
    new_value,
    changed_by
  )
  VALUES (p_location, v_current, p_new_value, v_actor_id);

  RETURN QUERY SELECT v_current, p_new_value;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.update_staffing_need(text, integer, uuid) IS
  'Atomically updates staffing needs for active HR Admin/Crewing callers; the audit actor must match auth.uid().';

-- -------------------------------------------------------------------------
-- Runtime custom columns: raw DDL is not API-executable. The checked server
-- route uses one service-role-only RPC that creates metadata + DDL in the same
-- transaction, rejects collisions with every physical employees column, and
-- therefore cannot relabel a privileged system column as attacker-editable.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_custom_column_to_employees(
  column_name_param text,
  column_type_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF column_name_param !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid column name: must start with lowercase letter and contain only lowercase letters, numbers, and underscores';
  END IF;

  IF column_type_param NOT IN ('TEXT', 'NUMERIC(20,2)', 'DATE', 'BOOLEAN') THEN
    RAISE EXCEPTION 'Invalid column type: must be TEXT, NUMERIC(20,2), DATE, or BOOLEAN';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS %I %s',
    column_name_param,
    column_type_param
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.employees(%I)',
    'idx_employees_' || column_name_param,
    column_name_param
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_custom_column_to_employees(text, text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.add_custom_column_to_employees(text, text) IS
  'Legacy raw DDL helper retained for owner/migration use; no API role may execute it.';

CREATE OR REPLACE FUNCTION public.create_employee_column_config(
  p_column_name text,
  p_db_column_name text,
  p_column_type text,
  p_is_masterdata boolean,
  p_category text,
  p_category_color text,
  p_role_permissions jsonb,
  p_is_checklist_item boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_config public.column_config%ROWTYPE;
  v_sql_type text;
  v_index_name text;
BEGIN
  IF p_db_column_name !~ '^[a-z][a-z0-9_]*$'
    OR octet_length(p_db_column_name) > 63
  THEN
    RAISE EXCEPTION 'Invalid runtime employee column identifier: %',
      p_db_column_name;
  END IF;

  v_sql_type := CASE lower(p_column_type)
    WHEN 'text' THEN 'TEXT'
    WHEN 'number' THEN 'NUMERIC(20,2)'
    WHEN 'date' THEN 'DATE'
    WHEN 'boolean' THEN 'BOOLEAN'
    ELSE NULL
  END;

  IF v_sql_type IS NULL THEN
    RAISE EXCEPTION 'Unsupported runtime employee column type: %',
      p_column_type;
  END IF;

  IF p_column_name IS NULL OR btrim(p_column_name) = '' THEN
    RAISE EXCEPTION 'Column display name is required';
  END IF;

  IF p_is_masterdata IS NULL
    OR p_role_permissions IS NULL
    OR jsonb_typeof(p_role_permissions) <> 'object'
  THEN
    RAISE EXCEPTION 'Invalid runtime employee column metadata';
  END IF;

  -- Serialize runtime DDL so the physical-column check cannot race another
  -- creator. The RPC call itself is one transaction, so either both metadata
  -- and DDL commit or neither does.
  LOCK TABLE public.employees IN ACCESS EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name = p_db_column_name
  ) THEN
    RAISE EXCEPTION 'Employee column "%" already exists', p_db_column_name
      USING ERRCODE = '42701';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.column_config AS existing_config
    WHERE lower(existing_config.db_column_name) = lower(p_db_column_name)
  ) THEN
    RAISE EXCEPTION 'Column configuration "%" already exists', p_db_column_name
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.column_config (
    column_name,
    db_column_name,
    column_type,
    is_masterdata,
    category,
    category_color,
    role_permissions,
    is_checklist_item
  )
  VALUES (
    p_column_name,
    p_db_column_name,
    lower(p_column_type),
    p_is_masterdata,
    NULLIF(p_category, ''),
    NULLIF(p_category_color, ''),
    p_role_permissions,
    COALESCE(p_is_checklist_item, false)
  )
  RETURNING * INTO v_config;

  EXECUTE format(
    'ALTER TABLE public.employees ADD COLUMN %I %s',
    p_db_column_name,
    v_sql_type
  );

  v_index_name := CASE
    WHEN octet_length('idx_employees_' || p_db_column_name) <= 63
      THEN 'idx_employees_' || p_db_column_name
    ELSE
      'idx_emp_' || left(p_db_column_name, 42) || '_' ||
        substr(md5(p_db_column_name), 1, 8)
  END;

  EXECUTE format(
    'CREATE INDEX %I ON public.employees(%I)',
    v_index_name,
    p_db_column_name
  );

  RETURN to_jsonb(v_config);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_employee_column_config(
  text, text, text, boolean, text, text, jsonb, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_employee_column_config(
  text, text, text, boolean, text, text, jsonb, boolean
) TO service_role;

COMMENT ON FUNCTION public.create_employee_column_config(
  text, text, text, boolean, text, text, jsonb, boolean
) IS
  'Atomically creates collision-free employee runtime-column metadata and DDL through the controlled service-role route.';

-- Column lifecycle is HR-managed per the product contract. External parties
-- may edit values in columns assigned to them, but must not insert/update/delete
-- metadata directly (which could otherwise relabel a physical system field as
-- custom before a service-role value update).
DROP POLICY IF EXISTS "Manage column configs" ON public.column_config;

CREATE POLICY "Manage column configs"
  ON public.column_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users AS caller
      WHERE caller.auth_user_id = auth.uid()
        AND caller.role = 'hr_admin'
        AND caller.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users AS caller
      WHERE caller.auth_user_id = auth.uid()
        AND caller.role = 'hr_admin'
        AND caller.is_active = true
    )
  );

COMMENT ON POLICY "Manage column configs"
ON public.column_config IS
  'Only HR Admin manages column lifecycle; external roles edit assigned values, not schema metadata.';

-- -------------------------------------------------------------------------
-- User activity: the authenticated role must not have table-wide UPDATE.
-- Administrative status changes already flow through an HR Admin API and are
-- moved to its service-role client in this story. Activity uses this narrow RPC.
-- -------------------------------------------------------------------------
REVOKE UPDATE ON TABLE public.users FROM authenticated;
REVOKE UPDATE ON TABLE public.users FROM anon;
GRANT UPDATE ON TABLE public.users TO service_role;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'UPDATE'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.users',
      policy_record.policyname
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_own_last_active_at()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_last_active_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
  SET last_active_at = now()
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  RETURNING last_active_at INTO v_last_active_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active user record not found for authenticated user'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_last_active_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_own_last_active_at()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_last_active_at()
  TO authenticated;

COMMENT ON FUNCTION public.update_own_last_active_at() IS
  'Updates only the authenticated active user''s last_active_at timestamp.';

-- -------------------------------------------------------------------------
-- Employee column audit: inserts are trigger-owned (the trigger function is
-- SECURITY DEFINER), never caller-owned. Reads require both employee row
-- visibility and column visibility for external roles.
-- -------------------------------------------------------------------------
REVOKE INSERT ON TABLE public.employee_column_changes FROM authenticated;
REVOKE INSERT ON TABLE public.employee_column_changes FROM anon;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employee_column_changes'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.employee_column_changes',
      policy_record.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY "Authorized roles can read visible employee changes"
ON public.employee_column_changes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users AS caller
    WHERE caller.auth_user_id = auth.uid()
      AND caller.is_active = true
      AND caller.role = ANY (
        ARRAY['hr_admin', 'recruiter', 'sodexo', 'omc', 'payroll', 'toplux', 'crewing']
      )
  )
  AND EXISTS (
    SELECT 1
    FROM public.employees AS visible_employee
    WHERE visible_employee.id = employee_column_changes.employee_id
  )
  AND (
    (SELECT public.get_user_role()) = ANY (ARRAY['hr_admin', 'recruiter'])
    OR EXISTS (
      SELECT 1
      FROM public.column_config AS visible_column
      WHERE lower(visible_column.db_column_name) = lower(employee_column_changes.column_name)
        AND visible_column.is_masterdata = true
        AND COALESCE(
          visible_column.role_permissions
            -> (SELECT public.get_user_role())
            ->> 'view',
          'false'
        ) = 'true'
    )
  )
);

COMMENT ON POLICY "Authorized roles can read visible employee changes"
ON public.employee_column_changes IS
  'Limits audit rows to employee records and columns visible to the authenticated caller; trigger-owned writes have no client INSERT policy.';

COMMIT;
