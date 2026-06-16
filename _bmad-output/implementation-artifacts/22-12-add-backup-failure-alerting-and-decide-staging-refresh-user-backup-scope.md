---
baseline_commit: 5a6096948d1c1ace3287aa71b922b886da29f5e8
---

# Story 22.12: Add Backup Failure Alerting and Decide Staging Refresh/User Backup Scope

## Status

review

- **Priority:** P1
- **Story Points:** 2
- **Dependencies:** `22.8` (done — restore drill surfaced the backup gap + the two follow-ups), `22.11` (done — non-production email suppression removes the email-spam rationale for the staging-refresh `users` exclusion). No story is blocked by this one.
- **Canonical planning artifact:** `docs/sprint-artifacts/story-22.12.md`
- **Epic source:** `_bmad-output/planning-artifacts/epics.md` § "Story 22.12" (lines 299–313)

> **🚫 PRODUCTION-CHANGE FREEZE (owner directive, Epic 22):** Do **NOT** change production environment variables, production data, or production Supabase/Vercel behavior in this story. This story only **adds alerting + a retry** to an existing GitHub Actions workflow and updates docs — no production DB/env change. Two boundaries: (a) any **new GitHub repository secret** required for the alert channel is an **owner action item** (the dev agent has no repo-secret access), and (b) the controlled failure **test must never point at a production restore path** and must respect the 02:00 UTC schedule (Task 5).

## Story

As an operations owner,
I want nightly backup failures to alert immediately (with a one-shot retry on transient CLI setup failures) and the user-data scope of backups and staging refreshes decided explicitly,
so that silent backup gaps cannot recur and recovery expectations for login users are deliberate rather than accidental.

**Why this matters now:** The nightly backup workflow `.github/workflows/supabase-nightly-backup.yml` has **zero failure alerting** — the only failure tolerance is `continue-on-error: true` on two dump steps ([:56](.github/workflows/supabase-nightly-backup.yml), [:69](.github/workflows/supabase-nightly-backup.yml)), which *swallow* errors silently. The 2026-06-05 run failed at the **"Setup Supabase CLI"** step ([:46-49](.github/workflows/supabase-nightly-backup.yml), a transient infrastructure failure) and **went unnoticed for six days** — discovered only because the Story 22.8 restore drill found `2026-06-05` missing from the `db-backups` bucket (`docs/commercial-readiness/evidence/restore-drill-2026-06-11.md:50`). Two follow-ups were filed against this story (risk `R-007`): (1) **add backup-failure alerting**, and (2) **decide + document the `users`/auth backup + staging-refresh scope** now that Story 22.11 removes the email-spam reason for the exclusion.

## Acceptance Criteria

