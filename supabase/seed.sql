-- Local development seed (Story 22.10)
--
-- PURPOSE: grant the public-schema API-role privileges that the HOSTED Supabase
-- platform provisions automatically, but that the local Supabase CLI stack does
-- NOT set for postgres-owned tables. On the local stack the `postgres` default
-- table ACL grants only TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (Dxtm) to
-- anon/authenticated/service_role — not SELECT/INSERT/UPDATE/DELETE — so a
-- migration-built local database cannot serve the API or run the RLS evidence
-- suite until these grants exist. Hosted staging/production already have these
-- grants (that is why the deployed app works), so this only reconciles the LOCAL
-- environment to match hosted.
--
-- SCOPE: seed.sql runs ONLY on `supabase db reset` / `supabase start` (local).
-- It is NEVER applied by `supabase db push`, so it does NOT touch staging or
-- production and is consistent with the Story 22.10 production-change freeze and
-- the migrations-only change policy (this is local-stack parity, not hosted
-- schema). Row access remains governed by RLS — these grants only let the API
-- roles reach the tables so RLS is the boundary under test.
--
-- NOTE: TABLES and SEQUENCES only. Function EXECUTE grants are intentionally
-- managed by migrations (see
-- 20260614000000_reconcile_environments_security_and_policies.sql) and must NOT
-- be broadened here, or the SECURITY DEFINER grant tightening would be undone
-- locally.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- Story 22.13 least-privilege exceptions. Keep these after the blanket local
-- parity grants above: a clean `supabase db reset` must not reopen direct
-- privileged user updates or caller-forged employee audit inserts.
REVOKE UPDATE ON TABLE public.users FROM authenticated;
REVOKE UPDATE ON TABLE public.users FROM anon;

REVOKE INSERT ON TABLE public.employee_column_changes FROM authenticated;
REVOKE INSERT ON TABLE public.employee_column_changes FROM anon;

-- Story 22.15 restricted outbox. The blanket local parity grant above must not
-- reopen this operator-only handoff table after the migration has revoked it.
REVOKE ALL ON TABLE public.app_user_auth_cleanup_outbox
  FROM PUBLIC, anon, authenticated, service_role;
