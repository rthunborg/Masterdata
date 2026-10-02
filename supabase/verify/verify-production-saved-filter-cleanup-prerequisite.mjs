import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import Papa from 'papaparse';

import { verifyConfiguredSupabaseTarget } from './verify-target-binding.mjs';
import {
  assertNoPsqlMetaCommands,
  verifyApprovedPsqlExecutable,
  verifyApprovedSslRootCertificate,
} from './verify-production-baseline-catalog.mjs';

const EXPECTED_FIELDS = Object.freeze([
  'total',
  'orphan_auth_references',
  'empty_names',
  'overlength_names',
]);
export const SAVED_FILTER_CLEANUP_PREREQUISITE_SQL_SHA256 =
  '5ee745284aa6b6a275637d95bfc4525c786bdd73c1290644f670aa59696b790c';
const COLLECTOR_TIMEOUT_MS = 45_000;
const LOCAL_TEST_ADAPTER_ENVIRONMENT = 'local-test';
const SAFE_PROCESS_ENVIRONMENT_KEYS = Object.freeze([
  'COMSPEC',
  'LANG',
  'LC_ALL',
  'PATH',
  'Path',
  'PATHEXT',
  'SYSTEMROOT',
  'SystemRoot',
  'TEMP',
  'TMP',
  'TZ',
  'WINDIR',
]);

function createSafeProcessEnvironment(environment) {
  const childEnvironment = {};
  for (const key of SAFE_PROCESS_ENVIRONMENT_KEYS) {
    if (typeof environment[key] === 'string') {
      childEnvironment[key] = environment[key];
    }
  }
  return childEnvironment;
}

function createPsqlEnvironment(environment, databaseUrl, sslRootCertificatePath) {
  return {
    ...createSafeProcessEnvironment(environment),
    PGAPPNAME: 'hr-masterdata-saved-filter-cleanup-prerequisite',
    PGCONNECT_TIMEOUT: '10',
    PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
    PGHOST: databaseUrl.hostname,
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGPORT: databaseUrl.port,
    PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: sslRootCertificatePath,
    PGUSER: decodeURIComponent(databaseUrl.username),
  };
}

function assertCollectorEnvironment(environment, executionMode) {
  if (executionMode === 'production') {
    if (environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production') {
      throw new Error('Saved-filter cleanup prerequisite requires the production environment');
    }
    return 'production';
  }

  if (
    executionMode === 'local-test-adapter' &&
    environment.EXPECTED_SUPABASE_ENVIRONMENT === LOCAL_TEST_ADAPTER_ENVIRONMENT
  ) {
    return LOCAL_TEST_ADAPTER_ENVIRONMENT;
  }

  throw new Error('Saved-filter cleanup prerequisite requires an explicit supported environment');
}

function parseNonNegativeSafeInteger(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error('Saved-filter cleanup prerequisite returned an unreadable result');
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('Saved-filter cleanup prerequisite returned an unreadable result');
  }
  return parsed;
}

/**
 * Parse a one-row, count-only psql result. This result is evidence of the
 * migration's row predicate at capture time; it cannot authorize cleanup or
 * a migration apply.
 */
export function evaluateProductionSavedFilterCleanupCsv(csv) {
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (
    parsed.errors.length > 0 ||
    parsed.data.length !== 1 ||
    JSON.stringify(parsed.meta.fields) !== JSON.stringify(EXPECTED_FIELDS)
  ) {
    throw new Error('Saved-filter cleanup prerequisite returned an unreadable result');
  }

  const row = parsed.data[0];
  if (!row || typeof row !== 'object' || Object.keys(row).length !== EXPECTED_FIELDS.length) {
    throw new Error('Saved-filter cleanup prerequisite returned an unreadable result');
  }

  const total = parseNonNegativeSafeInteger(row.total);
  const orphanAuthReferences = parseNonNegativeSafeInteger(row.orphan_auth_references);
  const emptyNames = parseNonNegativeSafeInteger(row.empty_names);
  const overlengthNames = parseNonNegativeSafeInteger(row.overlength_names);
  if (
    orphanAuthReferences > total ||
    emptyNames > total ||
    overlengthNames > total ||
    emptyNames + overlengthNames > total
  ) {
    throw new Error('Saved-filter cleanup prerequisite returned an unreadable result');
  }

  return Object.freeze({
    total,
    orphanAuthReferences,
    emptyNames,
    overlengthNames,
    meetsMigrationDataPrerequisites:
      orphanAuthReferences === 0 && emptyNames === 0 && overlengthNames === 0,
  });
}

