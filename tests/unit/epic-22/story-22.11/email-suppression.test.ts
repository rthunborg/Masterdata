import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendEmail,
  sendEmailToMultiple,
  shouldSuppressEmailDelivery,
} from "@/lib/services/email-service";

/**
 * Story 22.11 — Enforce Non-Production Email Suppression
 *
 * The decision tests inject `env` explicitly (AC5) and never rely on ambient
 * `process.env`, so they assert the pure suppression decision in isolation.
 */
describe("shouldSuppressEmailDelivery — fail-safe decision (AC1/AC3/AC5)", () => {
  it("suppresses by default in non-production (NEXT_PUBLIC_IS_STAGING truthy)", () => {
    expect(
      shouldSuppressEmailDelivery({ NEXT_PUBLIC_IS_STAGING: "true" })
    ).toEqual({ suppress: true, reason: "non-production-failsafe" });
  });

  it("suppresses by default in non-production (VERCEL_ENV=preview)", () => {
    expect(shouldSuppressEmailDelivery({ VERCEL_ENV: "preview" })).toEqual({
      suppress: true,
      reason: "non-production-failsafe",
    });
  });

  it("suppresses by default in non-production (NODE_ENV=test)", () => {
    expect(shouldSuppressEmailDelivery({ NODE_ENV: "test" })).toEqual({
      suppress: true,
      reason: "non-production-failsafe",
    });
  });

  it("delivers in production with no flags set", () => {
    expect(
      shouldSuppressEmailDelivery({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      })
    ).toEqual({ suppress: false, reason: "production" });
  });

  it("delivers in non-production when EMAIL_DELIVERY_OVERRIDE is truthy (Mailpit capture)", () => {
    expect(
      shouldSuppressEmailDelivery({
        NEXT_PUBLIC_IS_STAGING: "true",
        EMAIL_DELIVERY_OVERRIDE: "true",
      })
    ).toEqual({ suppress: false, reason: "non-production-override" });
  });

  it("kill-switch wins in production (DISABLE_EMAIL_DELIVERY truthy)", () => {
    expect(
      shouldSuppressEmailDelivery({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        DISABLE_EMAIL_DELIVERY: "true",
      })
    ).toEqual({ suppress: true, reason: "kill-switch" });
  });

  it("kill-switch wins over override in non-production", () => {
    expect(
      shouldSuppressEmailDelivery({
        NEXT_PUBLIC_IS_STAGING: "true",
        EMAIL_DELIVERY_OVERRIDE: "true",
        DISABLE_EMAIL_DELIVERY: "true",
      })
    ).toEqual({ suppress: true, reason: "kill-switch" });
  });

  it("parses 1/true/yes consistently for all flags", () => {
    expect(
      shouldSuppressEmailDelivery({ DISABLE_EMAIL_DELIVERY: "1" }).suppress
    ).toBe(true);
    expect(
      shouldSuppressEmailDelivery({ DISABLE_EMAIL_DELIVERY: "yes" }).suppress
    ).toBe(true);
    expect(
      shouldSuppressEmailDelivery({
        NEXT_PUBLIC_IS_STAGING: "true",
        EMAIL_DELIVERY_OVERRIDE: "YES",
      })
    ).toEqual({ suppress: false, reason: "non-production-override" });
  });

  it("does not treat unrecognized flag values as truthy", () => {
    // A non-production runtime with a junk override value still suppresses.
    expect(
      shouldSuppressEmailDelivery({
        NEXT_PUBLIC_IS_STAGING: "true",
        EMAIL_DELIVERY_OVERRIDE: "maybe",
      })
    ).toEqual({ suppress: true, reason: "non-production-failsafe" });
  });
});

/**
 * AC2 — suppressed sends are logged with recipient COUNT and reason only,
 * never recipient addresses, subjects, or bodies. These tests force a
 * non-production runtime explicitly so behavior does not depend on ambient
 * NODE_ENV, and restore env + spies to stay hermetic.
 */
describe("sendEmail suppression logging — PII-free (AC1/AC2)", () => {
  const FLAG_KEYS = [
    "NEXT_PUBLIC_IS_STAGING",
    "EMAIL_DELIVERY_OVERRIDE",
    "DISABLE_EMAIL_DELIVERY",
  ] as const;
  const saved: Record<string, string | undefined> = {};
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    for (const key of FLAG_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    // Force a recognized non-production runtime with no override -> fail-safe.
    process.env.NEXT_PUBLIC_IS_STAGING = "true";
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    for (const key of FLAG_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  it("suppresses delivery and returns a success-shaped no-op result", async () => {
    const result = await sendEmail({
      to: "employee.secret@example.com",
      subject: "Confidential Subject Line",
      text: "body",
    });

    expect(result).toEqual({
      success: true,
      messageId: "email-delivery-disabled",
    });
  });

  it("logs recipient count + reason but never the address or subject (single)", async () => {
    await sendEmail({
      to: "employee.secret@example.com",
      subject: "Confidential Subject Line",
      text: "secret body content",
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [, payload] = logSpy.mock.calls[0];
    expect(payload).toMatchObject({
      recipientCount: 1,
      reason: "non-production-failsafe",
    });

    const serialized = JSON.stringify(logSpy.mock.calls);
    expect(serialized).not.toContain("employee.secret@example.com");
    expect(serialized).not.toContain("Confidential Subject Line");
    expect(serialized).not.toContain("secret body content");
  });

  it("counts array recipients without leaking any address (multiple)", async () => {
    await sendEmail({
      to: ["a.secret@example.com", "b.secret@example.com"],
      subject: "Another Subject",
      text: "body",
    });

    const [, payload] = logSpy.mock.calls[0];
    expect(payload).toMatchObject({ recipientCount: 2 });

    const serialized = JSON.stringify(logSpy.mock.calls);
    expect(serialized).not.toContain("a.secret@example.com");
    expect(serialized).not.toContain("b.secret@example.com");
    expect(serialized).not.toContain("Another Subject");
  });

  it("counts a comma-separated recipient string without leaking any address", async () => {
    await sendEmail({
      to: "a.secret@example.com, b.secret@example.com , c.secret@example.com",
      subject: "Yet Another Subject",
      text: "body",
    });

    const [, payload] = logSpy.mock.calls[0];
    expect(payload).toMatchObject({ recipientCount: 3 });

    const serialized = JSON.stringify(logSpy.mock.calls);
    expect(serialized).not.toContain("a.secret@example.com");
    expect(serialized).not.toContain("c.secret@example.com");
    expect(serialized).not.toContain("Yet Another Subject");
  });
});

/**
 * Task 2 — a suppressed batch must not sleep 1s per recipient. With delivery
 * suppressed, sendEmailToMultiple should schedule no inter-send delay.
 */
describe("sendEmailToMultiple — skips inter-send delay when suppressed (Task 2)", () => {
  const FLAG_KEYS = [
    "NEXT_PUBLIC_IS_STAGING",
    "EMAIL_DELIVERY_OVERRIDE",
    "DISABLE_EMAIL_DELIVERY",
  ] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of FLAG_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    process.env.NEXT_PUBLIC_IS_STAGING = "true";
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of FLAG_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  it("returns success-shaped results for every recipient and never delays", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const results = await sendEmailToMultiple(
      ["a@example.com", "b@example.com", "c@example.com"],
      "subject",
      "text"
    );

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result).toEqual({
        success: true,
        messageId: "email-delivery-disabled",
      });
    }
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });
});
