-- Story 22.13 review patch: serialize HR-admin status transitions so two
-- concurrent requests cannot deactivate the final active administrators.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_user_active_status(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_target public.users%ROWTYPE;
  v_active_hr_admin_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Every caller of this function takes the same transaction-scoped lock.
  -- The actor is checked only after the lock is acquired, so a caller that was
  -- deactivated by the preceding transaction cannot continue on stale auth.
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
    RAISE EXCEPTION 'Insufficient permission to change user status'
      USING ERRCODE = '42501';
  END IF;

  IF p_is_active IS NULL THEN
    RAISE EXCEPTION 'User status is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_user_id = v_actor_id AND p_is_active = false THEN
    RAISE EXCEPTION 'Cannot deactivate the authenticated HR Admin'
      USING ERRCODE = '42501';
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

  IF p_is_active = false
    AND v_target.role = 'hr_admin'
    AND v_target.is_active = true
  THEN
    SELECT count(*)
    INTO v_active_hr_admin_count
    FROM public.users
    WHERE role = 'hr_admin'
      AND is_active = true;

    IF v_active_hr_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot deactivate the final active HR Admin'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.users
  SET is_active = p_is_active
  WHERE id = p_user_id
  RETURNING * INTO v_target;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_target.id,
    'email', v_target.email,
    'role', v_target.role,
    'is_active', v_target.is_active,
    'created_at', v_target.created_at,
    'last_active_at', v_target.last_active_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_active_status(uuid, boolean)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_user_active_status(uuid, boolean)
  TO authenticated;

COMMENT ON FUNCTION public.set_user_active_status(uuid, boolean) IS
  'Caller-bound HR Admin status transition serialized to preserve at least one active HR administrator.';

COMMIT;
