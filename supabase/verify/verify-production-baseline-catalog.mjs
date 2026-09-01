import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import Papa from "papaparse";

import { verifyConfiguredSupabaseTarget } from "./verify-target-binding.mjs";

const ALLOWED_PHASES = new Set([
  "production_pre_apply",
  "staging_pre_apply",
  "post_apply",
]);
export const EXPECTED_CATALOG_CHECK_NAMES = Object.freeze([
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
]);
const SAFE_PROCESS_ENVIRONMENT_KEYS = [
  "COMSPEC",
  "LANG",
  "LC_ALL",
  "PATH",
  "Path",
  "PATHEXT",
  "SYSTEMROOT",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TZ",
  "WINDIR",
];
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function createSafeProcessEnvironment(environment) {
  const childEnvironment = {};
  for (const key of SAFE_PROCESS_ENVIRONMENT_KEYS) {
    if (typeof environment[key] === "string") {
      childEnvironment[key] = environment[key];
    }
  }
  return childEnvironment;
}

export function assertNoPsqlMetaCommands(sql) {
  if (sql.includes("\\")) {
    throw new Error("Catalog verifier contains a forbidden psql meta-command");
  }
}

function createPsqlEnvironment(environment, databaseUrl, sslRootCertificatePath) {
  return {
    ...createSafeProcessEnvironment(environment),
    PGAPPNAME: "hr-masterdata-catalog-verifier",
    PGCONNECT_TIMEOUT: "10",
    PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
    PGHOST: databaseUrl.hostname,
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGPORT: databaseUrl.port,
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: sslRootCertificatePath,
    PGUSER: decodeURIComponent(databaseUrl.username),
  };
}

function verifyReviewedArtifact({
  configuredPath,
  expectedSha256,
  label,
  readArtifact,
  resolveArtifact,
}) {
  if (typeof configuredPath !== "string" || !path.isAbsolute(configuredPath)) {
    throw new Error(`${label} must use an approved absolute path`);
  }
  const normalizedExpectedSha256 = expectedSha256?.trim().toLowerCase() ?? "";
  if (!SHA256_PATTERN.test(normalizedExpectedSha256)) {
    throw new Error(`${label} approved SHA-256 is unavailable or invalid`);
  }

  let resolvedPath;
  let contents;
  try {
    resolvedPath = resolveArtifact(configuredPath);
    contents = readArtifact(resolvedPath);
  } catch {
    throw new Error(`${label} approved artifact is unavailable`);
  }

  const actualSha256 = createHash("sha256").update(contents).digest("hex");
  if (actualSha256 !== normalizedExpectedSha256) {
    throw new Error(`${label} does not match the approved SHA-256`);
  }

  return { contents, resolvedPath };
}

export function verifyApprovedPsqlExecutable({
  environment = process.env,
  readExecutable = readFileSync,
  resolveExecutable = realpathSync,
  spawn = spawnSync,
} = {}) {
  const { resolvedPath } = verifyReviewedArtifact({
    configuredPath: environment.PSQL_EXECUTABLE,
    expectedSha256: environment.EXPECTED_PSQL_SHA256,
    label: "psql executable",
    readArtifact: readExecutable,
    resolveArtifact: resolveExecutable,
  });
  const expectedVersion = environment.EXPECTED_PSQL_VERSION?.trim() ?? "";
  if (!/^psql \(PostgreSQL\) [0-9][^\r\n]{0,100}$/u.test(expectedVersion)) {
    throw new Error("psql approved version is unavailable or invalid");
  }

  const versionResult = spawn(resolvedPath, ["--version"], {
    encoding: "utf8",
    env: createSafeProcessEnvironment(environment),
    windowsHide: true,
  });
  if (
    versionResult.error ||
    versionResult.status !== 0 ||
    versionResult.stdout?.trim() !== expectedVersion
  ) {
    throw new Error("psql does not match the approved version");
  }

  return resolvedPath;
}

