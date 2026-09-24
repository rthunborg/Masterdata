import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

import {
  observeProductionBaselineCatalog,
  verifyApprovedPsqlExecutable,
  verifyApprovedSslRootCertificate,
} from '../../../supabase/verify/verify-production-baseline-catalog.mjs';
import { verifyConfiguredSupabaseTarget } from '../../../supabase/verify/verify-target-binding.mjs';
import {
  catalogPrerequisites,
  parseOneRedactedJsonLine,
} from './production-profile-redaction.mjs';
import {
  assessProductionObservedProfile,
  PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA,
} from './production-observed-profile.mjs';

const SCHEMA_SQL_PATH = fileURLToPath(
  new NodeURL('./production-observed-schema.sql', import.meta.url)
);
const AGGREGATE_SQL_PATH = fileURLToPath(
  new NodeURL('./production-observed-aggregate.sql', import.meta.url)
);
const MARKER = '-- This second result';
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_SESSION_OUTPUT_BYTES = 65_536;
const TIMEOUT_MS = 45_000;
const HASH40 = /^[a-f0-9]{40}$/u;
const HASH64 = /^[a-f0-9]{64}$/u;
const SAFE_ENVIRONMENT_KEYS = Object.freeze([
  'COMSPEC', 'LANG', 'LC_ALL', 'PATH', 'Path', 'PATHEXT', 'SYSTEMROOT',
  'SystemRoot', 'TEMP', 'TMP', 'TZ', 'WINDIR',
]);
const SCHEMA_GROUP_KEYS = Object.freeze([
  'schema_version', 'scope', 'public_schema_acl',
  'unsupported_function_kind_count', 'tables', 'columns', 'constraints',
  'indexes', 'policies', 'functions', 'triggers', 'types', 'sequences',
  'auth_users_schema',
]);

const fail = () => {
  throw new Error('Production observed-profile collection refused; details suppressed');
};
const hash = (value) => createHash('sha256').update(value).digest('hex');

const isPlainData = (value) => {
  if (value === null || typeof value !== 'object') return true;
  if (Array.isArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Object.getPrototypeOf(value) === Array.prototype &&
      Object.getOwnPropertySymbols(value).length === 0 &&
      Object.getOwnPropertyNames(value).length === value.length + 1 &&
      Array.from({ length: value.length }, (_, index) => {
        const descriptor = descriptors[String(index)];
        return descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value') && isPlainData(descriptor.value);
      }).every(Boolean);
  }
  return Object.getPrototypeOf(value) === Object.prototype &&
    Object.getOwnPropertySymbols(value).length === 0 &&
    Object.values(Object.getOwnPropertyDescriptors(value)).every(
      (descriptor) => descriptor.enumerable && Object.hasOwn(descriptor, 'value') && isPlainData(descriptor.value)
    );
};

const exactKeys = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()) &&
  Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => descriptor.enumerable && Object.hasOwn(descriptor, 'value')
  );

function assertReadOnlySql(sql, { markerRequired }) {
  if (typeof sql !== 'string' || Buffer.byteLength(sql, 'utf8') > MAX_OUTPUT_BYTES) fail();
  const withoutComments = sql
    .replace(/--[^\r\n]*/gu, '')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/'(?:''|[^'])*'/gu, "''");
  const leading = sql.replace(/^(?:\s*--[^\r\n]*(?:\r?\n|$))*/u, '').trimStart();
  if (
    !leading.startsWith('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;') ||
    !sql.trimEnd().endsWith('ROLLBACK;') ||
    /^\s*\\/mu.test(sql) ||
    /\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|copy|vacuum|analyze|refresh|lock|do|call)\b/iu.test(withoutComments) ||
    /\b(?:pg_terminate_backend|pg_cancel_backend|set_config)\s*\(/iu.test(withoutComments) ||
    ((sql.match(new RegExp(MARKER, 'g')) ?? []).length !== (markerRequired ? 1 : 0))
  ) fail();
}

export function assertObservedProfileSchemaSql(sql) {
  assertReadOnlySql(sql, { markerRequired: false });
  return true;
}

