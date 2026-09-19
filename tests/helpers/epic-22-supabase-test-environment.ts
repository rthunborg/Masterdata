import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { Client } from "pg";

import { validateNonProductionSupabaseEnvironment } from "@/lib/env/non-production-supabase-guard";

const LATEST_EPIC_22_MIGRATION_VERSION = "20260831200026";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export interface ParsedSupabaseConfig {
  projectId: string;
  apiPort: number;
  dbPort: number;
}

export interface Epic22SupabaseTestEnvironment extends ParsedSupabaseConfig {
  apiUrl: string;
  dbUrl: string;
  envFilePresent: boolean;
  usesExplicitGuardManagedFixture: boolean;
}

interface ResolveEnvironmentOptions {
  configToml: string;
  env: Record<string, string | undefined>;
  envFilePresent: boolean;
}

interface ResolveServiceRoleKeyOptions {
  env: Record<string, string | undefined>;
  envFilePresent: boolean;
  exampleEnvironment?: Record<string, string | undefined>;
}

function readSection(configToml: string, sectionName: string) {
  const headerPattern = new RegExp(`^\\[${sectionName}\\]\\s*$`, "m");
  const header = headerPattern.exec(configToml);
  if (!header) return "";

  const sectionStart = header.index + header[0].length;
  const remainder = configToml.slice(sectionStart);
  const nextSection = remainder.search(/^\s*\[/m);
  return nextSection === -1 ? remainder : remainder.slice(0, nextSection);
}

function readRequiredPort(section: string, label: string) {
  const portValue = section.match(/^port\s*=\s*(\d+)\s*$/m)?.[1];
  const port = Number(portValue);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Missing valid ${label} port in supabase/config.toml`);
  }
  return port;
}

export function parseSupabaseConfig(
  configToml: string
): ParsedSupabaseConfig {
  const projectId = configToml.match(
    /^project_id\s*=\s*["']([^"']+)["']\s*$/m
  )?.[1];
  if (!projectId) {
    throw new Error("Missing project_id in supabase/config.toml");
  }

  return {
    projectId,
    apiPort: readRequiredPort(readSection(configToml, "api"), "API"),
    dbPort: readRequiredPort(readSection(configToml, "db"), "database"),
  };
}

function parseLoopbackUrl(rawUrl: string, label: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label} is not a valid URL for Epic 22 evidence tests`);
  }

  const port = Number(parsed.port);
  if (!LOCAL_HOSTS.has(parsed.hostname) || !Number.isInteger(port) || port <= 0) {
    throw new Error(
      `${label} must use an explicit loopback host and port for Epic 22 evidence.`
    );
  }

  return { port };
}

function usesConfiguredPorts(
  apiPort: number,
  databasePort: number,
  config: ParsedSupabaseConfig
) {
  return apiPort === config.apiPort && databasePort === config.dbPort;
}

function assertApprovedFixturePorts({
  apiPort,
  databasePort,
  env,
  config,
}: {
  apiPort: number;
  databasePort: number;
  env: Record<string, string | undefined>;
  config: ParsedSupabaseConfig;
}) {
  if (usesConfiguredPorts(apiPort, databasePort, config)) return false;

  const apiUsesConfiguredPort = apiPort === config.apiPort;
  const databaseUsesConfiguredPort = databasePort === config.dbPort;
  if (apiUsesConfiguredPort || databaseUsesConfiguredPort) {
    throw new Error(
      "Epic 22 evidence must not mix configured-stack and explicit-fixture ports."
    );
  }

  // This marker only selects the explicit local port pair. The guard-managed
  // resource runner must verify lifecycle ownership before it exposes .env.test;
  // the marker is neither an ownership proof nor authorization to use a target.
  if (env.EPIC_22_GUARD_MANAGED_FIXTURE !== "true") {
    throw new Error(
      `Epic 22 evidence must use the configured local ports (${config.apiPort}/${config.dbPort}) ` +
        "or an explicit guard-managed loopback fixture. Set " +
        "EPIC_22_GUARD_MANAGED_FIXTURE=true only for that fixture."
    );
  }

  return true;
}