- [x] **AC1 (failure alerting):** The nightly backup workflow notifies an agreed channel when **any step fails**, verified by a controlled test. Implement as a single `if: failure()` step appended to the `backup-and-restore` job so it fires for *any* failed step (CLI setup, dump, upload, or the staging restore). **Decided (owner, 2026-06-16): open/append a labelled `backup-failure` GitHub issue via the `gh` CLI using the built-in `GITHUB_TOKEN` — zero new secrets** (the step needs BOTH `permissions: issues: write` AND `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`). **Do not reuse `src/lib/services/email-service.ts`** (it is suppressed in non-production by Story 22.11 and needs SMTP secrets the CI does not have).
- [x] **AC2 (retry transient CLI setup):** The **"Setup Supabase CLI"** step ([:46-49](.github/workflows/supabase-nightly-backup.yml)) is retried **once** before the run fails, so a single transient setup failure (the 2026-06-05 cause) self-heals. See Dev Notes "AC2 retry options".
- [x] **AC3 (scope decision documented):** The staging-refresh and backup scope for `users`/auth identities is **explicitly decided and documented**. The decision is recorded in `docs/operations/database-restore.md` with the **auth-provisioning recovery step acknowledged as the accepted manual step either way** (because `auth.users` is outside logical-backup scope regardless of the choice). **Decided (owner-confirmed 2026-06-16): KEEP the `users` exclusion in the staging refresh** — see Dev Notes "AC3 decision". Do **not** extend the refresh to `users`.
- [x] **AC4 (readiness surfaces synced):** `09_operations_support_and_sla.md`, `14_evidence_index.md` (Backup row), and the `R-007` follow-ups in `11_risk_register_and_open_questions.md` are updated to reflect that alerting + retry exist and the scope decision is made. Keep the two Story-22.12 bullets in `00_index.md` consistent (precedent, not strictly in the AC list). Reconcile the matching clause in `R-019`.
- [x] **AC5 (tests + gates):** New automated coverage for the change (the alert-message builder — see Dev Notes "AC5 test strategy") **plus** one controlled failure-notification verification (manual `workflow_dispatch` with an induced failure on a non-production branch, never a production restore path), recorded as evidence with run metadata. **Decided (owner, 2026-06-16): the dev agent runs this controlled verification during implementation — it is NOT an owner action item.** **No secrets in committed files.** Full mandatory gates pass: `npx vitest run` EXIT:0, `pnpm lint` (0 errors), `npx tsc --noEmit` EXIT:0. Playwright is **N/A** (no UI/route/app-runtime change) — state this explicitly; the docs-only test waiver does **not** apply (this story changes workflow/script code).

## Tasks / Subtasks

- [x] **Task 1 — Add backup-failure alerting** (AC: 1)
  - [x] Append a final step to the `backup-and-restore` job in `.github/workflows/supabase-nightly-backup.yml` guarded by `if: failure()` so it runs when *any* prior step fails. Place it after the staging-restore step ([:91-102](.github/workflows/supabase-nightly-backup.yml)) so it also captures a failed restore.
  - [x] **Channel (owner-decided 2026-06-16): the `gh` CLI** — open/append a labelled `backup-failure` GitHub issue using the built-in `GITHUB_TOKEN` (e.g. `gh issue list --label backup-failure` then `gh issue create`/`gh issue comment`), so the failure is durable and visible with **zero new secrets**. The email/`SMTP_*` marketplace-action option was considered and **rejected** to avoid new secret provisioning.
  - [x] **Two required bits for the `gh` channel — both easy to miss, both will silently break the alert if omitted:** (1) grant `permissions: issues: write` on the job/step (the default `GITHUB_TOKEN` is often read-only on scheduled runs); (2) **expose the token to the `gh` process** via `env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }` on the alert step — `permissions:` only sets the token's *scope*, it does not make `gh` authenticate. Without `GH_TOKEN`, `gh issue create` fails with an auth error (itself a silent alert failure — the exact bug class this story kills).
  - [x] Consider dedupe: prefer appending a comment to an existing open `backup-failure` issue over opening a new one each night, so repeated failures don't spam new issues.
  - [x] The alert content (subject/title + body) must include: the failed step/job, the workflow run URL (`${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`), and the UTC date — built via the tested helper from Task 4 (single source of truth). **No secrets, DB URLs, or personal data in the alert text.**

- [x] **Task 2 — Retry the "Setup Supabase CLI" step once** (AC: 2)
  - [x] Make the CLI setup self-heal on a single transient failure. Pick one (see Dev Notes "AC2 retry options"): (a) `nick-fields/retry@v3` with `max_attempts: 2` wrapping a `run:`-based CLI install; or (b) keep `supabase/setup-cli@v1` but add `id:` + `continue-on-error: true` and a second guarded attempt (`if: steps.<id>.outcome == 'failure'`); or (c) a bash `until` retry loop installing the CLI.
  - [x] **Also pin the CLI version** instead of `version: latest` ([:49](.github/workflows/supabase-nightly-backup.yml)) to a known-good version — `latest` resolves over the network at setup time and is the surface that failed; pinning reduces transient resolution failures. Record the pinned version in the workflow comment.
  - [x] Retry adds latency only on failure; the happy path is unchanged.

