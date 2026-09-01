import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  EXPECTED_CATALOG_CHECK_NAMES,
  assertNoPsqlMetaCommands,
  evaluateCatalogCsv,
  runProductionBaselineCatalogVerifier,
  verifyApprovedPsqlExecutable,
  verifyApprovedSslRootCertificate,
} from "../../../../supabase/verify/verify-production-baseline-catalog.mjs";

const projectRef = "abcdefghijklmnopqrst";
const password = "do-not-print-this-password";
const environment = {
  EXPECTED_SUPABASE_PROJECT_REF: projectRef,
  SUPABASE_DB_URL: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
};
const reviewedPsqlPath = resolve("reviewed-tooling", "psql.exe");
const reviewedCertificatePath = resolve("reviewed-tooling", "supabase-root.pem");
const reviewedTooling = {
  psqlVerifier: () => reviewedPsqlPath,
  rootCertificateVerifier: () => reviewedCertificatePath,
};
const expectedCheckNames = [
  "verifier_phase",
  "story_22_15_phase_contracts",
  "room_assignment_function_signatures",
  "repayment_boolean_columns",
  "repayment_indexes_and_config",
  "staffing_objects",
  "staffing_columns",
  "staffing_constraints_and_rls",
  "dietary_columns_and_permissions",
  "user_filters_objects",
  "user_filters_trigger_function_contract",
  "represented_column_contracts",
  "represented_function_contracts",
  "staffing_crewing_done_permission_state",
  "represented_policy_contracts",
];

function catalogCsv(failures: string[] = []) {
  return [
    "check_name,passed,observed",
    ...expectedCheckNames.map(
      (checkName) =>
        `${checkName},${failures.includes(checkName) ? "f" : "t"},"{}"`
    ),
  ].join("\n");
}

