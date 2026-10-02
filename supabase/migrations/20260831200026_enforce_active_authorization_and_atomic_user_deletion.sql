-- Story 22.15: close inactive-session authorization and split-deletion gaps.
--
-- This is forward-only. Historical migrations remain immutable because hosted
-- environments may already materially represent them without matching history.

BEGIN;

-- Historical migrations changed these represented employee fields and their
-- column_config rows independently. Hosted environments contain the rows, but
-- a clean migration replay can legitimately reach this point without them.
-- Insert only missing definitions so the forward migration repairs fresh
-- environments without overwriting operator-managed hosted labels, ordering,
-- categories, visibility, or permissions.
INSERT INTO public.column_config (
  column_name,
  db_column_name,
  column_type,
  is_masterdata,
  role_permissions,
  display_order
)
SELECT
  expected.column_name,
  expected.db_column_name,
  'boolean',
  true,
  expected.role_permissions,
  expected.display_order
FROM (
  VALUES
    (
      'Crewing/Done',
      'crewing_done',
      '{"hr_admin":{"view":true,"edit":true},"recruiter":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false},"crewing":{"view":true,"edit":false}}'::jsonb,
      140
    ),
    (
      'Återbetalningsskyldig ÖMC',
      'repayment_needed_omc',
      '{"hr_admin":{"view":true,"edit":true},"recruiter":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false},"crewing":{"view":false,"edit":false}}'::jsonb,
      141
    ),
    (
      'Återbetalningsskyldig PE3',
      'repayment_needed_pe3',
      '{"hr_admin":{"view":true,"edit":true},"recruiter":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false},"crewing":{"view":false,"edit":false}}'::jsonb,
      142
    )
) AS expected(column_name, db_column_name, role_permissions, display_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.column_config AS existing
  WHERE lower(existing.db_column_name) = lower(expected.db_column_name)
);

-- An unexpired Auth JWT must not retain an application role after the linked
-- application user has been deactivated. Own-account metadata remains readable
-- through the existing users SELECT policy; every role-gated policy/RPC sees
-- NULL for an inactive or missing application user.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role
  INTO v_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  RETURN v_role;
END;
$$;

ALTER FUNCTION public.get_user_role() OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;

COMMENT ON FUNCTION public.get_user_role() IS
  'Returns the active caller application role; inactive, missing, and anonymous callers receive NULL.';

-- Saved filters are intentionally private to an authenticated user, but a JWT
-- alone is no longer sufficient: the caller must still have an active app role.
DROP POLICY IF EXISTS "Users can view their own filters" ON public.user_filters;
DROP POLICY IF EXISTS "Users can create their own filters" ON public.user_filters;
DROP POLICY IF EXISTS "Users can update their own filters" ON public.user_filters;
DROP POLICY IF EXISTS "Users can delete their own filters" ON public.user_filters;

CREATE POLICY "Users can view their own filters"
  ON public.user_filters
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND (SELECT public.get_user_role()) IS NOT NULL
  );

CREATE POLICY "Users can create their own filters"
  ON public.user_filters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (SELECT public.get_user_role()) IS NOT NULL
  );

CREATE POLICY "Users can update their own filters"
  ON public.user_filters
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND (SELECT public.get_user_role()) IS NOT NULL
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (SELECT public.get_user_role()) IS NOT NULL
  );

CREATE POLICY "Users can delete their own filters"
  ON public.user_filters
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND (SELECT public.get_user_role()) IS NOT NULL
  );

