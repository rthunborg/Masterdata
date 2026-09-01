# Backup-Failure Alerting — Controlled Verification — 2026-06-16

Story: 22.12 (AC1, AC2, AC5)

Privacy note: this record contains **run metadata only** (workflow run ids/URLs, step outcomes, issue number). No secrets, database URLs, SMTP credentials, project refs, or personal data are recorded, consistent with the Story 22.8/22.9/22.11 evidence-redaction discipline. The alert mechanism itself is designed to emit PII-free, secret-free text.

## Purpose

Prove that the nightly Supabase backup workflow (`.github/workflows/supabase-nightly-backup.yml`) now **alerts on any step failure** so a silent backup gap — the 2026-06-05 "Setup Supabase CLI" failure that went unnoticed for six days — cannot recur.

## What changed (Story 22.12)

- **AC1 — failure alerting.** A final job step `Alert on backup failure (open/append a backup-failure issue)` runs under `if: failure()`, so it fires when **any** prior step fails (CLI setup, dump, upload, prune, download, or the staging restore). It opens — or appends a comment to an existing open — labelled `backup-failure` GitHub issue via the `gh` CLI using the built-in `GITHUB_TOKEN`. **Zero new secrets.** The job grants `permissions: issues: write` and the step sets `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (both are required; either alone fails silently).
- **AC2 — transient CLI-setup retry.** `Setup Supabase CLI` is pinned to a known-good version (`2.104.0`, was `version: latest`) and is retried once: the first attempt runs with `continue-on-error: true` and a second attempt runs only `if: steps.setup_cli.outcome == 'failure'`. A single transient setup failure self-heals; the happy path is unchanged.
- **Single source of truth for the message.** The alert subject/body is produced by the pure, unit-tested builder `buildBackupFailureAlert(...)` in `scripts/notify-backup-failure.mjs` (covered by `tests/unit/epic-22/story-22.12/backup-failure-alert.test.ts`, 8 tests). The builder is import-safe (no side effects); the `gh` calls run only when the script is executed directly.

> Note: `scripts/` is git-ignored, so — like the existing `scripts/supabase-backup-storage.mjs` — `scripts/notify-backup-failure.mjs` must be committed with `git add -f` for CI to find it. The controlled run below confirms it is present and works when committed.

## Controlled verification (AC5)

Method: a throwaway branch `codex/test-backup-alert-22.12` was pushed with a **temporary** induced-failure step placed **before any production dump/restore step**, then `workflow_dispatch`-triggered. This proves the `if: failure()` alert end-to-end **without touching production** — every production dump/restore step was skipped. The induced-failure step was never merged into the real workflow; the throwaway branch and its temporary step were deleted afterward.

| Run | Event | Result | Failed at | Production steps | Alert step | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| `27642547441` | `workflow_dispatch` | failure | `TEST ONLY — induce failure` (before any prod step) | all **skipped** | success | Opened `backup-failure` issue **#89** |
| `27642638386` | `workflow_dispatch` | failure | same induced step | all **skipped** | success | **Commented** on issue #89 (dedupe — no new issue opened) |

Step outcomes for run `27642547441` (abbreviated): `Set up job` ✓ → `Checkout` ✓ → `Setup pnpm` ✓ → `Setup Node` ✓ → **`TEST ONLY — induce failure` ✗** → `Install dependencies` / `Setup Supabase CLI` (+ retry) / all dump/upload/prune/download/restore steps **skipped** → **`Alert on backup failure` ✓**.

Issue #89 content (verified PII-free / secret-free — scanned for `postgres://`, `SUPABASE_DB_URL`, service-role, token, and email substrings; none present):

```
TITLE: Nightly Supabase backup failed — 2026-06-16 (run 27642547441)
LABELS: backup-failure

The nightly Supabase backup workflow failed.

- Date (UTC): 2026-06-16
- Failed step/job: backup-and-restore
- Run: https://github.com/<owner>/<repo>/actions/runs/27642547441
- Run ID: 27642547441

Open the run above to see which step is red and the captured logs.
This issue was opened automatically by the `if: failure()` alert step of
.github/workflows/supabase-nightly-backup.yml (Story 22.12). Repeated
failures append a comment to this issue rather than opening a new one.
```

Cleanup: test issue **#89 was closed** (reason: not planned) with an explanatory comment; the throwaway branch `codex/test-backup-alert-22.12` was deleted (local + remote). No production environment data was read or written during either run.

## Outcome

| Item | Status |
| --- | --- |
| AC1 — `if: failure()` GitHub-issue alerting | **Verified** (2026-06-16) — issue opened on failure |
| AC1 — dedupe (comment on existing open issue vs. new) | **Verified** (2026-06-16) — second failure commented on #89 |
| AC2 — CLI-setup retry once + pinned version | **Implemented** — config-verified; retry path exercised only on a transient setup failure |
| AC5 — alert text PII-free / secret-free | **Verified** (2026-06-16) — unit test + live issue scan |
| AC5 — automated gate | **Verified** — `npx vitest run` EXIT:0 (incl. 8 Story-22.12 tests), `pnpm lint` 0 errors, `npx tsc --noEmit` EXIT:0; Playwright N/A (no UI/route/app-runtime change) |

This closes the two Story 22.8 restore-drill follow-ups against risk `R-007`: backup-failure alerting now exists, and the Auth-user provisioning / staging-refresh `users`-scope decision is recorded in the tracked `docs/commercial-readiness/09_operations_support_and_sla.md#backups-and-restore` (decision: keep the `users` exclusion; manually re-provision/remap Auth identities for disaster recovery).
