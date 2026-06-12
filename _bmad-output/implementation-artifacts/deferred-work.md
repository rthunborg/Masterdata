## Deferred from: code review of 22-8-package-supabase-security-evidence-and-run-restore-drill (2026-06-11)

- Migration version-ordering anomaly: `supabase/migrations/20250113000000_add_room_assignment_rpc.sql` sorts nine months before `20251027000000_initial_schema.sql`, so a clean `supabase db reset` applies the RPC migration pre-schema; this weakens the evidence package's claim that the migration directory is the canonical rebuild source. Pre-existing repo state, not introduced by Story 22.8 — fold into Story 22.10 (environment reconciliation and migration-history baseline).

## Deferred from: code review of story-22.7 (2026-06-10)

- Pre-existing arbitrary user-activity update risk remains documented in the API matrix. The Story 22.7 diff documents that `/api/admin/users/[id]/update-activity` can be called by any authenticated user with an arbitrary route id, but that route behavior predates this story and is not part of the role/export/RLS evidence-test implementation scope.
