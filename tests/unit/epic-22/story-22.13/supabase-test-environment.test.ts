import { describe, expect, it, vi } from "vitest";

import {
  assertEpic22EvidenceRequirement,
  assertEpic22DatabaseFingerprint,
  formatEpic22SupabaseSkipDiagnostic,
  parseSupabaseConfig,
  resolveEpic22LocalServiceRoleKey,
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

  it("accepts explicit local URLs when they match this repo's ports", () => {
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
    expect(resolved.usesExplicitGuardManagedFixture).toBe(false);
  });

  it("accepts an explicit guard-managed loopback fixture on its own ports", () => {
    expect(
      resolveEpic22SupabaseTestEnvironment({
        configToml,
        envFilePresent: true,
        env: {
          EPIC_22_GUARD_MANAGED_FIXTURE: "true",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:16421",
          SUPABASE_DB_URL:
            "postgresql://postgres:fixture@127.0.0.1:16422/postgres",
        },
      })
    ).toMatchObject({
      apiUrl: "http://127.0.0.1:16421",
      dbUrl: "postgresql://postgres:fixture@127.0.0.1:16422/postgres",
      usesExplicitGuardManagedFixture: true,
    });
  });

  it("rejects an unmarked alternate loopback fixture", () => {
    expect(() =>
      resolveEpic22SupabaseTestEnvironment({
        configToml,
        envFilePresent: true,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          SUPABASE_DB_URL:
            "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
          SUPABASE_SERVICE_ROLE_KEY: "captured-local-key",
        },
      })
    ).toThrow(/guard-managed loopback fixture/i);
  });

  it("rejects a partially switched fixture even when it carries the marker", () => {
    expect(() =>
      resolveEpic22SupabaseTestEnvironment({
        configToml,
        envFilePresent: true,
        env: {
          EPIC_22_GUARD_MANAGED_FIXTURE: "true",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:16421",
          SUPABASE_DB_URL:
            "postgresql://postgres:fixture@127.0.0.1:15422/postgres",
        },
      })
    ).toThrow(/must not mix configured-stack and explicit-fixture ports/i);
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
          SUPABASE_SERVICE_ROLE_KEY: "captured-local-key",
        },
      })
    ).toThrow(/loopback/i);
  });

  it.each([
    {
      label: "non-loopback API host",
      env: {
        EPIC_22_GUARD_MANAGED_FIXTURE: "true",
        NEXT_PUBLIC_SUPABASE_URL: "http://192.0.2.10:16421",
        SUPABASE_DB_URL: "postgresql://postgres:fixture@127.0.0.1:16422/postgres",
      },
    },
    {
      label: "malformed database URL",
      env: {
        EPIC_22_GUARD_MANAGED_FIXTURE: "true",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:16421",
        SUPABASE_DB_URL: "not-a-url",
      },
    },
  ])("rejects $label", ({ env }) => {
    expect(() =>
      resolveEpic22SupabaseTestEnvironment({
        configToml,
        envFilePresent: true,
        env,
      })
    ).toThrow(/loopback|valid URL/i);
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

  it("fails a reachable database that lacks this repo's latest Epic 22 fingerprint", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await expect(
      assertEpic22DatabaseFingerprint({ query })
    ).rejects.toThrow(/20260831200026.*hr-masterdata/i);
  });

  it("prefers an explicit in-process local service-role key without .env.test", () => {
    expect(
      resolveEpic22LocalServiceRoleKey({
        envFilePresent: false,
        env: { SUPABASE_SERVICE_ROLE_KEY: "captured-status-key" },
        exampleEnvironment: {
          SUPABASE_SERVICE_ROLE_KEY: "example-fallback-key",
        },
      })
    ).toBe("captured-status-key");
  });

  it("gives the dedicated Epic 22 key precedence over setup and example placeholders", () => {
    expect(
      resolveEpic22LocalServiceRoleKey({
        envFilePresent: false,
        env: {
          EPIC_22_LOCAL_SERVICE_ROLE_KEY: "captured-real-local-key",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
        },
        exampleEnvironment: {
          SUPABASE_SERVICE_ROLE_KEY: "example-fallback-key",
        },
      })
    ).toBe("captured-real-local-key");
  });

  it("ignores the synthetic setup service key in favor of the example fallback", () => {
    expect(
      resolveEpic22LocalServiceRoleKey({
        envFilePresent: false,
        env: { SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key" },
        exampleEnvironment: {
          SUPABASE_SERVICE_ROLE_KEY: "example-fallback-key",
        },
      })
    ).toBe("example-fallback-key");
  });

  it("uses the example key only when neither .env.test nor explicit env provides one", () => {
    expect(
      resolveEpic22LocalServiceRoleKey({
        envFilePresent: false,
        env: {},
        exampleEnvironment: {
          SUPABASE_SERVICE_ROLE_KEY: "example-fallback-key",
        },
      })
    ).toBe("example-fallback-key");
    expect(
      resolveEpic22LocalServiceRoleKey({
        envFilePresent: true,
        env: {},
        exampleEnvironment: {
          SUPABASE_SERVICE_ROLE_KEY: "must-not-be-used",
        },
      })
    ).toBeNull();
  });

  it("accepts a database with the Story 22.15 migration fingerprint", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ version: "20260831200026" }],
    });

    await expect(
      assertEpic22DatabaseFingerprint({ query })
    ).resolves.toBeUndefined();
  });

  it("fails closed only when a named live-evidence gate is explicitly required", () => {
    expect(() =>
      assertEpic22EvidenceRequirement(
        false,
        true,
        "REQUIRE_STORY_22_15_DB_EVIDENCE",
        "local stack unavailable"
      )
    ).toThrow(
      /REQUIRE_STORY_22_15_DB_EVIDENCE=true requires this evidence test to run/i
    );
    expect(() =>
      assertEpic22EvidenceRequirement(
        false,
        false,
        "REQUIRE_STORY_22_15_DB_EVIDENCE",
        "local stack unavailable"
      )
    ).not.toThrow();
  });
});
