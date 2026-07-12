import { describe, expect, it, vi } from "vitest";

import {
  assertEpic22DatabaseFingerprint,
  formatEpic22SupabaseSkipDiagnostic,
  parseSupabaseConfig,
  resolveEpic22SupabaseTestEnvironment,
} from "../../../helpers/epic-22-supabase-test-environment";

const configToml = `
project_id = "hr-masterdata"

[api]
port = 15421

[db]
port = 15422
shadow_port = 15420
`;

describe("Epic 22 Supabase test environment", () => {
  it("reads the project id and high ports from supabase/config.toml", () => {
    expect(parseSupabaseConfig(configToml)).toEqual({
      projectId: "hr-masterdata",
      apiPort: 15421,
      dbPort: 15422,
    });
  });

  it("uses the configured high-port local stack when .env.test is absent", () => {
    expect(
      resolveEpic22SupabaseTestEnvironment({
        configToml,
        env: {},
        envFilePresent: false,
      })
    ).toMatchObject({
      projectId: "hr-masterdata",
      apiUrl: "http://127.0.0.1:15421",
      dbUrl: "postgresql://postgres:postgres@127.0.0.1:15422/postgres",
      envFilePresent: false,
    });
  });

  it("accepts explicit local URLs only when they match this repo's ports", () => {
    const resolved = resolveEpic22SupabaseTestEnvironment({
      configToml,
      envFilePresent: true,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:15421",
        SUPABASE_DB_URL:
          "postgresql://postgres:secret@localhost:15422/postgres",
      },
    });

    expect(resolved.apiPort).toBe(15421);
    expect(resolved.dbPort).toBe(15422);
  });

  it("rejects the old default Supabase ports instead of testing another stack", () => {
    expect(() =>
      resolveEpic22SupabaseTestEnvironment({
        configToml,
        envFilePresent: true,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          SUPABASE_DB_URL:
            "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        },
      })
    ).toThrow(/hr-masterdata.*15421.*15422/i);
  });

  it("rejects remote databases for local evidence tests", () => {
    expect(() =>
      resolveEpic22SupabaseTestEnvironment({
        configToml,
        envFilePresent: true,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_DB_URL:
            "postgresql://postgres:secret@db.example.supabase.co:5432/postgres",
        },
      })
    ).toThrow(/local Supabase/i);
  });

  it("names missing .env.test and the expected project endpoints in skip output", () => {
    const environment = resolveEpic22SupabaseTestEnvironment({
      configToml,
      env: {},
      envFilePresent: false,
    });

    expect(formatEpic22SupabaseSkipDiagnostic(environment)).toContain(
      ".env.test is absent"
    );
    expect(formatEpic22SupabaseSkipDiagnostic(environment)).toContain(
      "hr-masterdata"
    );
    expect(formatEpic22SupabaseSkipDiagnostic(environment)).toContain("15422");
  });

  it("fails a reachable database that lacks this repo's Story 22.13 fingerprint", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await expect(
      assertEpic22DatabaseFingerprint({ query })
    ).rejects.toThrow(/20260710150000.*hr-masterdata/i);
  });

  it("accepts a database with the Story 22.13 migration fingerprint", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ version: "20260710150000" }],
    });

    await expect(
      assertEpic22DatabaseFingerprint({ query })
    ).resolves.toBeUndefined();
  });
});
