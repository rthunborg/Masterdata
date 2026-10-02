-- Migration: Reconcile Supabase environments — security hardening + policy/schema reconciliation
-- Story 22.10 (Epic 22 — External Presentation & Handover Readiness)
-- Created: 2026-06-14
--
-- Encodes the intended end state for the hosted databases so that production,
-- staging, and the versioned migrations converge on one authoritative
-- schema/policy source. Authored to be ENVIRONMENT-AGNOSTIC and
-- IDEMPOTENT/GUARDED: on a migration-built environment (local) it is a no-op or
-- a clean recreate; on the dashboard-built hosted databases (staging/production)
-- it removes the dashboard-era drift regardless of the drifted object NAMES. The
-- same file is applied to staging now (Story 22.10 Phase A) and to production at
-- the Epic 22 production cutover (Phase B).
--
-- Concerns addressed (from Story 22.8 findings / live Supabase advisors):
--   1. function_search_path_mutable: pin search_path on every flagged function
--      (guarded by to_regprocedure so only existing signatures are altered).
--      Uses the existing `SET search_path = public, pg_temp` convention (from
--      20260607193000); function bodies already schema-qualify cross-schema refs
--      (auth.uid(), public.users) and use bare public objects that still resolve.
--   2. anon/authenticated *_security_definer_function_executable: tighten EXECUTE
--      grants on SECURITY DEFINER functions; keep grants only where a verified
--      app caller needs them (callers checked in src/).
--   3. R-020 schema drift: drop staging-only junk custom columns (asdas,
--      testerere); adopt the hosted-only important_dates.deadline_* columns the
--      app requires. Runtime custom columns (e.g. employees.seably_*) are managed
--      via the add_custom_column_to_employees feature + column_config and are
--      intentionally NOT migration schema, so they are left untouched.
--   4. R-023 hosted RLS policy drift + multiple_permissive_policies +
--      auth_rls_initplan: drop ALL existing policies on the managed tables (clears
--      dashboard-era drift regardless of names — hosted databases use different
--      policy names than migrations) and recreate the canonical set scoped
--      TO authenticated, with auth/role lookups wrapped in (select ...), and
--      same-table/same-action policies merged.

BEGIN;

