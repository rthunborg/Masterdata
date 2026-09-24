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
    // GitHub Actions exposes no built-in "failed step" expression, so the workflow
    // passes the job id (github.job). Label this "Failed job" rather than implying
    // step-level precision the value does not carry; the run link shows the red step.
    `- Failed job: ${where}`,
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

/**
 * Look up an existing open `backup-failure` issue.
 *
 * Returns `{ listed, number }`:
 * - `listed` is `true` only when the `gh issue list` call actually succeeded, so
 *   the caller can tell "no open issue exists" (listed:true, number:null) apart
 *   from "could not check" (listed:false, number:null). Without this distinction
 *   a transient `gh`/API failure looks identical to "no open issue" and the caller
 *   would open a duplicate issue every time the list call flakes.
 * - `number` is the issue number (string) when one open issue was found, else null.
 */
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
    return { listed: true, number: trimmed.length > 0 ? trimmed : null };
  }
  return { listed: false, number: null };
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

  const { listed, number: existing } = findOpenIssueNumber();
  if (!listed) {
    // Could not confirm whether an open issue already exists. Prefer alerting over
    // silence (the run already failed) and open one, but warn that the dedupe check
    // was skipped so a possible duplicate is explainable rather than mysterious.
    console.warn(
      "Could not list existing backup-failure issues; opening a new issue (dedupe skipped — a duplicate is possible)."
    );
  }
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
