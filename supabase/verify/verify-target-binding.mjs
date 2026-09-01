import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const DIRECT_DB_HOST_PATTERN = /^db\.([a-z0-9]{20})\.supabase\.co$/;

export function assertSupabaseTargetBinding({
  linkedProjectRef,
  expectedProjectRef,
  databaseUrl,
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

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("SUPABASE_DB_URL is not a valid direct database URL");
  }

  const hostMatch = DIRECT_DB_HOST_PATTERN.exec(parsed.hostname);
  const allowedQuery =
    parsed.searchParams.size === 1 &&
    parsed.searchParams.get("sslmode") === "verify-full";
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !hostMatch ||
    parsed.port !== "5432" ||
    decodeURIComponent(parsed.username) !== "postgres" ||
    parsed.password.length === 0 ||
    parsed.pathname !== "/postgres" ||
    !allowedQuery ||
    parsed.hash !== ""
  ) {
    throw new Error("SUPABASE_DB_URL must be an unambiguous direct Supabase database URL");
  }

  if (hostMatch[1] !== normalizedExpectedRef) {
    throw new Error("Direct database target does not match the intended environment");
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

  return assertSupabaseTargetBinding({
    linkedProjectRef,
    expectedProjectRef,
    databaseUrl,
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
