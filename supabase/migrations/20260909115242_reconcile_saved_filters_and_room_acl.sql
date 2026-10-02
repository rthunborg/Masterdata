-- Story 22.15: forward-only reconciliation of the documented staging catalog.
--
-- This migration deliberately follows the historical user_filters migration
-- instead of replaying it. The staging pre-apply catalog verifier proves the
-- one reviewed represented shape with no invalid saved-filter rows before this file
-- may be applied. Every resulting object has the same canonical contract as a
-- clean migration-built database.

BEGIN;

-- The read-only staging proof records these aggregates before authorization.
-- Recheck inside this transaction so a newly-created invalid row cannot be
-- hidden between approval and constraint validation.
DO $$
DECLARE
  orphan_auth_references integer;
  empty_names integer;
  overlength_names integer;
BEGIN
  SELECT
    count(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.users AS auth_user
        WHERE auth_user.id = saved_filter.user_id
      )
    ),
    count(*) FILTER (WHERE char_length(saved_filter.name) = 0),
    count(*) FILTER (WHERE char_length(saved_filter.name) > 50)
  INTO orphan_auth_references, empty_names, overlength_names
  FROM public.user_filters AS saved_filter;

  IF orphan_auth_references <> 0
    OR empty_names <> 0
    OR overlength_names <> 0 THEN
    RAISE EXCEPTION
      'user_filters requires approved data cleanup before reconciliation (orphans %, empty names %, overlength names %)',
      orphan_auth_references, empty_names, overlength_names;
  END IF;
END $$;

-- Preserve the established dietary permissions and add only the existing
-- admin_limited read-only extension. Do not replace role_permissions wholesale:
-- historical migrations did that and could erase later access decisions.
UPDATE public.column_config
SET role_permissions = role_permissions || jsonb_build_object(
  'admin_limited',
  jsonb_build_object('view', true, 'edit', false)
)
WHERE db_column_name IN ('diet_details', 'special_diet');

-- The recorded staging table has the right six columns but differs from the
-- historical create migration: filters has a [] default, its UNIQUE/CHECK
-- constraints use represented names, and it lacks the FK and standalone
-- indexes. The preceding read-only gate requires exactly that shape and zero
-- rows requiring cleanup before this transactional canonicalization runs.
ALTER TABLE public.user_filters
  ALTER COLUMN filters DROP DEFAULT;

DO $$
BEGIN
  -- The staging profile is constrained by exact catalog names. A clean
  -- migration-built database already has the canonical names and therefore
  -- takes the no-op branch.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.user_filters'::regclass
      AND conname = 'user_filters_user_id_name_key'
  ) THEN
    ALTER TABLE public.user_filters
      DROP CONSTRAINT user_filters_user_id_name_key;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.user_filters'::regclass
      AND conname = 'unique_user_filter_name'
  ) THEN
    RAISE EXCEPTION
      'user_filters has neither the reviewed staging nor canonical unique constraint';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.user_filters'::regclass
      AND conname = 'user_filters_name_check'
  ) THEN
    ALTER TABLE public.user_filters
      DROP CONSTRAINT user_filters_name_check;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.user_filters'::regclass
      AND conname = 'valid_name_length'
  ) THEN
    RAISE EXCEPTION
      'user_filters has neither the reviewed staging nor canonical name check';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.user_filters'::regclass
      AND conname = 'user_filters_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_filters
      ADD CONSTRAINT user_filters_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.user_filters'::regclass
      AND conname = 'unique_user_filter_name'
  ) THEN
    ALTER TABLE public.user_filters
      ADD CONSTRAINT unique_user_filter_name UNIQUE (user_id, name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.user_filters'::regclass
      AND conname = 'valid_name_length'
  ) THEN
    ALTER TABLE public.user_filters
      ADD CONSTRAINT valid_name_length
        CHECK (char_length(name) > 0 AND char_length(name) <= 50);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_filters_user_id
  ON public.user_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_filters_name
  ON public.user_filters(user_id, lower(name));

DROP TRIGGER IF EXISTS user_filters_updated_at ON public.user_filters;
DROP TRIGGER IF EXISTS set_updated_at ON public.user_filters;
DROP FUNCTION IF EXISTS public.update_user_filters_updated_at();

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_filters
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- PUBLIC supplies the existing effective RPC access. Remove redundant direct
-- grants so the catalog ACL is canonical and reviewable.
REVOKE EXECUTE ON FUNCTION public.recalculate_rooms_for_date(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.calculate_room_number(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_rooms_for_date(uuid)
  TO PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_room_number(uuid, text, text)
  TO PUBLIC, authenticated;

COMMIT;
