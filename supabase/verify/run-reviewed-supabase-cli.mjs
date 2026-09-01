import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const REVIEWED_SUPABASE_CLI_VERSION = "2.115.0";

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

export function runReviewedSupabaseCli({
  args = process.argv.slice(2),
  workspace = process.cwd(),
  environment = process.env,
  spawn = spawnSync,
  executableVerifier = verifyApprovedSupabaseCliExecutable,
} = {}) {
  if (
    !Array.isArray(args) ||
    args.length === 0 ||
    args.some((argument) => typeof argument !== "string" || argument.includes("\0"))
  ) {
    throw new Error("A valid Supabase CLI command is required");
  }

  const executable = executableVerifier({ environment });
  const result = spawn(executable, args, {
    cwd: workspace,
    env: environment,
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
  try {
    process.exitCode = runReviewedSupabaseCli();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reviewed Supabase CLI command failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
