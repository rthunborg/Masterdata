-- Story 22.13 review patch: keep assigned custom-column presentation edits
-- caller-bound and atomic at the database trust boundary.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_assigned_column_presentation(
  p_column_id uuid,
  p_updates jsonb
)
RETURNS public.column_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_role text;
  v_existing public.column_config%ROWTYPE;
  v_updated public.column_config%ROWTYPE;
  v_target_category text;
  v_category_color text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT role
  INTO v_actor_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF v_actor_role IS NULL OR v_actor_role = 'hr_admin' THEN
    RAISE EXCEPTION 'Insufficient permission to update assigned column presentation'
      USING ERRCODE = '42501';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Column presentation updates must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_updates) AS supplied(key)
    WHERE supplied.key NOT IN ('column_name', 'category', 'category_color')
  ) THEN
    RAISE EXCEPTION 'Unsupported column presentation field'
      USING ERRCODE = '22023';
  END IF;

  IF p_updates ? 'column_name'
    AND (
      jsonb_typeof(p_updates -> 'column_name') <> 'string'
      OR btrim(p_updates ->> 'column_name') = ''
      OR char_length(p_updates ->> 'column_name') > 50
    )
  THEN
    RAISE EXCEPTION 'Invalid column display name'
      USING ERRCODE = '22023';
  END IF;

  IF p_updates ? 'category'
    AND (
      jsonb_typeof(p_updates -> 'category') <> 'string'
      OR char_length(p_updates ->> 'category') > 100
    )
  THEN
    RAISE EXCEPTION 'Invalid column category'
      USING ERRCODE = '22023';
  END IF;

  IF p_updates ? 'category_color'
    AND p_updates -> 'category_color' <> 'null'::jsonb
    AND (
      jsonb_typeof(p_updates -> 'category_color') <> 'string'
      OR (p_updates ->> 'category_color') !~ '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$'
    )
  THEN
    RAISE EXCEPTION 'Invalid category color'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.column_config
  WHERE id = p_column_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Column configuration not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_existing.is_masterdata
    OR COALESCE(
      (v_existing.role_permissions -> v_actor_role ->> 'edit')::boolean,
      false
    ) IS NOT TRUE
  THEN
    RAISE EXCEPTION 'Insufficient permission to update assigned column presentation'
      USING ERRCODE = '42501';
  END IF;

  v_target_category := CASE
    WHEN p_updates ? 'category' THEN p_updates ->> 'category'
    ELSE v_existing.category
  END;
  v_category_color := CASE
    WHEN p_updates -> 'category_color' = 'null'::jsonb THEN NULL
    ELSE p_updates ->> 'category_color'
  END;

  IF p_updates ? 'category_color'
    AND NULLIF(v_target_category, '') IS NOT NULL
  THEN
    UPDATE public.column_config
    SET category_color = v_category_color
    WHERE is_masterdata = false
      AND (id = p_column_id OR category = v_target_category)
      AND COALESCE(
        (role_permissions -> v_actor_role ->> 'edit')::boolean,
        false
      ) IS TRUE;
  END IF;

  UPDATE public.column_config
  SET
    column_name = CASE
      WHEN p_updates ? 'column_name' THEN p_updates ->> 'column_name'
      ELSE column_name
    END,
    category = CASE
      WHEN p_updates ? 'category' THEN p_updates ->> 'category'
      ELSE category
    END,
    category_color = CASE
      WHEN p_updates ? 'category_color' THEN v_category_color
      ELSE category_color
    END
  WHERE id = p_column_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_assigned_column_presentation(uuid, jsonb)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_assigned_column_presentation(uuid, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.update_assigned_column_presentation(uuid, jsonb) IS
  'Atomically rechecks the active caller role and assigned edit permission before updating safe custom-column presentation fields.';

COMMIT;
