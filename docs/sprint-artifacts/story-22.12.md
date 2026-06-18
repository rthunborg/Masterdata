# Story 22.12: Add Backup Failure Alerting and Decide Staging Refresh/User Backup Scope

## Status

done

- **Priority:** P1
- **Story Points:** 2
- **Dependencies:** `22.8`, `22.11`

## Description

As an operations owner, I want nightly backup failures to alert immediately and the user-data scope of backups and staging refreshes decided explicitly, so that silent backup gaps cannot recur and recovery expectations for login users are deliberate rather than accidental.

Source findings (Story 22.8): the 2026-06-05 nightly run failed at the "Setup Supabase CLI" step (transient infrastructure failure) and went unnoticed for six days — discovered only because the restore drill found the date missing from the `db-backups` bucket. Scope facts to build on: `public.users` IS already included in the nightly `data.sql` dump; the Supabase-managed `auth` schema is excluded by dump design; the nightly staging refresh intentionally restores only `employees` and `column_config` (originally to avoid emailing real users from staging — a rationale Story 22.11 removes).

## Acceptance Criteria

- [x] AC1: The nightly backup workflow notifies an agreed channel on failure (e.g. `if: failure()` step using existing SMTP or GitHub notifications), verified by a controlled test.
- [x] AC2: Transient "Setup Supabase CLI" failures are retried once before the run fails.
- [x] AC3: The staging refresh and backup scope for `users`/auth identities is explicitly decided and documented: either extend the staging refresh (safe once 22.11 lands) or keep the exclusion, with the auth-provisioning recovery step in `docs/operations/database-restore.md` acknowledged as the accepted manual step either way.
- [x] AC4: `09_operations_support_and_sla.md`, `14_evidence_index.md` (Backup row), and the `R-007` follow-ups are updated to reflect alerting and the scope decision.
- [x] AC5: No secrets in committed files; workflow/script changes pass the full mandatory gates.

## Technical Notes

- Changes touch `.github/workflows/supabase-nightly-backup.yml` (and possibly `scripts/supabase-backup-storage.mjs`), so the full gates are mandatory per project rules.
- Never point alerting or test runs at production restore paths; staging restore timing must respect the 02:00 UTC schedule.
- Do not store notification credentials in the repo; use existing GitHub secrets.

## Testing Requirements

**Estimated tests:** 1

- One controlled failure-notification verification (manual `workflow_dispatch` with induced failure or equivalent), recorded with run metadata; full automated gates because workflow/script files change.

## Definition of Done

- Alerting works and is verified; scope decision documented and synchronized across readiness surfaces; full gates pass.