-- Auth lives outside the public-schema transaction, so application-user
-- deletion hands cleanup to a durable minimal outbox row. The table has no
-- client policies or grants: active HR Admin callers can interact with it only
-- through the two narrowly scoped SECURITY DEFINER functions below.
CREATE TABLE public.app_user_auth_cleanup_outbox (
  cleanup_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL UNIQUE,
  auth_user_id uuid UNIQUE,
  cleanup_state text NOT NULL DEFAULT 'pending'
    CHECK (cleanup_state IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT app_user_auth_cleanup_completed_at_check CHECK (
    (cleanup_state = 'pending' AND completed_at IS NULL)
    OR (cleanup_state = 'completed' AND completed_at IS NOT NULL)
  )
);

ALTER TABLE public.app_user_auth_cleanup_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_auth_cleanup_outbox FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_user_auth_cleanup_outbox
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.app_user_auth_cleanup_outbox IS
  'Restricted minimal handoff for durable Supabase Auth cleanup; stores identifiers and state only, with no profile fields.';
COMMENT ON COLUMN public.app_user_auth_cleanup_outbox.cleanup_id IS
  'Opaque identifier returned to operators for safe cleanup retry.';

-- Delete the application user and enqueue Auth cleanup in one database
-- transaction. A foreign-key or invariant failure aborts both operations. A
-- same-ID retry returns the original outbox row without attempting a second
-- application-row delete.
CREATE OR REPLACE FUNCTION public.delete_app_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_target public.users%ROWTYPE;
  v_cleanup public.app_user_auth_cleanup_outbox%ROWTYPE;
  v_active_hr_admin_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required'
      USING ERRCODE = '22023';
  END IF;

  -- Share the status-transition lock so deactivation and deletion cannot race
  -- each other around the final-active-admin invariant.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.users.active_hr_admin_status', 0)
  );

  SELECT id, role
  INTO v_actor_id, v_actor_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF v_actor_id IS NULL OR v_actor_role <> 'hr_admin' THEN
    RAISE EXCEPTION 'Insufficient permission to delete user'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id = v_actor_id THEN
    RAISE EXCEPTION 'Cannot delete the authenticated HR Admin'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_cleanup
  FROM public.app_user_auth_cleanup_outbox
  WHERE app_user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'cleanup_id', v_cleanup.cleanup_id,
      'auth_user_id', v_cleanup.auth_user_id,
      'cleanup_state', v_cleanup.cleanup_state
    );
  END IF;

  SELECT *
  INTO v_target
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_target.role = 'hr_admin' AND v_target.is_active = true THEN
    SELECT count(*)
    INTO v_active_hr_admin_count
    FROM public.users
    WHERE role = 'hr_admin'
      AND is_active = true;

    IF v_active_hr_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the final active HR Admin'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  DELETE FROM public.users
  WHERE id = p_user_id
  RETURNING * INTO v_target;

  INSERT INTO public.app_user_auth_cleanup_outbox (
    app_user_id,
    auth_user_id,
    cleanup_state,
    completed_at
  )
  VALUES (
    v_target.id,
    v_target.auth_user_id,
    CASE WHEN v_target.auth_user_id IS NULL THEN 'completed' ELSE 'pending' END,
    CASE WHEN v_target.auth_user_id IS NULL THEN now() ELSE NULL END
  )
  RETURNING * INTO v_cleanup;

  RETURN pg_catalog.jsonb_build_object(
    'cleanup_id', v_cleanup.cleanup_id,
    'auth_user_id', v_cleanup.auth_user_id,
    'cleanup_state', v_cleanup.cleanup_state
  );
END;
$$;

ALTER FUNCTION public.delete_app_user(uuid) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.delete_app_user(uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.delete_app_user(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.delete_app_user(uuid) IS
  'Caller-bound, retry-safe app-user deletion that atomically records a minimal Auth cleanup handoff with no profile fields and preserves the final active HR Admin.';

CREATE OR REPLACE FUNCTION public.complete_app_user_auth_cleanup(
  p_cleanup_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cleanup public.app_user_auth_cleanup_outbox%ROWTYPE;
BEGIN
  IF p_cleanup_id IS NULL THEN
    RAISE EXCEPTION 'Cleanup id is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_cleanup
  FROM public.app_user_auth_cleanup_outbox
  WHERE cleanup_id = p_cleanup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth cleanup handoff not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_cleanup.cleanup_state = 'pending' THEN
    UPDATE public.app_user_auth_cleanup_outbox
    SET cleanup_state = 'completed',
        updated_at = now(),
        completed_at = now()
    WHERE cleanup_id = p_cleanup_id
    RETURNING * INTO v_cleanup;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'cleanup_id', v_cleanup.cleanup_id,
    'cleanup_state', v_cleanup.cleanup_state,
    'completed_at', v_cleanup.completed_at
  );
END;
$$;

ALTER FUNCTION public.complete_app_user_auth_cleanup(uuid) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.complete_app_user_auth_cleanup(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_app_user_auth_cleanup(uuid)
  TO service_role;

COMMENT ON FUNCTION public.complete_app_user_auth_cleanup(uuid) IS
  'Service-role-only attestation that the external Supabase Auth deletion completed or returned not-found.';

COMMIT;
