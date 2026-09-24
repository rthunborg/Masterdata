import { describe, expect, it } from "vitest";

import { assertSupabaseTargetBinding } from "../../../../supabase/verify/verify-target-binding.mjs";

const linkedProjectRef = "abcdefghijklmnopqrst";
const otherProjectRef = "zyxwvutsrqponmlkjihg";
const password = "do-not-print-this-password";
const poolerHost = "aws-0-eu-north-1.pooler.supabase.com";
const otherPoolerHost = "aws-0-eu-west-1.pooler.supabase.com";

describe("Story 22.15 Supabase target binding", () => {
  it("accepts only a matching direct project database URL", () => {
    expect(
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
        connectionMode: "direct",
      })
    ).toBe(true);
  });

  it("accepts a matching IPv4 Supavisor session pooler URL", () => {
    expect(
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:5432/postgres?sslmode=verify-full`,
        connectionMode: "session-pooler",
        expectedPoolerHost: poolerHost,
      })
    ).toBe(true);
  });

  it("rejects a pooler-host input when direct mode is selected", () => {
    expect(() =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
        connectionMode: "direct",
        expectedPoolerHost: poolerHost,
      })
    ).toThrow("Direct database binding must not include a pooler host");
  });

  it("fails closed when the linked project and database host differ", () => {
    const action = () =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres:${password}@db.${otherProjectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
        connectionMode: "direct",
      });

    expect(action).toThrow("Direct database target does not match the intended environment");
    for (const secret of [linkedProjectRef, otherProjectRef, password]) {
      try {
        action();
      } catch (error) {
        expect(String(error)).not.toContain(secret);
      }
    }
  });

  it("fails closed when a mutually matching link and URL target the wrong environment", () => {
    const action = () =>
      assertSupabaseTargetBinding({
        linkedProjectRef: otherProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres:${password}@db.${otherProjectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
        connectionMode: "direct",
      });

    expect(action).toThrow("Linked CLI project does not match the intended environment");
    for (const privateValue of [linkedProjectRef, otherProjectRef, password]) {
      try {
        action();
      } catch (error) {
        expect(String(error)).not.toContain(privateValue);
      }
    }
  });

  it("requires a separately supplied intended-environment reference", () => {
    expect(() =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        databaseUrl: `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres`,
        connectionMode: "direct",
      })
    ).toThrow("Expected Supabase project reference is unavailable or invalid");
  });

  it.each([
    `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres?sslmode=require`,
    `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:5432/postgres?sslmode=verify-full`,
    `postgresql://postgres:${password}@database.internal.example:5432/postgres`,
    `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:6543/postgres`,
    `postgresql://service_role:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/other`,
    `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres?target_session_attrs=read-write`,
  ])("rejects pooler, custom, or ambiguous URL forms", (databaseUrl) => {
    expect(() =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl,
        connectionMode: "direct",
      })
    ).toThrow("unambiguous direct Supabase database URL");
  });

  it.each([
    `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:6543/postgres?sslmode=verify-full`,
    `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:5432/postgres?sslmode=require`,
    `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:5432/postgres`,
    `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:5432/postgres?sslmode=verify-full&application_name=ambiguous`,
    `postgresql://postgres:${password}@${poolerHost}:5432/postgres?sslmode=verify-full`,
    `postgresql://postgres.${linkedProjectRef}:${password}@database.internal.example:5432/postgres?sslmode=verify-full`,
  ])("rejects transaction, custom, or ambiguous session-pooler URLs", (databaseUrl) => {
    expect(() =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl,
        connectionMode: "session-pooler",
        expectedPoolerHost: poolerHost,
      })
    ).toThrow(/unambiguous Supabase session pooler URL/);
  });

  it("requires the exact separately approved session-pooler host", () => {
    const action = () =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:5432/postgres?sslmode=verify-full`,
        connectionMode: "session-pooler",
        expectedPoolerHost: otherPoolerHost,
      });

    expect(action).toThrow("Session pooler host does not match the approved environment host");
    for (const privateValue of [linkedProjectRef, poolerHost, otherPoolerHost, password]) {
      try {
        action();
      } catch (error) {
        expect(String(error)).not.toContain(privateValue);
      }
    }
  });

  it("binds the session-pooler username to the intended project reference", () => {
    expect(() =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres.${otherProjectRef}:${password}@${poolerHost}:5432/postgres?sslmode=verify-full`,
        connectionMode: "session-pooler",
        expectedPoolerHost: poolerHost,
      })
    ).toThrow("Session pooler username does not match the intended environment");
  });

  it.each([undefined, "", "transaction-pooler", "session"])(
    "requires an explicit approved connection mode",
    (connectionMode) => {
      expect(() =>
        assertSupabaseTargetBinding({
          linkedProjectRef,
          expectedProjectRef: linkedProjectRef,
          databaseUrl: `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
          connectionMode,
        })
      ).toThrow("Supabase database connection mode is unavailable or invalid");
    }
  );

  it("rejects an invalid approved pooler hostname without echoing it", () => {
    const invalidHost = "pooler.internal.example";
    const action = () =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres.${linkedProjectRef}:${password}@${poolerHost}:5432/postgres?sslmode=verify-full`,
        connectionMode: "session-pooler",
        expectedPoolerHost: invalidHost,
      });

    expect(action).toThrow("Approved Supabase session pooler host is unavailable or invalid");
    try {
      action();
    } catch (error) {
      expect(String(error)).not.toContain(invalidHost);
    }
  });

  it("rejects malformed or missing binding inputs without echoing them", () => {
    expect(() =>
      assertSupabaseTargetBinding({
        linkedProjectRef: "not-a-project-ref",
        expectedProjectRef: linkedProjectRef,
        databaseUrl: "not a URL",
        connectionMode: "direct",
      })
    ).toThrow("Linked Supabase project reference is unavailable or invalid");
  });
});
