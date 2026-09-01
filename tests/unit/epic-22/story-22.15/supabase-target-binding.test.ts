import { describe, expect, it } from "vitest";

import { assertSupabaseTargetBinding } from "../../../../supabase/verify/verify-target-binding.mjs";

const linkedProjectRef = "abcdefghijklmnopqrst";
const otherProjectRef = "zyxwvutsrqponmlkjihg";
const password = "do-not-print-this-password";

describe("Story 22.15 Supabase target binding", () => {
  it("accepts only a matching direct project database URL", () => {
    expect(
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
      })
    ).toBe(true);
  });

  it("fails closed when the linked project and database host differ", () => {
    const action = () =>
      assertSupabaseTargetBinding({
        linkedProjectRef,
        expectedProjectRef: linkedProjectRef,
        databaseUrl: `postgresql://postgres:${password}@db.${otherProjectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
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
      })
    ).toThrow("Expected Supabase project reference is unavailable or invalid");
  });

  it.each([
    `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres:${password}@db.${linkedProjectRef}.supabase.co:5432/postgres?sslmode=require`,
    `postgresql://postgres:${password}@aws-0-eu-north-1.pooler.supabase.com:5432/postgres`,
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
      })
    ).toThrow("unambiguous direct Supabase database URL");
  });

  it("rejects malformed or missing binding inputs without echoing them", () => {
    expect(() =>
      assertSupabaseTargetBinding({
        linkedProjectRef: "not-a-project-ref",
        expectedProjectRef: linkedProjectRef,
        databaseUrl: "not a URL",
      })
    ).toThrow("Linked Supabase project reference is unavailable or invalid");
  });
});
