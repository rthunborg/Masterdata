import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const DIRECT_DB_HOST_PATTERN = /^db\.([a-z0-9]{20})\.supabase\.co$/;
const SESSION_POOLER_HOST_PATTERN =
  /^aws-[a-z0-9]+(?:-[a-z0-9]+)*\.pooler\.supabase\.com$/;
const SESSION_POOLER_USERNAME_PATTERN = /^postgres\.([a-z0-9]{20})$/;
const CONNECTION_MODES = new Set(["direct", "session-pooler"]);

export function assertSupabaseTargetBinding({
  linkedProjectRef,
  expectedProjectRef,
  databaseUrl,
  connectionMode,
  expectedPoolerHost,
}) {
  const normalizedRef = linkedProjectRef.trim();
  if (!PROJECT_REF_PATTERN.test(normalizedRef)) {
    throw new Error("Linked Supabase project reference is unavailable or invalid");
  }

  const normalizedExpectedRef = expectedProjectRef?.trim() ?? "";
  if (!PROJECT_REF_PATTERN.test(normalizedExpectedRef)) {
    throw new Error("Expected Supabase project reference is unavailable or invalid");
  }

  if (normalizedRef !== normalizedExpectedRef) {
    throw new Error("Linked CLI project does not match the intended environment");
  }

  const normalizedConnectionMode = connectionMode?.trim() ?? "";
  if (!CONNECTION_MODES.has(normalizedConnectionMode)) {
    throw new Error("Supabase database connection mode is unavailable or invalid");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("SUPABASE_DB_URL is not a valid database URL");
  }

  const allowedQuery =
    parsed.searchParams.size === 1 &&
    parsed.searchParams.get("sslmode") === "verify-full";
  const commonUrlShapeIsInvalid =
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    parsed.port !== "5432" ||
    parsed.password.length === 0 ||
    parsed.pathname !== "/postgres" ||
    !allowedQuery ||
    parsed.hash !== "";

  if (commonUrlShapeIsInvalid) {
    const expectedUrlType =
      normalizedConnectionMode === "direct"
        ? "direct Supabase database"
        : "Supabase session pooler";
    throw new Error(`SUPABASE_DB_URL must be an unambiguous ${expectedUrlType} URL`);
  }

  if (normalizedConnectionMode === "direct") {
    if ((expectedPoolerHost?.trim() ?? "") !== "") {
      throw new Error("Direct database binding must not include a pooler host");
    }

    const hostMatch = DIRECT_DB_HOST_PATTERN.exec(parsed.hostname);
    if (!hostMatch || decodeURIComponent(parsed.username) !== "postgres") {
      throw new Error(
        "SUPABASE_DB_URL must be an unambiguous direct Supabase database URL"
      );
    }
    if (hostMatch[1] !== normalizedExpectedRef) {
      throw new Error("Direct database target does not match the intended environment");
    }
    return true;
  }

  const normalizedExpectedPoolerHost = expectedPoolerHost?.trim() ?? "";
  if (!SESSION_POOLER_HOST_PATTERN.test(normalizedExpectedPoolerHost)) {
    throw new Error("Approved Supabase session pooler host is unavailable or invalid");
  }

  if (!SESSION_POOLER_HOST_PATTERN.test(parsed.hostname)) {
    throw new Error(
      "SUPABASE_DB_URL must be an unambiguous Supabase session pooler URL"
    );
  }
  if (parsed.hostname !== normalizedExpectedPoolerHost) {
    throw new Error("Session pooler host does not match the approved environment host");
  }

  const usernameMatch = SESSION_POOLER_USERNAME_PATTERN.exec(
    decodeURIComponent(parsed.username)
  );
  if (!usernameMatch) {
    throw new Error(
      "SUPABASE_DB_URL must be an unambiguous Supabase session pooler URL"
    );
  }
  if (usernameMatch[1] !== normalizedExpectedRef) {
    throw new Error("Session pooler username does not match the intended environment");
  }

  return true;
}

export async function verifyConfiguredSupabaseTarget({
  workspace = process.cwd(),
  environment = process.env,
} = {}) {
  const projectRefPath = path.join(
    workspace,
    "supabase",
    ".temp",
    "project-ref"
  );
  let linkedProjectRef;
  try {
    linkedProjectRef = await readFile(projectRefPath, "utf8");
  } catch {
    throw new Error("Linked Supabase project reference is unavailable or invalid");
  }

  const databaseUrl = environment.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error("SUPABASE_DB_URL is required for target binding verification");
  }

  const expectedProjectRef = environment.EXPECTED_SUPABASE_PROJECT_REF;
  if (!expectedProjectRef) {
    throw new Error(
      "EXPECTED_SUPABASE_PROJECT_REF is required for target binding verification"
    );
  }

  const connectionMode = environment.SUPABASE_DB_CONNECTION_MODE;
  if (!connectionMode) {
    throw new Error(
      "SUPABASE_DB_CONNECTION_MODE is required for target binding verification"
    );
  }

  return assertSupabaseTargetBinding({
    linkedProjectRef,
    expectedProjectRef,
    databaseUrl,
    connectionMode,
    expectedPoolerHost: environment.EXPECTED_SUPABASE_POOLER_HOST,
  });
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  verifyConfiguredSupabaseTarget().then(
    () => {
      process.stdout.write("Supabase target binding verified.\n");
    },
    (error) => {
      const message = error instanceof Error ? error.message : "Target binding verification failed";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  );
}