function createEvidence({ counts, environment, now }) {
  const capturedAt = now();
  if (!(capturedAt instanceof Date) || Number.isNaN(capturedAt.valueOf())) {
    throw new Error('Saved-filter cleanup prerequisite capture time is unavailable');
  }
  return Object.freeze({
    schemaVersion: 1,
    kind: 'production-saved-filter-cleanup-prerequisite',
    environment,
    capturedAt: capturedAt.toISOString(),
    sqlSha256: SAVED_FILTER_CLEANUP_PREREQUISITE_SQL_SHA256,
    ...counts,
    evidenceOnly: true,
    authorizesCleanup: false,
    authorizesMigrationApply: false,
  });
}

/**
 * Executes the count-only prerequisite query using the reviewed target, psql,
 * and TLS controls. Its return value is intentionally evidence-only: callers
 * must not treat it as cleanup approval, traffic isolation, or apply authority.
 */
export async function runProductionSavedFilterCleanupPrerequisite({
  workspace = process.cwd(),
  environment = process.env,
  executionMode = 'production',
  spawn = spawnSync,
  targetVerifier = verifyConfiguredSupabaseTarget,
  psqlVerifier = verifyApprovedPsqlExecutable,
  rootCertificateVerifier = verifyApprovedSslRootCertificate,
  readSql = readFileSync,
  now = () => new Date(),
} = {}) {
  const collectorEnvironment = assertCollectorEnvironment(
    environment,
    executionMode
  );
  const verifierPath = path.join(
    workspace,
    'supabase',
    'verify',
    'production-saved-filter-cleanup-prerequisite.sql'
  );
  let sql;
  try {
    sql = readSql(verifierPath, 'utf8');
  } catch {
    throw new Error('Saved-filter cleanup prerequisite source is unavailable');
  }
  if (typeof sql !== 'string') {
    throw new Error('Saved-filter cleanup prerequisite source is unavailable');
  }
  assertNoPsqlMetaCommands(sql);
  if (
    createHash('sha256').update(sql).digest('hex') !==
    SAVED_FILTER_CLEANUP_PREREQUISITE_SQL_SHA256
  ) {
    throw new Error('Saved-filter cleanup prerequisite source does not match the reviewed SHA-256');
  }

  await targetVerifier({ workspace, environment });
  const psqlExecutable = psqlVerifier({ environment });
  const sslRootCertificatePath = rootCertificateVerifier({ environment });
  const databaseUrl = new URL(environment.SUPABASE_DB_URL);
  const result = spawn(
    psqlExecutable,
    [
      '--no-psqlrc',
      '--quiet',
      '--csv',
      '--set',
      'ON_ERROR_STOP=1',
      '--file',
      '-',
    ],
    {
      cwd: workspace,
      encoding: 'utf8',
      input: sql,
      env: createPsqlEnvironment(
        environment,
        databaseUrl,
        sslRootCertificatePath
      ),
      maxBuffer: 1024 * 1024,
      timeout: COLLECTOR_TIMEOUT_MS,
      windowsHide: true,
    }
  );

  if (result.error || result.status !== 0) {
    throw new Error('Saved-filter cleanup prerequisite query failed before a complete result was returned');
  }
  return createEvidence({
    counts: evaluateProductionSavedFilterCleanupCsv(result.stdout),
    environment: collectorEnvironment,
    now,
  });
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  if (process.argv.length !== 2) {
    process.stderr.write('Saved-filter cleanup prerequisite failed.\n');
    process.exitCode = 1;
  } else {
  runProductionSavedFilterCleanupPrerequisite().then(
    (evaluation) => {
      process.stdout.write(`${JSON.stringify(evaluation)}\n`);
      if (!evaluation.meetsMigrationDataPrerequisites) {
        process.exitCode = 1;
      }
    },
    () => {
      // The runner may have been invoked with private target material. Keep
      // direct CLI output stable and redacted even if a dependency includes it.
      process.stderr.write('Saved-filter cleanup prerequisite failed.\n');
      process.exitCode = 1;
    }
  );
  }
}