export function splitObservedProfileAggregateSql(sql) {
  assertReadOnlySql(sql, { markerRequired: true });
  const markerAt = sql.indexOf(MARKER);
  const firstSql = sql.slice(0, markerAt);
  const secondSql = sql.slice(markerAt);
  if (
    !/BEGIN\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+REPEATABLE\s+READ\s+READ\s+ONLY\s*;/iu.test(firstSql) ||
    !/ROLLBACK\s*;\s*$/iu.test(secondSql)
  ) fail();
  return Object.freeze({ firstSql, secondSql });
}

function parseOneJsonLine(output) {
  if (typeof output !== 'string' || Buffer.byteLength(output, 'utf8') > MAX_OUTPUT_BYTES) fail();
  const lines = output.split(/\r?\n/u).filter((line) => line.length > 0);
  if (lines.length !== 1) fail();
  try {
    const value = JSON.parse(lines[0]);
    if (!isPlainData(value)) fail();
    return value;
  } catch {
    fail();
  }
}

/** Redacts an in-memory schema capture into the fourteen fixed fingerprints. */
export function redactObservedProfileSchema(output) {
  const capture = parseOneJsonLine(output);
  if (
    !exactKeys(capture, SCHEMA_GROUP_KEYS) ||
    capture.schema_version !== 1 ||
    capture.scope !== 'schema_only' ||
    capture.unsupported_function_kind_count !== 0 ||
    !(capture.public_schema_acl === null || Array.isArray(capture.public_schema_acl)) ||
    !SCHEMA_GROUP_KEYS.slice(4).every((key) => Array.isArray(capture[key]))
  ) fail();

  return Object.freeze(Object.fromEntries(SCHEMA_GROUP_KEYS.map((key) => [
    key,
    Object.freeze({
      sha256: hash(JSON.stringify(capture[key])),
      count: Array.isArray(capture[key]) ? capture[key].length : null,
    }),
  ])));
}

function assertSource(source, schemaSql, aggregateSql) {
  if (
    !exactKeys(source, ['sourceSha', 'schemaSqlSha256', 'aggregateSqlSha256']) ||
    !HASH40.test(source.sourceSha) ||
    !HASH64.test(source.schemaSqlSha256) ||
    !HASH64.test(source.aggregateSqlSha256) ||
    hash(schemaSql) !== source.schemaSqlSha256 ||
    hash(aggregateSql) !== source.aggregateSqlSha256
  ) fail();
  return Object.freeze({ ...source });
}

function createPsqlEnvironment(environment, databaseUrl, certificate) {
  const childEnvironment = {};
  for (const key of SAFE_ENVIRONMENT_KEYS) {
    if (typeof environment[key] === 'string') childEnvironment[key] = environment[key];
  }
  Object.assign(childEnvironment, {
    PGAPPNAME: 'hr-masterdata-production-observed-profile',
    PGCONNECT_TIMEOUT: '10',
    PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
    PGHOST: databaseUrl.hostname,
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGPORT: databaseUrl.port,
    PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: certificate,
    PGUSER: decodeURIComponent(databaseUrl.username),
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=20000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000',
  });
  return childEnvironment;
}

function buildInvocation({ executable, environment, certificate }) {
  let url;
  try {
    url = new URL(environment.SUPABASE_DB_URL);
  } catch {
    fail();
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
    !url.port || !url.username || !url.password || url.pathname !== '/postgres'
  ) fail();
  return Object.freeze({
    executable,
    args: Object.freeze([
      '--no-psqlrc', '--quiet', '--tuples-only', '--no-align',
      '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=terse',
    ]),
    environment: createPsqlEnvironment(environment, url, certificate),
  });
}