describe("Story 22.15 catalog verifier runner", () => {
  it("binds psql to an approved absolute path, SHA-256, and exact version", () => {
    const executable = Buffer.from("reviewed psql executable");
    const expectedSha256 = createHash("sha256").update(executable).digest("hex");
    const approvedEnvironment = {
      ...environment,
      PSQL_EXECUTABLE: reviewedPsqlPath,
      EXPECTED_PSQL_SHA256: expectedSha256,
      EXPECTED_PSQL_VERSION: "psql (PostgreSQL) 17.6",
      UNRELATED_PARENT_SECRET: "must-not-reach-version-probe",
    };
    let versionProbeEnvironment: Record<string, string> = {};

    expect(
      verifyApprovedPsqlExecutable({
        environment: approvedEnvironment,
        readExecutable: () => executable,
        resolveExecutable: (configuredPath: string) => configuredPath,
        spawn: (
          command: string,
          args: string[],
          options: { env: Record<string, string> }
        ) => {
          expect(command).toBe(reviewedPsqlPath);
          expect(args).toEqual(["--version"]);
          versionProbeEnvironment = options.env;
          return {
            error: undefined,
            status: 0,
            stdout: "psql (PostgreSQL) 17.6\n",
          };
        },
      })
    ).toBe(reviewedPsqlPath);
    expect(versionProbeEnvironment).not.toHaveProperty("SUPABASE_DB_URL");
    expect(versionProbeEnvironment).not.toHaveProperty("UNRELATED_PARENT_SECRET");
  });

  it("rejects a bare or unapproved psql executable", () => {
    expect(() =>
      verifyApprovedPsqlExecutable({
        environment: {
          PSQL_EXECUTABLE: "psql",
          EXPECTED_PSQL_SHA256: "0".repeat(64),
          EXPECTED_PSQL_VERSION: "psql (PostgreSQL) 17.6",
        },
      })
    ).toThrow("psql executable must use an approved absolute path");

    expect(() =>
      verifyApprovedPsqlExecutable({
        environment: {
          PSQL_EXECUTABLE: reviewedPsqlPath,
          EXPECTED_PSQL_SHA256: "0".repeat(64),
          EXPECTED_PSQL_VERSION: "psql (PostgreSQL) 17.6",
        },
        readExecutable: () => Buffer.from("different executable"),
        resolveExecutable: (configuredPath: string) => configuredPath,
      })
    ).toThrow("psql executable does not match the approved SHA-256");
  });

  it("pins an explicit reviewed CA PEM for verify-full TLS", () => {
    const certificate = Buffer.from(
      "-----BEGIN CERTIFICATE-----\nreviewed-ca\n-----END CERTIFICATE-----\n"
    );
    const expectedSha256 = createHash("sha256").update(certificate).digest("hex");

    expect(
      verifyApprovedSslRootCertificate({
        environment: {
          SUPABASE_SSL_ROOT_CERT: reviewedCertificatePath,
          EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256: expectedSha256,
        },
        readCertificate: () => certificate,
        resolveCertificate: (configuredPath: string) => configuredPath,
      })
    ).toBe(reviewedCertificatePath);

    expect(() =>
      verifyApprovedSslRootCertificate({
        environment: {
          SUPABASE_SSL_ROOT_CERT: reviewedCertificatePath,
          EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256: expectedSha256,
        },
        readCertificate: () => Buffer.from("-----BEGIN PRIVATE KEY-----"),
        resolveCertificate: (configuredPath: string) => configuredPath,
      })
    ).toThrow();
  });

  it("rejects every backslash byte before opening a database connection", () => {
    for (const unsafeSql of [
      "BEGIN TRANSACTION READ ONLY;\n\\connect attacker\nCOMMIT;",
      "SELECT 'safe value' \\gexec",
      "SELECT 1; \\! whoami",
      "SELECT 1 \\copy public.users TO 'leak.csv'",
      "-- \\copy is documentation only",
      "/* \\! in a comment */",
      String.raw`SELECT '\\gexec' AS "identifier\\value";`,
      String.raw`DO $body$ BEGIN RAISE NOTICE '\\!'; END $body$;`,
      String.raw`SELECT E'foo\'bar';
\! echo '`,
    ]) {
      expect(() => assertNoPsqlMetaCommands(unsafeSql)).toThrow(
        "Catalog verifier contains a forbidden psql meta-command"
      );
    }

    expect(() =>
      assertNoPsqlMetaCommands(
        [
          "-- ordinary documentation only",
          "/* nested /* comment */ comment */",
          `SELECT 'safe ''value''' AS "identifier";`,
          "DO $body$ BEGIN RAISE NOTICE 'safe'; END $body$;",
          "BEGIN TRANSACTION READ ONLY;",
          "COMMIT;",
        ].join("\n")
      )
    ).not.toThrow();
  });

  it("accepts a complete all-pass psql CSV result", () => {
    expect(EXPECTED_CATALOG_CHECK_NAMES).toEqual(expectedCheckNames);
    expect(evaluateCatalogCsv(catalogCsv())).toEqual({
      count: 15,
      failedChecks: [],
    });
  });

  it("returns only redacted check names for failed checks", () => {
    expect(
      evaluateCatalogCsv(
        catalogCsv(["staffing_constraints_and_rls", "user_filters_objects"])
      )
    ).toEqual({
      count: 15,
      failedChecks: ["staffing_constraints_and_rls", "user_filters_objects"],
    });
  });

  it.each([
    catalogCsv().split("\n").slice(0, -1).join("\n"),
    `${catalogCsv()}\n${expectedCheckNames[0]},t,"{}"`,
    catalogCsv().replace(expectedCheckNames[0], "unexpected_check"),
  ])("rejects missing, duplicate, or unexpected catalog checks", (csv) => {
    expect(() => evaluateCatalogCsv(csv)).toThrow(
      "Catalog verifier did not return the complete expected check set"
    );
  });

  it.each([
    "",
    "check_name,passed,observed\n",
    "check_name,passed,observed\nmissing_pass,,{}",
    "check_name,passed,observed\ninvalid,maybe,{}",
  ])("fails closed for an empty or malformed result", (csv) => {
    expect(() => evaluateCatalogCsv(csv)).toThrow(
      "Catalog verifier returned an unreadable result"
    );
  });

  it("exits the callable gate with only failed check names", async () => {
    await expect(
      runProductionBaselineCatalogVerifier({
        ...reviewedTooling,
        environment,
        phase: "production_pre_apply",
        spawn: () => ({
          error: undefined,
          status: 0,
          stdout: catalogCsv(["represented_policy_contracts"]),
        }),
        targetVerifier: async () => true,
      })
    ).rejects.toThrow(
      "Catalog verification failed: represented_policy_contracts"
    );
  });

  it("keeps the URL, project reference, and password out of the psql arguments", async () => {
    let observedArguments: string[] = [];
    let observedEnvironment: Record<string, string> = {};
    const poisonedEnvironment = {
      ...environment,
      PGHOSTADDR: "203.0.113.9",
      PGSERVICE: "wrong-database",
      PGOPTIONS: "-c search_path=attacker",
      UNRELATED_PARENT_SECRET: "must-not-reach-psql",
    };
    const evaluation = await runProductionBaselineCatalogVerifier({
      ...reviewedTooling,
      environment: poisonedEnvironment,
      phase: "staging_pre_apply",
      spawn: (
        _command: string,
        args: string[],
        options: { env: Record<string, string> }
      ) => {
        observedArguments = args;
        observedEnvironment = options.env;
        return {
          error: undefined,
          status: 0,
          stdout: `${catalogCsv()}\n`,
        };
      },
      targetVerifier: async () => true,
    });

    expect(evaluation).toEqual({ count: 15, failedChecks: [] });
    const commandLine = observedArguments.join(" ");
    expect(commandLine).not.toContain(environment.SUPABASE_DB_URL);
    expect(commandLine).not.toContain(projectRef);
    expect(commandLine).not.toContain(password);
    expect(observedEnvironment).toMatchObject({
      PGHOST: `db.${projectRef}.supabase.co`,
      PGPORT: "5432",
      PGDATABASE: "postgres",
      PGUSER: "postgres",
      PGSSLMODE: "verify-full",
      PGSSLROOTCERT: reviewedCertificatePath,
    });
    expect(observedEnvironment).not.toHaveProperty("PGHOSTADDR");
    expect(observedEnvironment).not.toHaveProperty("PGSERVICE");
    expect(observedEnvironment).not.toHaveProperty("PGOPTIONS");
    expect(observedEnvironment).not.toHaveProperty("SUPABASE_DB_URL");
    expect(observedEnvironment).not.toHaveProperty(
      "EXPECTED_SUPABASE_PROJECT_REF"
    );
    expect(observedEnvironment).not.toHaveProperty("UNRELATED_PARENT_SECRET");
  });

  it("rejects unknown phases before invoking psql", async () => {
    await expect(
      runProductionBaselineCatalogVerifier({
        ...reviewedTooling,
        environment,
        phase: "production",
        spawn: () => {
          throw new Error("psql must not run");
        },
        targetVerifier: async () => true,
      })
    ).rejects.toThrow("A valid catalog verification phase is required");
  });
});
