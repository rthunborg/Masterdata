import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  REVIEWED_SUPABASE_CLI_VERSION,
  runReviewedSupabaseCli,
  verifyApprovedSupabaseCliExecutable,
} from "../../../../supabase/verify/run-reviewed-supabase-cli.mjs";

const reviewedCliPath = resolve("reviewed-tooling", "supabase.exe");
const executable = Buffer.from("reviewed Supabase CLI executable");
const expectedSha256 = createHash("sha256").update(executable).digest("hex");

describe("Story 22.15 reviewed Supabase CLI runner", () => {
  it("resolves and hashes an approved absolute executable before an exact version probe", () => {
    const spawn = vi.fn(() => ({
      error: undefined,
      status: 0,
      stdout: `${REVIEWED_SUPABASE_CLI_VERSION}\n`,
    }));
    const environment = {
      SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
      EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
      SUPABASE_ACCESS_TOKEN: "must-not-reach-version-probe",
    };

    expect(
      verifyApprovedSupabaseCliExecutable({
        environment,
        readExecutable: () => executable,
        resolveExecutable: (configuredPath: string) => configuredPath,
        spawn,
      })
    ).toBe(reviewedCliPath);
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn.mock.calls[0]?.[0]).toBe(reviewedCliPath);
    expect(spawn.mock.calls[0]?.[1]).toEqual(["--version"]);
    expect(spawn.mock.calls[0]?.[2]?.env).not.toHaveProperty(
      "SUPABASE_ACCESS_TOKEN"
    );
  });

  it("rejects a PATH-resolved, missing-hash, hash-mismatched, or wrong-version executable", () => {
    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: {
          SUPABASE_CLI_EXECUTABLE: "supabase",
          EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
        },
      })
    ).toThrow("Supabase CLI must use an approved absolute path");

    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: { SUPABASE_CLI_EXECUTABLE: reviewedCliPath },
      })
    ).toThrow("Supabase CLI approved SHA-256 is unavailable or invalid");

    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: {
          SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
          EXPECTED_SUPABASE_CLI_SHA256: "0".repeat(64),
        },
        readExecutable: () => executable,
        resolveExecutable: (configuredPath: string) => configuredPath,
      })
    ).toThrow("Supabase CLI does not match the approved SHA-256");

    expect(() =>
      verifyApprovedSupabaseCliExecutable({
        environment: {
          SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
          EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
        },
        readExecutable: () => executable,
        resolveExecutable: (configuredPath: string) => configuredPath,
        spawn: () => ({ error: undefined, status: 0, stdout: "2.116.0\n" }),
      })
    ).toThrow("Supabase CLI does not match the reviewed version");
  });

  it("spawns only the verified resolved executable with the exact requested arguments", () => {
    const spawn = vi.fn(() => ({ error: undefined, status: 0 }));
    const environment = {
      SUPABASE_CLI_EXECUTABLE: reviewedCliPath,
      EXPECTED_SUPABASE_CLI_SHA256: expectedSha256,
      SUPABASE_ACCESS_TOKEN: "approved-runtime-token",
    };
    const args = ["migration", "list", "--linked"];
    const executableVerifier = vi.fn(() => reviewedCliPath);

    expect(
      runReviewedSupabaseCli({
        args,
        workspace: resolve("workspace"),
        environment,
        spawn,
        executableVerifier,
      })
    ).toBe(0);
    expect(executableVerifier).toHaveBeenCalledWith({ environment });
    expect(spawn).toHaveBeenCalledWith(reviewedCliPath, args, {
      cwd: resolve("workspace"),
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    });
  });

  it("preserves a nonzero CLI exit status and rejects an empty command", () => {
    expect(
      runReviewedSupabaseCli({
        args: ["db", "push", "--linked", "--dry-run", "--skip-vault"],
        spawn: () => ({ error: undefined, status: 17 }),
        executableVerifier: () => reviewedCliPath,
      })
    ).toBe(17);

    expect(() =>
      runReviewedSupabaseCli({
        args: [],
        executableVerifier: () => reviewedCliPath,
      })
    ).toThrow("A valid Supabase CLI command is required");
  });
});
