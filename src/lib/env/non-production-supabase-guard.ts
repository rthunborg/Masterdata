import { z } from "zod";

type GuardEnv = Record<string, string | undefined>;

const productionSupabaseResourceSchema = z.object({
  projectRef: z.string().min(1),
  apiUrl: z.string().url(),
  databaseHosts: z.array(z.string().min(1)),
});

const guardEnvSchema = z.record(z.string(), z.string().optional());

const KNOWN_PRODUCTION_SUPABASE = productionSupabaseResourceSchema.parse({
  projectRef: "njgmfvsqevhoxpqbnpnd",
  apiUrl: "https://njgmfvsqevhoxpqbnpnd.supabase.co",
  databaseHosts: ["db.njgmfvsqevhoxpqbnpnd.supabase.co"],
});

const MONITORED_RESOURCE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_REST_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_ID",
  "NEXT_PUBLIC_SUPABASE_PROJECT_REF",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_DB_URL",
  "STAGING_SUPABASE_DB_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_NON_POOLING_URL",
  "SUPABASE_BACKUP_STORAGE_URL",
] as const;

const NON_PRODUCTION_ENV_VALUES = new Set([
  "development",
  "test",
  "staging",
  "preview",
  "presentation",
]);

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isTruthyFlag(value: string | undefined) {
  return ["1", "true", "yes"].includes(normalize(value));
}

function isNonProductionExecution(env: GuardEnv) {
  const environmentValues = [
    env.NODE_ENV,
    env.APP_ENV,
    env.NEXT_PUBLIC_APP_ENV,
    env.VERCEL_ENV,
    env.DEPLOYMENT_ENV,
    env.NEXT_PUBLIC_DEPLOYMENT_ENV,
  ].map(normalize);

  return (
    environmentValues.some((value) => NON_PRODUCTION_ENV_VALUES.has(value)) ||
    isTruthyFlag(env.NEXT_PUBLIC_IS_STAGING) ||
    isTruthyFlag(env.IS_STAGING) ||
    isTruthyFlag(env.PRESENTATION_ENV) ||
    isTruthyFlag(env.NEXT_PUBLIC_PRESENTATION_ENV)
  );
}

function containsKnownProductionResource(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  const productionMarkers = [
    KNOWN_PRODUCTION_SUPABASE.apiUrl,
    KNOWN_PRODUCTION_SUPABASE.projectRef,
    ...KNOWN_PRODUCTION_SUPABASE.databaseHosts,
  ].map(normalize);

  return productionMarkers.some((marker) => normalizedValue.includes(marker));
}

export function validateNonProductionSupabaseEnvironment(
  env: GuardEnv = process.env
) {
  const parsedEnv = guardEnvSchema.parse(env);

  if (!isNonProductionExecution(parsedEnv)) {
    return;
  }

  const unsafeKeys = MONITORED_RESOURCE_KEYS.filter((key) => {
    const value = parsedEnv[key];
    return typeof value === "string" && containsKnownProductionResource(value);
  });

  if (unsafeKeys.length === 0) {
    return;
  }

  throw new Error(
    "Refusing to run non-production execution with production Supabase resource values in " +
      `${unsafeKeys.join(", ")}. Use local Supabase or an isolated staging/test project. ` +
      "Resource values are intentionally omitted from this message."
  );
}