export function verifyApprovedSslRootCertificate({
  environment = process.env,
  readCertificate = readFileSync,
  resolveCertificate = realpathSync,
} = {}) {
  const { contents, resolvedPath } = verifyReviewedArtifact({
    configuredPath: environment.SUPABASE_SSL_ROOT_CERT,
    expectedSha256: environment.EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256,
    label: "Supabase TLS root certificate",
    readArtifact: readCertificate,
    resolveArtifact: resolveCertificate,
  });
  const pem = contents.toString("utf8");
  if (
    !pem.includes("-----BEGIN CERTIFICATE-----") ||
    !pem.includes("-----END CERTIFICATE-----") ||
    pem.includes("PRIVATE KEY")
  ) {
    throw new Error("Supabase TLS root certificate is not an approved CA PEM");
  }
  return resolvedPath;
}

export function evaluateCatalogCsv(csv) {
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: "greedy",
  });

  if (
    parsed.errors.length > 0 ||
    parsed.data.length === 0 ||
    JSON.stringify(parsed.meta.fields) !==
      JSON.stringify(["check_name", "passed", "observed"])
  ) {
    throw new Error("Catalog verifier returned an unreadable result");
  }

  const checks = parsed.data.map((row) => {
    const checkName = typeof row.check_name === "string" ? row.check_name : "";
    const rawPassed = typeof row.passed === "string" ? row.passed.toLowerCase() : "";
    if (!checkName || !["t", "f", "true", "false"].includes(rawPassed)) {
      throw new Error("Catalog verifier returned an unreadable result");
    }
    return {
      checkName,
      passed: rawPassed === "t" || rawPassed === "true",
    };
  });

  const observedNames = checks.map((check) => check.checkName);
  const observedNameSet = new Set(observedNames);
  if (
    observedNames.length !== EXPECTED_CATALOG_CHECK_NAMES.length ||
    observedNameSet.size !== EXPECTED_CATALOG_CHECK_NAMES.length ||
    EXPECTED_CATALOG_CHECK_NAMES.some(
      (expectedName) => !observedNameSet.has(expectedName)
    )
  ) {
    throw new Error(
      "Catalog verifier did not return the complete expected check set"
    );
  }

  return {
    count: checks.length,
    failedChecks: checks
      .filter((check) => !check.passed)
      .map((check) => check.checkName),
  };
}

export async function runProductionBaselineCatalogVerifier({
  phase,
  workspace = process.cwd(),
  environment = process.env,
  spawn = spawnSync,
  targetVerifier = verifyConfiguredSupabaseTarget,
  psqlVerifier = verifyApprovedPsqlExecutable,
  rootCertificateVerifier = verifyApprovedSslRootCertificate,
} = {}) {
  if (!ALLOWED_PHASES.has(phase)) {
    throw new Error("A valid catalog verification phase is required");
  }

  await targetVerifier({ workspace, environment });

  const psqlExecutable = psqlVerifier({ environment });
  const sslRootCertificatePath = rootCertificateVerifier({ environment });

  const databaseUrl = new URL(environment.SUPABASE_DB_URL);
  const childEnvironment = createPsqlEnvironment(
    environment,
    databaseUrl,
    sslRootCertificatePath
  );

  const verifierPath = path.join(
    workspace,
    "supabase",
    "verify",
    "production-baseline-catalog.sql"
  );
  assertNoPsqlMetaCommands(readFileSync(verifierPath, "utf8"));
  const result = spawn(
    psqlExecutable,
    [
      "--no-psqlrc",
      "--quiet",
      "--csv",
      "--set",
      "ON_ERROR_STOP=1",
      "--set",
      `catalog_phase=${phase}`,
      "--file",
      verifierPath,
    ],
    {
      cwd: workspace,
      encoding: "utf8",
      env: childEnvironment,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    }
  );

  if (result.error || result.status !== 0) {
    throw new Error("Catalog query failed before a complete result was returned");
  }

  const evaluation = evaluateCatalogCsv(result.stdout);
  if (evaluation.failedChecks.length > 0) {
    throw new Error(
      `Catalog verification failed: ${evaluation.failedChecks.join(", ")}`
    );
  }

  return evaluation;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runProductionBaselineCatalogVerifier({ phase: process.argv[2] }).then(
    (evaluation) => {
      process.stdout.write(
        `Catalog verification passed (${evaluation.count} checks).\n`
      );
    },
    (error) => {
      const message =
        error instanceof Error ? error.message : "Catalog verification failed";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  );
}