export function resolveEpic22SupabaseTestEnvironment({
  configToml,
  env,
  envFilePresent,
}: ResolveEnvironmentOptions): Epic22SupabaseTestEnvironment {
  const config = parseSupabaseConfig(configToml);
  const defaultApiUrl = `http://127.0.0.1:${config.apiPort}`;
  const defaultDbUrl =
    `postgresql://postgres:postgres@127.0.0.1:${config.dbPort}/postgres`;

  const hasExplicitDatabase = Boolean(env.SUPABASE_DB_URL);
  const setupPlaceholderApi =
    !envFilePresent && env.NEXT_PUBLIC_SUPABASE_URL === "http://localhost:54321";
  const apiUrl =
    (envFilePresent || hasExplicitDatabase) && !setupPlaceholderApi
      ? env.NEXT_PUBLIC_SUPABASE_URL ?? defaultApiUrl
      : defaultApiUrl;
  const dbUrl = env.SUPABASE_DB_URL ?? defaultDbUrl;

  const api = parseLoopbackUrl(apiUrl, "NEXT_PUBLIC_SUPABASE_URL");
  const database = parseLoopbackUrl(dbUrl, "SUPABASE_DB_URL");
  const usesExplicitGuardManagedFixture = assertApprovedFixturePorts({
    apiPort: api.port,
    databasePort: database.port,
    env,
    config,
  });

  return {
    ...config,
    apiUrl,
    dbUrl,
    envFilePresent,
    usesExplicitGuardManagedFixture,
  };
}

export function resolveEpic22LocalServiceRoleKey({
  env,
  envFilePresent,
  exampleEnvironment = {},
}: ResolveServiceRoleKeyOptions) {
  const dedicatedKey = env.EPIC_22_LOCAL_SERVICE_ROLE_KEY?.trim();
  if (dedicatedKey) return dedicatedKey;

  const legacyKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (legacyKey && legacyKey !== "test-service-role-key") return legacyKey;
  if (envFilePresent) return null;

  const exampleKey = exampleEnvironment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return exampleKey || null;
}

export function loadEpic22SupabaseTestEnvironment() {
  const envPath = resolve(process.cwd(), ".env.test");
  const configPath = resolve(process.cwd(), "supabase/config.toml");
  const envFilePresent = existsSync(envPath);

  if (envFilePresent) {
    loadEnv({ path: envPath, override: true });
  }

  const environment = resolveEpic22SupabaseTestEnvironment({
    configToml: readFileSync(configPath, "utf8"),
    env: process.env,
    envFilePresent,
  });

  validateNonProductionSupabaseEnvironment({
    ...process.env,
    NODE_ENV: "test",
    NEXT_PUBLIC_SUPABASE_URL: environment.apiUrl,
    SUPABASE_DB_URL: environment.dbUrl,
  });

  return environment;
}

export function formatEpic22SupabaseSkipDiagnostic(
  environment: Epic22SupabaseTestEnvironment
) {
  const apiPort = new URL(environment.apiUrl).port;
  const databasePort = new URL(environment.dbUrl).port;
  const fixture = environment.usesExplicitGuardManagedFixture
    ? "explicit guard-managed fixture"
    : "configured local stack";
  const envState = environment.envFilePresent
    ? ".env.test is present"
    : ".env.test is absent; configured local defaults are in use";

  return (
    `[Epic 22] ${environment.projectId} ${fixture} is unreachable at ` +
    `API 127.0.0.1:${apiPort} / Postgres 127.0.0.1:${databasePort}; ` +
    `${envState}. Start the project-scoped stack before accepting database evidence.`
  );
}

export function assertEpic22EvidenceRequirement(
  available: boolean,
  required: boolean,
  flagName: string,
  diagnostic: string
) {
  if (required && !available) {
    throw new Error(
      `${diagnostic} ${flagName}=true requires this evidence test to run.`
    );
  }
}

export async function isEpic22DatabaseReachable(dbUrl: string) {
  const probe = new Client({ connectionString: dbUrl });
  try {
    await probe.connect();
    await probe.end();
    return true;
  } catch {
    await probe.end().catch(() => {});
    return false;
  }
}

export async function assertEpic22DatabaseFingerprint(
  database: Pick<Client, "query">
) {
  const result = await database.query<{ version: string }>(
    `SELECT version
     FROM supabase_migrations.schema_migrations
     WHERE version = $1`,
    [LATEST_EPIC_22_MIGRATION_VERSION]
  );

  if (result.rows[0]?.version !== LATEST_EPIC_22_MIGRATION_VERSION) {
    throw new Error(
      `Expected migration ${LATEST_EPIC_22_MIGRATION_VERSION} for the ` +
        `hr-masterdata stack. Run the local Story 22.15 reset first.`
    );
  }
}
