-- Migration: adopt column_config.is_checklist_item into migrations
-- Epic 22 follow-up to Story 22.10 (environment reconciliation).
--
-- Story 19.5 added `column_config.is_checklist_item` via the Supabase dashboard,
-- but no migration ever created it. The app reads and writes it throughout
-- (createCustomColumn in the column-config repository, the admin PATCH route,
-- column validation, the checklist progress UI), so on any migration-built
-- environment (local / CI / a rebuilt staging or production) custom-column
-- creation failed with:
--   "Could not find the 'is_checklist_item' column of 'column_config' in the
--    schema cache"
--
-- This is the same dashboard-era drift class as the important_dates.deadline_*
-- columns adopted by the Story 22.10 reconciliation migration. Type/default match
-- the app contract (boolean, defaults false; only boolean masterdata columns are
-- ever set true). Guarded with IF NOT EXISTS so it is a no-op on the hosted
-- databases that already have the column.

ALTER TABLE public.column_config
  ADD COLUMN IF NOT EXISTS is_checklist_item boolean NOT NULL DEFAULT false;