- [x] **Task 3 — Decide + document the `users`/auth + staging-refresh scope** (AC: 3)
  - [x] Apply the AC3 decision (owner-confirmed: **keep the `users` exclusion**) in `docs/operations/database-restore.md` (this file is git-ignored / local-only per the Story 22.8 File List — edit it locally; it is the operator runbook).
  - [x] Affirm the **auth re-provisioning** step (`database-restore.md:105`, "## Restore to Production (Disaster Recovery)") as the accepted manual recovery step **regardless of the scope choice**, because `auth.users` is never in the logical dump.
  - [x] Add an explicit statement of the staging-refresh scope decision (currently the doc only describes staging as a *full* restore target at `:66`, not the nightly *partial* refresh). State: 22.11 removed the email-spam concern, but the refresh **still excludes `users`** to avoid desyncing `public.users.auth_user_id` from staging `auth.users` (see rationale below). Keep the `public.users`-in-dump vs `auth.users`-excluded distinction clear (`database-restore.md:20`).
  - [x] The owner has confirmed **keep the exclusion** — do **not** extend the refresh to `users`. (For the record only: had they chosen to extend, the change points would be the `pg_dump -t` list at [:68](.github/workflows/supabase-nightly-backup.yml) and the TRUNCATE/restore at [:99-100](.github/workflows/supabase-nightly-backup.yml).)

- [x] **Task 4 — Extract a testable alert-message builder** (AC: 1, 5)
  - [x] Create a single source of truth for the alert text as a **pure function** so it is unit-testable and the workflow has no duplicated logic. **Constraint:** Vitest's `include` glob is `.ts`/`.tsx` only (`vitest.config.ts:16`) — a `*.test.mjs` is silently skipped. So either (a) put the builder in `src/lib/ops/backup-failure-alert.ts` (exported pure `buildBackupFailureAlert({ runUrl, runId, failedStep?, dateUtc }) => { subject, body }`) and have the workflow compute the same shape (test pins the canonical format), or (b) put it in a new ESM module `scripts/notify-backup-failure.mjs` with an **exported** pure builder and import it from a `.ts` Vitest test (a `.ts` test can import a `.mjs`). **Prefer (b)** if the workflow runs `node scripts/notify-backup-failure.mjs` (one module both builds and sends → no duplication). Keep the pure builder free of heavy top-level imports (no nodemailer/supabase at module top) so the test stays light.
  - [x] The builder must emit **PII-free, secret-free** text (run metadata + failed-step name only).

- [x] **Task 5 — Unit test + controlled failure verification** (AC: 5)
  - [x] Add a Vitest unit test under `tests/unit/epic-22/story-22.12/` (mirror the `tests/unit/epic-22/story-22.11/` layout) asserting `buildBackupFailureAlert(...)` output: contains the run URL, failed-step, and UTC date; and contains **no** secret/DB-URL/personal-data substrings. Mirror the proven message-builder test pattern in `tests/unit/epic-14/story-14.1/email-template.test.ts`.
  - [x] Run a **controlled failure verification**: trigger `workflow_dispatch` on a **non-production branch** with an induced early-step failure (e.g. temporarily fail a benign step *before* any production dump/restore step), confirm the `if: failure()` alert fires (a `backup-failure` issue is opened/commented), and record the GitHub run ID/URL as evidence. **Never** induce a failure that runs the production dump or staging restore against real targets; respect the 02:00 UTC schedule. **Owner directive 2026-06-16: run this during dev — minimize owner action items.** It requires the branch pushed to GitHub + `gh`/Actions access; do it on a non-production test branch. Only if Actions access is genuinely unavailable in the dev session, escalate to the owner rather than silently deferring.
  - [x] Create the evidence note `docs/commercial-readiness/evidence/backup-failure-alerting-2026-06-16.md` (or current date) with run metadata (no secrets), and link it from `14_evidence_index.md` (Backup row).