export function openBoundedObservedProfileSession(invocation, { spawnProcess = spawn } = {}) {
  const child = spawnProcess(invocation.executable, invocation.args, {
    shell: false, windowsHide: true, env: invocation.environment,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let pending = null;
  let buffered = '';
  let ended = false;
  let unexpectedOutput = false;
  let closeResolve;
  const closed = new Promise((resolveClose) => { closeResolve = resolveClose; });
  const rejectPending = (code) => {
    if (!pending) return;
    const { reject, timer } = pending;
    pending = null;
    clearTimeout(timer);
    reject(new Error(code));
  };
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    if (!pending) {
      if (chunk.trim()) {
        unexpectedOutput = true;
        try { child.kill(); } catch {}
      }
      return;
    }
    pending.bytes += Buffer.byteLength(chunk);
    if (pending.bytes > pending.maxOutputBytes) {
      rejectPending('output_too_large');
      try { child.kill(); } catch {}
      return;
    }
    buffered += chunk;
    const newline = buffered.indexOf('\n');
    if (newline < 0) return;
    const line = buffered.slice(0, newline).replace(/\r$/u, '');
    buffered = buffered.slice(newline + 1);
    if (!line) return;
    const { resolve, timer } = pending;
    pending = null;
    clearTimeout(timer);
    resolve(line);
    if (buffered.trim()) {
      unexpectedOutput = true;
      try { child.kill(); } catch {}
    }
  });
  child.stderr.on('data', () => {});
  child.stdin.on('error', () => rejectPending('query_failed'));
  child.on('error', () => rejectPending('query_failed'));
  child.on('close', (code) => {
    rejectPending('query_failed');
    closeResolve(code === 0 && !unexpectedOutput && buffered.trim().length === 0);
  });
  return Object.freeze({
    write({ sql, deadlineMs }) {
      return new Promise((resolve, reject) => {
        if (ended || pending || typeof sql !== 'string' || !Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) {
          reject(new Error('session_write_invalid'));
          return;
        }
        const timer = setTimeout(() => {
          rejectPending('query_timeout');
          try { child.kill(); } catch {}
        }, deadlineMs);
        pending = { resolve, reject, timer, bytes: 0, maxOutputBytes: MAX_SESSION_OUTPUT_BYTES };
        try { child.stdin.write(`${sql}\n`); } catch { rejectPending('query_failed'); }
      });
    },
    rollback() { if (!ended) { try { child.stdin.write('ROLLBACK;\n'); } catch {} } },
    abort() { try { child.kill(); } catch {} },
    async end() {
      if (!ended) {
        ended = true;
        try { child.stdin.end(); } catch {}
      }
      return closed;
    },
  });
}