-- =========================================================================
-- 1. Pin search_path on flagged functions (function_search_path_mutable)
-- =========================================================================
DO $$
DECLARE
  sig text;
  sigs text[] := ARRAY[
    'public.get_user_role()',
    'public.update_updated_at_column()',
    'public.trigger_set_updated_at()',
    'public.update_user_filters_updated_at()',
    'public.remove_jsonb_key(text, text)',
    'public.add_custom_column_to_employees(text, text)',
    'public.update_staffing_need(text, integer, uuid)',
    'public.update_date_spots(uuid, uuid, uuid, text, jsonb)',
    'public.release_date_capacity(uuid, uuid)',
    'public.recalculate_rooms_for_date(uuid)',
    'public.calculate_room_number(uuid, text, text)',
    -- already pinned in 20260607193000; re-assert to guarantee posture on
    -- hosted environments whose history predates that migration.
    'public.track_employee_column_changes()'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', sig);
    END IF;
  END LOOP;
END $$;

-- =========================================================================
-- 2. Tighten EXECUTE grants on SECURITY DEFINER functions
--    Decisions (callers verified in src/):
--      - remove_jsonb_key: NO app caller (its own comment says service_role only)
--                          -> lock to service_role.
--      - add_custom_column_to_employees: real authenticated caller
--                          (column-config-repository via the user-scoped server
--                          client; app gates on HR Admin). Drop anon/PUBLIC;
--                          keep authenticated.
--      - update_staffing_need: real authenticated caller
--                          (staffing-needs-repository; RLS + app restrict to
--                          hr_admin/crewing). Drop anon/PUBLIC; keep authenticated.
--      - track_employee_column_changes: a trigger function; it fires from the
--                          employees trigger regardless of direct EXECUTE grants,
--                          so revoke the RPC-callable grant entirely (clears its
--                          anon/authenticated security-definer advisor without
--                          affecting the trigger).
--      - get_user_role: intentionally left executable by anon + authenticated.
--                          It is invoked during RLS policy evaluation for every
--                          role that touches an RLS-protected table; it returns
--                          only the caller's own role (NULL for anon) and leaks
--                          nothing. Revoking anon would turn graceful row-level
--                          denials into "permission denied for function" errors.
-- =========================================================================
DO $$
BEGIN
  IF to_regprocedure('public.remove_jsonb_key(text, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.remove_jsonb_key(text, text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.remove_jsonb_key(text, text) TO service_role;
  END IF;

  IF to_regprocedure('public.add_custom_column_to_employees(text, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.add_custom_column_to_employees(text, text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.add_custom_column_to_employees(text, text) TO authenticated, service_role;
  END IF;

  IF to_regprocedure('public.update_staffing_need(text, integer, uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.update_staffing_need(text, integer, uuid) TO authenticated, service_role;
  END IF;

  IF to_regprocedure('public.track_employee_column_changes()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.track_employee_column_changes() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- =========================================================================
-- 3. R-020 schema drift
-- =========================================================================
-- 3a. Remove staging-only junk custom columns (no-op on local/production).
ALTER TABLE public.employees DROP COLUMN IF EXISTS asdas;
ALTER TABLE public.employees DROP COLUMN IF EXISTS testerere;

-- 3b. Adopt-into-migrations: important_dates.deadline_submit / deadline_cancel
--     exist on the hosted (dashboard-built) databases and are used throughout
--     the app (src/lib/services/date-capacity.ts deadline checks, the
--     important-dates API/validation/components, CSV import), but were never
--     added via migrations. A migration-built environment was therefore missing
--     them, so date-capacity employee assignment ("Failed to fetch date
--     information") and important-date deadline features broke on any rebuilt
--     stack. Type mirrors the existing text-based date convention
--     (important_dates.date_value is text); nullable, matching the app contract
--     (z.string().nullable().optional()). No-op on hosted environments that
--     already have the columns.
ALTER TABLE public.important_dates ADD COLUMN IF NOT EXISTS deadline_submit text;
ALTER TABLE public.important_dates ADD COLUMN IF NOT EXISTS deadline_cancel text;

-- =========================================================================
-- 4. RLS policy reconciliation (R-023 + multiple_permissive_policies +
--    auth_rls_initplan).
--    Drop ALL existing policies on the managed tables first — this clears
--    dashboard-era drift regardless of the drifted policy NAMES (hosted
--    databases use different names than migrations, e.g. "HR Admin can manage
--    column config", "Users can read own filters") — then recreate the canonical
--    set: scoped TO authenticated, auth/role lookups wrapped in (select ...) to
--    collapse auth_rls_initplan, and same-table/same-action policies merged.
--    "Everyone can read ..." policies stay role-unscoped (anon-safe).
--    public.pe3_notifications_log is intentionally left as-is (RLS enabled,
--    deny-by-default, no policies — service-role log table).
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('employees', 'column_config', 'important_dates', 'staffing_needs',
                        'staffing_needs_changelog', 'user_filters', 'employee_column_changes', 'users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ---- employees ----------------------------------------------------------
CREATE POLICY "HR Admin and Recruiter can manage employees" ON public.employees
  FOR ALL TO authenticated
  USING ((select public.get_user_role()) = ANY (ARRAY['hr_admin', 'recruiter']));

CREATE POLICY "External parties can view employees" ON public.employees
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) = ANY (ARRAY['sodexo', 'omc', 'payroll', 'toplux', 'crewing'])
    AND is_archived = false
  );

-- ---- column_config ------------------------------------------------------
-- Public read stays role-unscoped (single SELECT policy for anon + authenticated).
CREATE POLICY "Everyone can read column configs" ON public.column_config
  FOR SELECT USING (true);

-- HR Admin is the column administrator (creates/deletes custom is_masterdata=false
-- columns via the app's authenticated client), so HR Admin manages ALL
-- column_config; external parties manage only their own custom columns. (R-023:
-- the migration policy previously restricted HR to is_masterdata = true, which
-- denied the app's column-admin feature on migration-built databases.)
CREATE POLICY "Manage column configs" ON public.column_config
  FOR ALL TO authenticated
  USING (
    (select public.get_user_role()) = 'hr_admin'
    OR (
      (select public.get_user_role()) = ANY (ARRAY['sodexo', 'omc', 'payroll', 'toplux'])
      AND is_masterdata = false
      AND role_permissions ? (select public.get_user_role())
    )
  );

-- ---- important_dates ----------------------------------------------------
CREATE POLICY "Everyone can read important dates" ON public.important_dates
  FOR SELECT USING (true);

CREATE POLICY "HR Admin and Recruiter can manage important dates" ON public.important_dates
  FOR ALL TO authenticated
  USING ((select public.get_user_role()) = ANY (ARRAY['hr_admin', 'recruiter']));

-- ---- staffing_needs -----------------------------------------------------
CREATE POLICY "staffing_needs_select" ON public.staffing_needs
  FOR SELECT TO authenticated
  USING ((select public.get_user_role()) IS NOT NULL);

CREATE POLICY "staffing_needs_update" ON public.staffing_needs
  FOR UPDATE TO authenticated
  USING ((select public.get_user_role()) = ANY (ARRAY['hr_admin', 'crewing']));

-- ---- staffing_needs_changelog -------------------------------------------
CREATE POLICY "staffing_needs_changelog_insert" ON public.staffing_needs_changelog
  FOR INSERT TO authenticated
  WITH CHECK ((select public.get_user_role()) = ANY (ARRAY['hr_admin', 'crewing']));

CREATE POLICY "staffing_needs_changelog_select" ON public.staffing_needs_changelog
  FOR SELECT TO authenticated
  USING ((select public.get_user_role()) IS NOT NULL);

-- ---- user_filters -------------------------------------------------------
CREATE POLICY "Users can view their own filters" ON public.user_filters
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own filters" ON public.user_filters
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own filters" ON public.user_filters
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own filters" ON public.user_filters
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---- employee_column_changes --------------------------------------------
CREATE POLICY "Enable insert for authenticated users" ON public.employee_column_changes
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Enable select for authenticated users" ON public.employee_column_changes
  FOR SELECT TO authenticated
  USING ((select auth.role()) = 'authenticated');

-- ---- users --------------------------------------------------------------
-- Merge the two SELECT policies and the two UPDATE policies (hr_admin scope OR
-- own-record scope) into one each to collapse multiple_permissive_policies.
CREATE POLICY "HR Admin can insert users" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK ((select public.get_user_role()) = 'hr_admin');

CREATE POLICY "Users can read users" ON public.users
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) = 'hr_admin'
    OR auth_user_id = (select auth.uid())
  );

CREATE POLICY "Users can update users" ON public.users
  FOR UPDATE TO authenticated
  USING (
    (select public.get_user_role()) = 'hr_admin'
    OR auth_user_id = (select auth.uid())
  )
  WITH CHECK (
    (select public.get_user_role()) = 'hr_admin'
    OR auth_user_id = (select auth.uid())
  );

COMMIT;