- [x] **Task 6 — Sync readiness surfaces** (AC: 4)
  - [x] `docs/commercial-readiness/09_operations_support_and_sla.md`: update the **Backup row** (`:15` — drop "failure alerting tracked in Story 22.12" → implemented), and the **"### Backups And Restore"** subsection (`:69-93`): the staging-refresh scope line (`:77`), the "Not verified" RTO/auth line (`:85`), and the Story 22.8 follow-ups paragraph (`:89`, which lists the two follow-ups this story closes).
  - [x] `docs/commercial-readiness/14_evidence_index.md`: update the **Backup row** (`:61`) Comment cell ("2026-06-05 nightly backup missing from bucket — add failure alerting" → alerting + retry added, scope decided); add/refresh the evidence link + run id. Bump the `Updated:` date.
  - [x] `docs/commercial-readiness/11_risk_register_and_open_questions.md`: update **`R-007`** (`:15`) Description / Recommended-action / Status so the two follow-ups (alerting, auth-provisioning scope) read **resolved**. Reconcile **`R-019`** (`:24`, the "not assured until backup-failure alerting exists (Story 22.12)" clause) and the **"Must Fix" bullet** (`:43`, "add backup-failure alerting"). Bump the `Updated:` date.
  - [x] `docs/commercial-readiness/00_index.md`: update the two Story-22.12 bullets (`:59` "## Verified", `:77` "## Needs Manual Review") to reflect alerting + the scope decision.

- [x] **Task 7 — Gates + status sync** (AC: 5)
  - [x] Run the full mandatory gates: `npx vitest run` (EXIT:0), `pnpm lint` (0 errors), `npx tsc --noEmit` (EXIT:0). Playwright **N/A** — state why (no UI/route/app-runtime change; YAML + script + docs only). Per project memory, full local e2e is environmentally unstable and not applicable here.
  - [x] Sync status across artifacts (Story 22.8 pattern): this story file → `done` only after code review; `_bmad-output/implementation-artifacts/sprint-status.yaml` and `docs/sprint-artifacts/epic-22-sprint-status.yaml` 22.12 entry; and `docs/sprint-artifacts/story-22.12.md` Status.

## Dev Notes

### Architecture / pattern constraints

- **One workflow does both backup AND staging refresh.** There is **no separate staging-refresh workflow** — the refresh is the final step of `.github/workflows/supabase-nightly-backup.yml` ([:91-102](.github/workflows/supabase-nightly-backup.yml)). The job is `backup-and-restore`, `environment: Production`, cron `0 2 * * *` (02:00 UTC) + `workflow_dispatch` ([:8-21](.github/workflows/supabase-nightly-backup.yml)). A single `if: failure()` step at the end covers every prior step.
- **Backup scope facts (confirmed via restore drill).** The `Dump data` step dumps the **entire `public` schema** (`-s public`, no `-x` exclusion, [:62](.github/workflows/supabase-nightly-backup.yml)), so **`public.users` IS in the nightly `data.sql`** (restore drill validated `users` row count = 18, `restore-drill-2026-06-11.md:30`). The Supabase-managed **`auth` schema is excluded by dump design** (both dumps scope to `public`), so `auth.users` (login identities) are **not** restorable from the logical backup — this is the crux of AC3.
- **The `users`-exclusion in the staging refresh is enforced in two places**, both in the workflow: the narrow `pg_dump -t public.employees -t public.column_config` ([:68](.github/workflows/supabase-nightly-backup.yml)) and the `TRUNCATE public.employees, public.column_config ... ` + reload ([:99-100](.github/workflows/supabase-nightly-backup.yml)). The inline comment at [:98](.github/workflows/supabase-nightly-backup.yml) ("leave auth, users, user_filters, important_dates, etc. as-is") is the rationale marker — it does **not** mention email; the email-spam rationale lives only in the story narrative + `docs/SUPABASE-BACKUP-AND-STAGING.md`.
- **Backup script** `scripts/supabase-backup-storage.mjs` only moves files to/from the `db-backups` bucket (`upload`/`prune`/`download-oldest`); it has **no notification hooks** and its logic is module-local (not exported). It does not decide table scope. You likely do not need to change it for AC1/AC2 unless you co-locate the notify entry point there.