async function boundedWrite(session, sql, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('timeout');
  let timer;
  try {
    return await Promise.race([
      session.write({ sql, deadlineMs: remaining }),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          Promise.resolve(session.abort?.()).catch(() => {});
          reject(new Error('timeout'));
        }, remaining);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function boundedEnd(session, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return false;
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(session.end()).then((value) => value === true).catch(() => false),
      new Promise((resolve) => { timer = setTimeout(() => resolve(false), remaining); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runTwoPhaseObservedProfileAggregate({ session, firstSql, secondSql, timeoutMs = TIMEOUT_MS } = {}) {
  if (!session || typeof session.write !== 'function' || typeof session.end !== 'function' ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > TIMEOUT_MS) fail();
  const deadline = Date.now() + timeoutMs;
  let primaryFailure = false;
  let aggregateIssued = false;
  try {
    const catalog = parseOneRedactedJsonLine(await boundedWrite(session, firstSql, deadline), 'catalog');
    const prerequisites = catalogPrerequisites(catalog);
    if (!prerequisites.satisfied) {
      if (typeof session.rollback !== 'function') fail();
      await Promise.resolve(session.rollback());
      return Object.freeze({ catalog, aggregate: null, aggregateIssued: false, historyBranch: 'blocked' });
    }
    aggregateIssued = true;
    const aggregate = parseOneRedactedJsonLine(await boundedWrite(session, secondSql, deadline), 'aggregate');
    if ((prerequisites.branch === 'absent') !== (aggregate.history.table_exists === false)) fail();
    return Object.freeze({ catalog, aggregate, aggregateIssued, historyBranch: prerequisites.branch });
  } catch {
    primaryFailure = true;
    Promise.resolve(session.abort?.()).catch(() => {});
    fail();
  } finally {
    const cleanExit = await boundedEnd(session, deadline);
    if (!primaryFailure && cleanExit !== true) fail();
  }
}

/**
 * Collects only fresh, redacted production-profile evidence. Its return value
 * remains a non-admitting profile assessment; it has no repair, cleanup, or
 * migration-apply authority.
 */
export async function collectProductionObservedProfile({
  workspace = process.cwd(),
  source,
  profilePhase = 'pre_cleanup',
  environment = process.env,
  now = () => new Date(),
  spawnProcess = spawn,
  spawnSyncProcess = spawnSync,
  targetVerifier = verifyConfiguredSupabaseTarget,
  psqlVerifier = verifyApprovedPsqlExecutable,
  rootCertificateVerifier = verifyApprovedSslRootCertificate,
  catalogObserver = observeProductionBaselineCatalog,
  readSql = readFileSync,
} = {}) {
  if (
    environment !== process.env ||
    environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production' ||
    environment.SUPABASE_DB_CONNECTION_MODE !== 'session-pooler' ||
    !['pre_cleanup', 'post_cleanup'].includes(profilePhase) ||
    typeof workspace !== 'string'
  ) fail();
  let schemaSql;
  let aggregateSql;
  try {
    schemaSql = readSql(SCHEMA_SQL_PATH, 'utf8');
    aggregateSql = readSql(AGGREGATE_SQL_PATH, 'utf8');
    assertObservedProfileSchemaSql(schemaSql);
    const aggregateSqlParts = splitObservedProfileAggregateSql(aggregateSql);
    const sourceFacts = assertSource(source, schemaSql, aggregateSql);
    await targetVerifier({ workspace, environment });
    const executable = psqlVerifier({ environment });
    const certificate = rootCertificateVerifier({ environment });
    const invocation = buildInvocation({ executable, environment, certificate });

    let schemaResult = spawnSyncProcess(executable, invocation.args, {
      cwd: workspace, env: invocation.environment, input: schemaSql,
      encoding: 'utf8', windowsHide: true, timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
    });
    if (schemaResult?.error || schemaResult?.signal || schemaResult?.status !== 0 || typeof schemaResult?.stdout !== 'string') fail();
    const schemaGroups = redactObservedProfileSchema(schemaResult.stdout);
    schemaResult = null;

    const session = openBoundedObservedProfileSession(invocation, { spawnProcess });
    const aggregateResult = await runTwoPhaseObservedProfileAggregate({
      session,
      firstSql: aggregateSqlParts.firstSql,
      secondSql: aggregateSqlParts.secondSql,
    });
    if (!aggregateResult.aggregateIssued || aggregateResult.aggregate === null) fail();
    const strict = await catalogObserver({
      phase: 'production_pre_apply', workspace, environment,
    });
    if (
      !strict || !Number.isSafeInteger(strict.count) || !Array.isArray(strict.failedChecks) ||
      !strict.failedChecks.every((value) => typeof value === 'string')
    ) fail();
    const capturedAt = now();
    if (!(capturedAt instanceof Date) || Number.isNaN(capturedAt.getTime())) fail();
    const targetBindingSha256 = environment.EXPECTED_SUPABASE_TARGET_BINDING_SHA256;
    if (!HASH64.test(targetBindingSha256 ?? '')) fail();
    const observation = Object.freeze({
      schemaVersion: 1,
      kind: 'production-observed-profile',
      profilePhase,
      capturedAtUtc: capturedAt.toISOString(),
      sourceSha: sourceFacts.sourceSha,
      baselineSourceSha: PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA,
      targetBindingSha256,
      schemaGroups,
      aggregate: aggregateResult.aggregate,
      strictCatalog: Object.freeze({ checkCount: strict.count, failedChecks: strict.failedChecks }),
    });
    const assessment = assessProductionObservedProfile({
      observation,
      expectedContext: { sourceSha: sourceFacts.sourceSha, targetBindingSha256 },
      now: capturedAt,
    });
    return Object.freeze({
      kind: 'production-observed-profile-collection',
      collectionSucceeded: true,
      hostedWriteAttempted: false,
      rawDefinitionsPersisted: false,
      aggregateIssued: true,
      observation,
      assessment,
    });
  } catch {
    fail();
  }
}
