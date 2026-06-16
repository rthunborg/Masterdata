#!/usr/bin/env node
/**
 * Backup-failure alerting (Story 22.12).
 *
 * Builds a PII-free, secret-free alert message and opens — or appends a comment
 * to — a labelled `backup-failure` GitHub issue via the `gh` CLI using the
 * built-in `GITHUB_TOKEN`. Invoked by
 * `.github/workflows/supabase-nightly-backup.yml` on `if: failure()`, so a
 * silent backup gap (the 2026-06-05 incident) cannot recur.
 *
 * Design notes:
 * - The message builder `buildBackupFailureAlert` is an EXPORTED PURE function so
 *   it is the single source of truth for the alert text and is unit-testable from
 *   a `.ts` test (Vitest's include glob is `.ts`/`.tsx` only). Importing this
 *   module has NO side effects — the `gh` calls run only when the file is invoked
 *   directly as a script (see the main-module guard at the bottom).
 * - The alert text contains ONLY GitHub run metadata + the failed step/job name.
 *   It must never contain secrets, DB URLs, or personal data — the issue is a
 *   durable, repo-visible artifact.
 * - Auth: `gh` reads `GH_TOKEN`/`GITHUB_TOKEN` from the environment. The workflow
 *   step sets `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` AND the job grants
 *   `permissions: issues: write` — both are required; either alone fails silently.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

export const BACKUP_FAILURE_LABEL = "backup-failure";

/**
 * Pure builder for the backup-failure alert message.
 *
 * @param {Object} input
 * @param {string} input.runUrl   - URL of the failed workflow run.
 * @param {string|number} input.runId - The workflow run id.
 * @param {string} [input.failedStep] - Failed step/job name (optional).
 * @param {string} input.dateUtc  - The UTC date (YYYY-MM-DD) of the run.
 * @returns {{ subject: string, body: string }}
 */
export function buildBackupFailureAlert({ runUrl, runId, failedStep, dateUtc } = {}) {
  const where =
    typeof failedStep === "string" && failedStep.trim().length > 0
      ? failedStep.trim()
      : "unknown step (see run logs)";

  const subject = `Nightly Supabase backup failed — ${dateUtc} (run ${runId})`;

  const body = [
    "The nightly Supabase backup workflow failed.",
    "",
    `- Date (UTC): ${dateUtc}`,
    `- Failed step/job: ${where}`,
    `- Run: ${runUrl}`,
    `- Run ID: ${runId}`,
    "",
    "Open the run above to see which step is red and the captured logs.",
    "",
    "This issue was opened automatically by the `if: failure()` alert step of",
    "`.github/workflows/supabase-nightly-backup.yml` (Story 22.12). Repeated",
    "failures append a comment to this issue rather than opening a new one.",
  ].join("\n");

  return { subject, body };
}

/* ----------------------------------------------------------------------------
 * Side-effecting `gh` integration — only runs when invoked as a script.
 * -------------------------------------------------------------------------- */

function gh(args) {
  return spawnSync("gh", args, { encoding: "utf8" });
}

/** Ensure the `backup-failure` label exists so `issue create --label` succeeds. */
function ensureLabel() {
  // `--force` updates an existing label instead of erroring; failures here are
  // non-fatal (the issue create/comment below is what actually matters).
  const res = gh([
    "label",
    "create",
    BACKUP_FAILURE_LABEL,
    "--color",
    "B60205",
    "--description",
    "Automated nightly Supabase backup failure (Story 22.12)",
    "--force",
  ]);
  if (res.status !== 0 && res.stderr) {
    console.warn(`Label ensure warning: ${res.stderr.trim()}`);
  }
}

/** Return the number of an existing open `backup-failure` issue, or null. */
function findOpenIssueNumber() {
  const res = gh([
    "issue",
    "list",
    "--label",
    BACKUP_FAILURE_LABEL,
    "--state",
    "open",
    "--limit",
    "1",
    "--json",
    "number",
    "--jq",
    ".[0].number // empty",
  ]);
  if (res.status === 0 && typeof res.stdout === "string") {
    const trimmed = res.stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function resolveRunUrl(runId) {
  if (process.env.RUN_URL) return process.env.RUN_URL;
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const repo = process.env.GITHUB_REPOSITORY;
  return repo ? `${serverUrl}/${repo}/actions/runs/${runId}` : serverUrl;
}

function main() {
  const runId =
    process.env.RUN_ID || process.env.GITHUB_RUN_ID || "unknown";
  const runUrl = resolveRunUrl(runId);
  const failedStep = process.env.FAILED_STEP || process.env.GITHUB_JOB || "";
  const dateUtc =
    process.env.BACKUP_DATE_UTC || new Date().toISOString().slice(0, 10);

  const { subject, body } = buildBackupFailureAlert({
    runUrl,
    runId,
    failedStep,
    dateUtc,
  });

  ensureLabel();

  const existing = findOpenIssueNumber();
  if (existing) {
    const res = gh(["issue", "comment", existing, "--body", body]);
    if (res.status !== 0) {
      console.error(
        `Failed to comment on backup-failure issue #${existing}: ${
          res.stderr ? res.stderr.trim() : `exit ${res.status}`
        }`
      );
      process.exit(1);
    }
    console.log(`Appended backup-failure comment to issue #${existing}.`);
    return;
  }

  const res = gh([
    "issue",
    "create",
    "--title",
    subject,
    "--label",
    BACKUP_FAILURE_LABEL,
    "--body",
    body,
  ]);
  if (res.status !== 0) {
    console.error(
      `Failed to open backup-failure issue: ${
        res.stderr ? res.stderr.trim() : `exit ${res.status}`
      }`
    );
    process.exit(1);
  }
  console.log(`Opened backup-failure issue: ${res.stdout.trim()}`);
}

// Run side effects only when executed directly (never on import — keeps the
// builder unit-testable without opening GitHub issues).
const invokedPath = process.argv[1] ? fileURLToPath(import.meta.url) : null;
if (invokedPath && invokedPath === process.argv[1]) {
  main();
}