### AC1 channel decision (READ — avoids a silent-failure trap)

- **Do NOT reuse `src/lib/services/email-service.ts` for the CI alert.** Three reasons: (1) Story 22.11 made it **suppress delivery by default in any non-production runtime** — a GitHub Actions runner is non-production, so `sendEmail()` would be a **silent no-op** unless `EMAIL_DELIVERY_OVERRIDE=true` is set; (2) it needs `SMTP_*` env that the CI does not have (`.env.example` SMTP defaults point at local Mailpit, and no `SMTP_*` GitHub secret exists); (3) it would require building the app in the backup job. Wiring it naively would *reproduce the silent-failure problem this story exists to fix*.
- **There is no existing CI notification pattern to copy** — only two workflows exist and neither notifies.
- **Decided (owner, 2026-06-16):** `if: failure()` step using the `gh` CLI + built-in `GITHUB_TOKEN` to open/append a labelled `backup-failure` GitHub issue. Zero new secrets, freeze-safe, durable, visible in the repo. The email / `SMTP_*` marketplace-action option was **rejected** to avoid new secret provisioning. **Requires two things, both silent-fail if missing:** `permissions: issues: write` on the job/step (default `GITHUB_TOKEN` is often read-only on scheduled runs) **and** `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on the step (`gh` authenticates from `GH_TOKEN`/`GITHUB_TOKEN` env, not from `permissions:` alone). The message builder (Task 4) is channel-agnostic (`{ subject/title, body }`).

### AC2 retry options

- No retry idiom exists in the repo today. Conventional choices: (a) `nick-fields/retry@v3` (`max_attempts: 2`) wrapping a `run:` CLI install — most idiomatic for retrying; (b) keep `supabase/setup-cli@v1`, add `id:`+`continue-on-error: true`, then a second attempt step `if: steps.<id>.outcome == 'failure'`; (c) bash `until`/`for` loop. Any is acceptable; (b) avoids a new third-party action. **Also pin the CLI version** (drop `version: latest`) — the failure was at network setup; pinning reduces transient resolution failures and makes runs reproducible.

### AC3 decision (owner-confirmed + rationale)

**Decided (owner-confirmed 2026-06-16): KEEP the `users` exclusion in the staging refresh.** Story 22.11 removes the *email-spam* rationale, but an independent, stronger reason remains:
- The logical backup excludes `auth.users` by design. Overwriting staging `public.users` with **production** rows would set `public.users.auth_user_id` to **production** auth identities that **do not exist in staging `auth.users`** → staging logins/role resolution for those users break (the app resolves the logged-in `auth.users.id` to `public.users.auth_user_id`).
- `TRUNCATE public.users ... CASCADE` could also cascade to dependent rows (`user_filters`, etc.).
- Net: extending the refresh to `users` trades a now-removed email risk for a real **auth-link-integrity** risk. Keeping the exclusion is the safer default; the **manual auth-provisioning step** (`database-restore.md:105`) is the accepted recovery approach either way.

Document this decision and rationale. **Owner confirmed 2026-06-16 — keep the exclusion; do not extend.** (For the record, had the owner chosen to extend, the change points would be [:68](.github/workflows/supabase-nightly-backup.yml) and [:99-100](.github/workflows/supabase-nightly-backup.yml).)

### AC5 test strategy

- **Automated (the "1 estimated test"):** unit-test the pure `buildBackupFailureAlert(...)` builder (Task 4) under `tests/unit/epic-22/story-22.12/`. This is the only coverage the Vitest `include` glob will actually run (`.ts`/`.tsx` only — `vitest.config.ts:16`) and it is deterministic + local-stable. Mirror `tests/unit/epic-14/story-14.1/email-template.test.ts`.
- **Manual evidence:** a `workflow_dispatch` induced-failure run on a non-production branch proving `if: failure()` (and the retry) behave — the only way to verify pure-YAML end-to-end since there is **no actionlint/YAML test harness** in the repo. Owner directive: the dev agent **runs** this and records run metadata as evidence; only if Actions access is genuinely unavailable in the dev session, escalate to the owner as a last resort (with the unit test as the standing automated proof) rather than silently deferring.
- **Gates:** `npx vitest run`, `pnpm lint`, `npx tsc --noEmit` must all pass. Playwright N/A (no UI/route change) and environmentally unstable locally — document N/A rather than running a flaky suite. The docs-only waiver does **not** apply (code change + estimated_tests=1).
- **Trap:** putting testable logic in `scripts/*.mjs` and writing a `*.test.mjs` leaves it **untested** (excluded by the Vitest glob). Keep the tested builder importable by a `.ts` test.

### Git / recent-work intelligence

Recent commits: `5a60969` (E-011 owner verification concluded), `6128d7c` (Story 22.11 implementation + review). Story 22.11 is fully merged on this branch (`codex/epic-22-readiness`) — its email suppression is the dependency that *removes the email-spam blocker* for AC3, and its suppression behavior is exactly why the app email-service must **not** be the CI alert channel (see AC1). No recent commit touched the backup workflow or `scripts/supabase-backup-storage.mjs`; no in-flight conflicts expected.

### Project Structure Notes

- Workflow lives in `.github/workflows/`; the testable alert builder goes under `src/lib/` (preferred for the Vitest glob) or a new exported-builder `scripts/notify-backup-failure.mjs` imported by a `.ts` test. New tests under `tests/unit/epic-22/story-22.12/` (established Epic 22 layout). Evidence under `docs/commercial-readiness/evidence/` (numbered-doc + evidence-link convention).
- `docs/operations/database-restore.md` is git-ignored / local-only (per Story 22.8) — it is the operator runbook; AC3 edits land there and are not committed.

### References

- [Story stub](docs/sprint-artifacts/story-22.12.md) — canonical AC/scope source
- [Epics § Story 22.12](_bmad-output/planning-artifacts/epics.md) — lines 299–313 (BDD)
- Backup workflow: [.github/workflows/supabase-nightly-backup.yml](.github/workflows/supabase-nightly-backup.yml) — CLI setup [:46-49], dump-data (`public.users` in scope) [:62], partial-dump [:68], staging restore [:91-102]
- Backup script: [scripts/supabase-backup-storage.mjs](scripts/supabase-backup-storage.mjs) — `db-backups` bucket, upload/prune/download-oldest (no notify hooks)
- Origin evidence: [restore-drill-2026-06-11.md:50-51](docs/commercial-readiness/evidence/restore-drill-2026-06-11.md) — 2026-06-05 gap + auth-out-of-scope follow-up
- AC1 anti-pattern: [email-service.ts:49-64](src/lib/services/email-service.ts) — `shouldSuppressEmailDelivery` (non-production suppression, Story 22.11)
- Test pattern to mirror: [tests/unit/epic-14/story-14.1/email-template.test.ts](tests/unit/epic-14/story-14.1/email-template.test.ts); test layout: [tests/unit/epic-22/story-22.11/](tests/unit/epic-22/story-22.11/)
- AC3 doc target: `docs/operations/database-restore.md` (git-ignored) — auth re-provisioning `:105`, scope limits `:20`, staging target `:66`
- AC4 surfaces: [09_operations_support_and_sla.md](docs/commercial-readiness/09_operations_support_and_sla.md) (Backup row `:15`, runbook `:69-93`), [14_evidence_index.md](docs/commercial-readiness/14_evidence_index.md) (Backup row `:61`), [11_risk_register_and_open_questions.md](docs/commercial-readiness/11_risk_register_and_open_questions.md) (`R-007` `:15`, `R-019` `:24`, Must-Fix `:43`), [00_index.md](docs/commercial-readiness/00_index.md) (`:59`, `:77`)
- Gate rules: `CLAUDE.md` (Test Requirements), `vitest.config.ts:16` (`.ts`/`.tsx` include glob)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8), BMAD dev-story workflow.

### Debug Log References

- Controlled failure verification (AC5) on throwaway branch `codex/test-backup-alert-22.12` (deleted after use):
  - Run `27642547441` (`workflow_dispatch`) — failed at the induced step (before any prod step); all dump/restore steps **skipped**; `if: failure()` alert step **succeeded** → opened `backup-failure` issue **#89**.
  - Run `27642638386` (`workflow_dispatch`) — same induced failure; alert step **commented on #89** (dedupe — no new issue). Verifies the open-vs-comment path.
  - Issue #89 body scanned PII-free/secret-free (no `postgres://`, `SUPABASE_DB_URL`, service-role, token, or email substrings); issue closed (not planned); throwaway branch deleted (local + remote). No production data read/written.
- Final gates (2026-06-16): `npx vitest run` EXIT:0 (3083 passed / 30 skipped, incl. 8 new Story-22.12 tests); `pnpm lint` 0 errors / 320 pre-existing warnings EXIT:0; `npx tsc --noEmit` EXIT:0. Playwright **N/A** (no UI/route/app-runtime change — YAML workflow + Node script + docs only).

### Completion Notes List

- **AC1 — failure alerting (verified).** Added a final `if: failure()` step `Alert on backup failure (open/append a backup-failure issue)` to the `backup-and-restore` job; it fires on **any** prior step failure and opens — or comments on an existing open — labelled `backup-failure` GitHub issue via the `gh` CLI + built-in `GITHUB_TOKEN`. **Zero new secrets.** Required-but-easy-to-miss bits both present: job-level `permissions: { contents: read, issues: write }` and step-level `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`. Did **not** reuse `email-service.ts` (Story 22.11 suppresses it in non-production; CI has no SMTP secrets).
- **AC2 — CLI-setup retry + pin (implemented).** `Setup Supabase CLI` pinned to `2.104.0` (was `version: latest`, the surface that failed 2026-06-05); first attempt `continue-on-error: true` + a second attempt gated `if: steps.setup_cli.outcome == 'failure'`. Self-heals one transient setup failure; happy path unchanged; no new third-party action.
- **AC3 — scope decision documented (kept exclusion).** Per owner decision, the staging refresh **keeps** the `users`/auth exclusion. Documented in the operator runbook `docs/operations/database-restore.md` (git-ignored, local-only) with the auth-link-integrity rationale (`public.users.auth_user_id` → staging `auth.users`), and auth-user re-provisioning affirmed as the accepted manual recovery step regardless.
- **AC4 — readiness surfaces synced.** Updated `09_operations_support_and_sla.md` (Backup row + Backups-And-Restore subsection + RTO/auth line + Story-22.8 follow-ups paragraph), `14_evidence_index.md` (Backup row + evidence link), `11_risk_register_and_open_questions.md` (`R-007` resolved, `R-019` clause reconciled, Must-Fix bullet, added `Updated:` date), and `00_index.md` (both Story-22.12 bullets + `Updated:` date).
- **AC5 — tests + gates.** New pure builder `buildBackupFailureAlert(...)` in `scripts/notify-backup-failure.mjs` (single source of truth; import-safe) + 8 unit tests in `tests/unit/epic-22/story-22.12/backup-failure-alert.test.ts` (content + PII/secret-free assertions). Controlled `workflow_dispatch` verification run (see Debug Log). All mandatory gates pass; Playwright N/A.
- **Packaging note:** `scripts/` is git-ignored; like the existing `scripts/supabase-backup-storage.mjs`, the new `scripts/notify-backup-failure.mjs` must be committed with `git add -f` so CI can run it. The controlled run confirmed it works when committed.

### File List

Committed (tracked):

- `.github/workflows/supabase-nightly-backup.yml` — modified (job `permissions`, CLI pin + one-shot retry, `if: failure()` alert step)
- `scripts/notify-backup-failure.mjs` — **new** (force-add required: `scripts/` is git-ignored)
- `tests/unit/epic-22/story-22.12/backup-failure-alert.test.ts` — new (8 unit tests)
- `docs/commercial-readiness/evidence/backup-failure-alerting-2026-06-16.md` — new (controlled-verification evidence)
- `docs/commercial-readiness/09_operations_support_and_sla.md` — modified
- `docs/commercial-readiness/14_evidence_index.md` — modified
- `docs/commercial-readiness/11_risk_register_and_open_questions.md` — modified
- `docs/commercial-readiness/00_index.md` — modified
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (22.12 → review)
- `_bmad-output/implementation-artifacts/22-12-...md` — this story file
- `docs/sprint-artifacts/epic-22-sprint-status.yaml` — modified (22.12 → review)
- `docs/sprint-artifacts/story-22.12.md` — modified (Status → review)

Local-only (git-ignored, not committed):

- `docs/operations/database-restore.md` — modified (AC3 scope-decision section; operator runbook)

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-16 | Story 22.12 context created (ready-for-dev): backup-failure alerting + one-shot CLI-setup retry on `supabase-nightly-backup.yml`; `users`/auth staging-refresh scope decision documented in `database-restore.md` with auth re-provisioning as the accepted manual step; AC4 readiness-surface sync (`09_`, `14_`, `R-007`/`R-019`, `00_index`); testable alert-message builder (`.ts`/`src`-resident per Vitest glob) + controlled failure verification. Exhaustive artifact analysis (3 research subagents) cited with exact file:line. |
| 2026-06-16 | Owner resolved all 3 open questions (decisions locked into ACs/Tasks): AC3 = keep the `users` exclusion (no extend); AC1 = `gh`-issue channel via `GITHUB_TOKEN`, zero new secrets (+`permissions: issues: write`); AC5 = dev agent runs the controlled `workflow_dispatch` failure verification (not an owner action item). |
| 2026-06-16 | Implemented (status → review). AC1 `if: failure()` GitHub-issue alerting (`gh` + built-in `GITHUB_TOKEN`, job `issues: write`, step `GH_TOKEN`) + AC2 CLI-setup pin `2.104.0` + one-shot retry on `supabase-nightly-backup.yml`; AC4 readiness-surface sync (`09_`, `14_`, `R-007`/`R-019`/Must-Fix in `11_`, `00_index`); AC3 scope decision (keep `users` exclusion + auth-link-integrity rationale) in the git-ignored `database-restore.md`. Pure unit-tested builder `scripts/notify-backup-failure.mjs` (force-add: `scripts/` is git-ignored) + 8 tests. AC5 controlled verification on throwaway branch: runs `27642547441` (opened issue #89) and `27642638386` (dedupe comment); alert text verified PII/secret-free; issue closed + branch deleted; no production data touched. Gates: `npx vitest run` EXIT:0 (3083 passed), `pnpm lint` 0 errors, `npx tsc --noEmit` EXIT:0; Playwright N/A. |

## Resolved Decisions (owner, 2026-06-16)

All three open questions were resolved by the owner before dev — the dev agent must implement to these, not re-litigate them.

1. **AC3 scope — KEEP the `users` exclusion in the staging refresh.** Confirmed. Do not extend the refresh to `users`; document the decision + the auth-link-integrity rationale in `database-restore.md`, with manual auth-provisioning as the accepted recovery step.
2. **AC1 channel — `gh` issue via built-in `GITHUB_TOKEN` (zero new secrets).** Confirmed. The email/`SMTP_*` option is rejected. Remember `permissions: issues: write`.
3. **AC5 verification — the dev agent RUNS the controlled `workflow_dispatch` induced-failure test during implementation** (owner wants to minimize owner action items). Only escalate if Actions access is genuinely unavailable in the dev session.
