import { describe, expect, it } from "vitest";

import {
  BACKUP_FAILURE_LABEL,
  buildBackupFailureAlert,
} from "../../../../scripts/notify-backup-failure.mjs";

/**
 * Story 22.12 — Add Backup Failure Alerting
 *
 * The nightly backup workflow's `if: failure()` alert step builds its message
 * with this pure builder (single source of truth). The builder must include the
 * run metadata an operator needs (run URL, run id, failed step/job, UTC date) and
 * must NEVER leak secrets, DB URLs, or personal data — the alert is the durable,
 * publicly-visible artifact (a GitHub issue), so PII-free output is a hard rule.
 *
 * Mirrors the message-builder test pattern in
 * tests/unit/epic-14/story-14.1/email-template.test.ts and the PII-free assertion
 * pattern in tests/unit/epic-22/story-22.11/email-suppression.test.ts.
 */

const SAMPLE = {
  runUrl: "https://github.com/acme/hr-masterdata/actions/runs/123456789",
  runId: "123456789",
  failedStep: "Setup Supabase CLI",
  dateUtc: "2026-06-16",
};

describe("buildBackupFailureAlert — content (AC1/AC5)", () => {
  it("returns a { subject, body } pair of non-empty strings", () => {
    const alert = buildBackupFailureAlert(SAMPLE);
    expect(typeof alert.subject).toBe("string");
    expect(typeof alert.body).toBe("string");
    expect(alert.subject.length).toBeGreaterThan(0);
    expect(alert.body.length).toBeGreaterThan(0);
  });

  it("includes the run URL, run id, failed step, and UTC date", () => {
    const { subject, body } = buildBackupFailureAlert(SAMPLE);
    const combined = `${subject}\n${body}`;
    expect(combined).toContain(SAMPLE.runUrl);
    expect(combined).toContain(SAMPLE.runId);
    expect(combined).toContain(SAMPLE.failedStep);
    expect(combined).toContain(SAMPLE.dateUtc);
  });

  it("signals a backup failure in the subject", () => {
    const { subject } = buildBackupFailureAlert(SAMPLE);
    expect(subject.toLowerCase()).toContain("backup");
    expect(subject.toLowerCase()).toContain("fail");
  });

  it("falls back to a safe marker when failedStep is missing (no 'undefined')", () => {
    const { subject, body } = buildBackupFailureAlert({
      runUrl: SAMPLE.runUrl,
      runId: SAMPLE.runId,
      dateUtc: SAMPLE.dateUtc,
    });
    const combined = `${subject}\n${body}`;
    expect(combined).not.toContain("undefined");
    expect(combined).toContain(SAMPLE.runUrl);
    expect(combined).toContain(SAMPLE.dateUtc);
  });

  it("treats an empty/whitespace failedStep as missing", () => {
    const { body } = buildBackupFailureAlert({ ...SAMPLE, failedStep: "   " });
    expect(body).not.toContain("undefined");
  });
});

describe("buildBackupFailureAlert — PII-free / secret-free (AC1/AC5)", () => {
  it("never emits secret names, DB URLs, or email-like personal data", () => {
    // Inputs are deliberately benign; the builder must not invent or echo secrets.
    const serialized = JSON.stringify(buildBackupFailureAlert(SAMPLE));

    // DB connection strings / URLs
    expect(serialized).not.toContain("postgres://");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toMatch(/\bdb-url\b/i);

    // Secret env names that must never travel into a public issue
    expect(serialized).not.toContain("SUPABASE_DB_URL");
    expect(serialized).not.toContain("STAGING_SUPABASE_DB_URL");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("GITHUB_TOKEN");
    expect(serialized).not.toContain("GH_TOKEN");

    // No email-like personal data
    expect(serialized).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  });

  it("does not leak a secret value even if one is wrongly passed in (defensive)", () => {
    // The builder only reads the four documented fields; extra props are ignored.
    const alert = buildBackupFailureAlert({
      ...SAMPLE,
      // @ts-expect-error — intentionally pass an unexpected secret-shaped field
      serviceRoleKey: "super-secret-service-role-key-value",
    });
    const serialized = JSON.stringify(alert);
    expect(serialized).not.toContain("super-secret-service-role-key-value");
  });
});

describe("backup-failure label constant", () => {
  it("is the agreed 'backup-failure' label", () => {
    expect(BACKUP_FAILURE_LABEL).toBe("backup-failure");
  });
});
