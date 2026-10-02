import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  validateNonProductionSupabaseEnvironment,
} from "@/lib/env/non-production-supabase-guard";

const productionRef = "njgmfvsqevhoxpqbnpnd";
const productionUrl = `https://${productionRef}.supabase.co`;
const productionDbUrl =
  `postgresql://postgres.${productionRef}:secret-password@aws-0-eu-north-1.pooler.supabase.com:6543/postgres`;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("non-production Supabase environment guard", () => {
  it("rejects known production Supabase resources during local development", () => {
    expect(() =>
      validateNonProductionSupabaseEnvironment({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      })
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);

    expect(() =>
      validateNonProductionSupabaseEnvironment({
        APP_ENV: "development",
        SUPABASE_DB_URL: productionDbUrl,
      })
    ).toThrowError(/SUPABASE_DB_URL/);
  });

  it("rejects the known production Supabase URL during tests without leaking values", () => {
    expect(() =>
      validateNonProductionSupabaseEnvironment({
        NODE_ENV: "test",
        NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      })
    ).toThrowError(/production Supabase resource/i);

    try {
      validateNonProductionSupabaseEnvironment({
        NODE_ENV: "test",
        NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(message).not.toContain(productionRef);
      expect(message).not.toContain(productionUrl);
    }
  });

  it("rejects production project references in staging database URLs without leaking secrets", () => {
    expect(() =>
      validateNonProductionSupabaseEnvironment({
        APP_ENV: "staging",
        SUPABASE_DB_URL: productionDbUrl,
      })
    ).toThrowError(/SUPABASE_DB_URL/);

    try {
      validateNonProductionSupabaseEnvironment({
        APP_ENV: "staging",
        SUPABASE_DB_URL: productionDbUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).not.toContain(productionRef);
      expect(message).not.toContain("secret-password");
      expect(message).not.toContain(productionDbUrl);
    }
  });

  it("treats preview staging flags as non-production even when NODE_ENV is production", () => {
    expect(() =>
      validateNonProductionSupabaseEnvironment({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_IS_STAGING: "true",
        NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      })
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("permits local and isolated staging resources in non-production contexts", () => {
    expect(() =>
      validateNonProductionSupabaseEnvironment({
        NODE_ENV: "test",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_DB_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      })
    ).not.toThrow();

    expect(() =>
      validateNonProductionSupabaseEnvironment({
        APP_ENV: "presentation",
        NEXT_PUBLIC_SUPABASE_URL: "https://isolated-staging-ref.supabase.co",
        SUPABASE_DB_URL:
          "postgresql://postgres.isolated-staging-ref:password@aws-0-eu-north-1.pooler.supabase.com:6543/postgres",
      })
    ).not.toThrow();
  });

  it("does not block production runtime from using production resources", () => {
    expect(() =>
      validateNonProductionSupabaseEnvironment({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: productionUrl,
        SUPABASE_DB_URL: productionDbUrl,
      })
    ).not.toThrow();
  });

  it("runs from middleware before page-route Supabase client creation", () => {
    const middlewareSource = readFileSync(join(repoRoot, "middleware.ts"), "utf8");
    const guardCallIndex = middlewareSource.indexOf(
      "validateNonProductionSupabaseEnvironment();"
    );
    const clientCreationIndex = middlewareSource.indexOf(
      "const supabase = createServerClient"
    );

    expect(guardCallIndex).toBeGreaterThanOrEqual(0);
    expect(clientCreationIndex).toBeGreaterThanOrEqual(0);
    expect(guardCallIndex).toBeLessThan(clientCreationIndex);
  });
});
