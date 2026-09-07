import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { verifyApprovedSslRootCertificate } from "./verify-production-baseline-catalog.mjs";
import { verifyConfiguredSupabaseTarget } from "./verify-target-binding.mjs";

export const REVIEWED_SUPABASE_CLI_VERSION = "2.115.0";
export const REVIEWED_TARGET_FLAG = "--reviewed-target";

const REVIEWED_DATABASE_URL =
  "postgresql:///postgres?sslmode=verify-full";
const DATABASE_COMMAND_GROUPS = new Set(["db", "migration"]);
const REVIEWED_DATABASE_COMMANDS = new Set([
  "db:advisors",
  "db:push",
  "migration:list",
  "migration:repair",
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_VERSION_ENVIRONMENT_KEYS = [
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

function createSafeVersionEnvironment(environment) {
  const childEnvironment = {};
  for (const key of SAFE_VERSION_ENVIRONMENT_KEYS) {
    if (typeof environment[key] === "string") {
      childEnvironment[key] = environment[key];
    }
  }
  return childEnvironment;
}

function isHelpCommand(args) {
  return args.includes("--help") || args.includes("-h");
}

function isNativeTargetSelector(argument) {
  return (
    argument === "--db-url" ||
    argument.startsWith("--db-url=") ||
    argument === "--linked" ||
    argument.startsWith("--linked=") ||
    argument === "--local" ||
    argument.startsWith("--local=") ||
    argument === "--proxy" ||
    argument.startsWith("--proxy=") ||
    argument === "--password" ||
    argument.startsWith("--password=")
  );
}

function getDatabaseCommandKey(args) {
  return args.length >= 2 ? `${args[0]}:${args[1]}` : "";
}

function createReviewedDatabaseEnvironment(
  environment,
  databaseUrl,
  sslRootCertificatePath
) {
  return {
    ...createSafeVersionEnvironment(environment),
    PGAPPNAME: "hr-masterdata-reviewed-supabase-cli",
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

function prepareReviewedDatabaseArguments(args) {
  const reviewedTargetCount = args.filter(
    (argument) => argument === REVIEWED_TARGET_FLAG
  ).length;
  if (reviewedTargetCount !== 1) {
    throw new Error(
      "Remote database commands require exactly one reviewed target marker"
    );
  }
  if (args.some(isNativeTargetSelector)) {
    throw new Error(
      "Native Supabase CLI database target selectors are not permitted"
    );
  }

  return [
    ...args.filter((argument) => argument !== REVIEWED_TARGET_FLAG),
    "--db-url",
    REVIEWED_DATABASE_URL,
  ];
}

export function verifyApprovedSupabaseCliExecutable({
  environment = process.env,
  readExecutable = readFileSync,
  resolveExecutable = realpathSync,
  spawn = spawnSync,
} = {}) {
  const configuredPath = environment.SUPABASE_CLI_EXECUTABLE;
  if (typeof configuredPath !== "string" || !path.isAbsolute(configuredPath)) {
    throw new Error("Supabase CLI must use an approved absolute path");
  }

  const expectedSha256 =
    environment.EXPECTED_SUPABASE_CLI_SHA256?.trim().toLowerCase() ?? "";
  if (!SHA256_PATTERN.test(expectedSha256)) {
    throw new Error("Supabase CLI approved SHA-256 is unavailable or invalid");
  }

  let resolvedPath;
  let executable;
  try {
    resolvedPath = resolveExecutable(configuredPath);
    executable = readExecutable(resolvedPath);
  } catch {
    throw new Error("Supabase CLI approved executable is unavailable");
  }

  const actualSha256 = createHash("sha256").update(executable).digest("hex");
  if (actualSha256 !== expectedSha256) {
    throw new Error("Supabase CLI does not match the approved SHA-256");
  }

  const versionResult = spawn(resolvedPath, ["--version"], {
    encoding: "utf8",
    env: createSafeVersionEnvironment(environment),
    windowsHide: true,
  });
  if (
    versionResult.error ||
    versionResult.status !== 0 ||
    versionResult.stdout?.trim() !== REVIEWED_SUPABASE_CLI_VERSION
  ) {
    throw new Error("Supabase CLI does not match the reviewed version");
  }

  return resolvedPath;
}

export async function runReviewedSupabaseCli({
  args = process.argv.slice(2),
  workspace = process.cwd(),
  environment = process.env,
  spawn = spawnSync,
  executableVerifier = verifyApprovedSupabaseCliExecutable,
  targetVerifier = verifyConfiguredSupabaseTarget,
  rootCertificateVerifier = verifyApprovedSslRootCertificate,
} = {}) {
  if (
    !Array.isArray(args) ||
    args.length === 0 ||
    args.some((argument) => typeof argument !== "string" || argument.includes("\0"))
  ) {
    throw new Error("A valid Supabase CLI command is required");
  }

  const executable = executableVerifier({ environment });
  const databaseCommandKey = getDatabaseCommandKey(args);
  const isDatabaseCommand = DATABASE_COMMAND_GROUPS.has(args[0]);
  const isReviewedDatabaseCommand = REVIEWED_DATABASE_COMMANDS.has(
    databaseCommandKey
  );
  const hasReviewedTargetFlag = args.includes(REVIEWED_TARGET_FLAG);
  const helpCommand = isHelpCommand(args);
  if (
    hasReviewedTargetFlag &&
    (!isReviewedDatabaseCommand || helpCommand)
  ) {
    throw new Error("Reviewed target marker is not valid for this command");
  }
  if (isDatabaseCommand && args.some(isNativeTargetSelector)) {
    throw new Error(
      "Native Supabase CLI database target selectors are not permitted"
    );
  }
  if (isDatabaseCommand && !helpCommand && !isReviewedDatabaseCommand) {
    throw new Error("This Supabase CLI database command is not approved");
  }

  let childArguments = args;
  let childEnvironment = environment;
  if (isReviewedDatabaseCommand && !helpCommand) {
    childArguments = prepareReviewedDatabaseArguments(args);
    await targetVerifier({ workspace, environment });
    const sslRootCertificatePath = rootCertificateVerifier({ environment });
    const databaseUrl = new URL(environment.SUPABASE_DB_URL);
    childEnvironment = createReviewedDatabaseEnvironment(
      environment,
      databaseUrl,
      sslRootCertificatePath
    );
  }

  const result = spawn(executable, childArguments, {
    cwd: workspace,
    env: childEnvironment,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error("Reviewed Supabase CLI command could not be started");
  }
  if (typeof result.status !== "number") {
    throw new Error("Reviewed Supabase CLI command did not return an exit status");
  }

  return result.status;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runReviewedSupabaseCli().then(
    (status) => {
      process.exitCode = status;
    },
    (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Reviewed Supabase CLI command failed";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  );
}
