import { spawnSync } from 'node:child_process';
import { URL as NodeURL } from 'node:url';
import { isAbsolute } from 'node:path';

import {
  assessProductionStaffingPreExecuteProof,
} from './production-staffing-pre-execute-contract.mjs';
import { bindProductionCollectorSource } from './production-collector-source-binding.mjs';
import { productionTargetBindingSha256 } from './production-observed-profile.mjs';

const MODULE_RELATIVE = 'src/lib/release/collect-production-staffing-pre-execute.mjs';
const SQL_RELATIVE = 'src/lib/release/production-staffing-pre-execute.sql';
const SOURCE_RELATIVES = Object.freeze([
  MODULE_RELATIVE,
  SQL_RELATIVE,
  'src/lib/release/production-collector-source-binding.mjs',
  'src/lib/release/prepare-forward-subset.mjs',
  'src/lib/release/production-staffing-pre-execute-contract.mjs',
  'src/lib/release/production-observed-profile.mjs',
  'supabase/migration-baseline-manifest.json',
  'package.json',
  'pnpm-lock.yaml',
  'supabase/verify/run-reviewed-supabase-cli.mjs',
  'supabase/verify/verify-production-baseline-catalog.mjs',
  'supabase/verify/verify-target-binding.mjs',
]);
const MAX_BYTES = 65_536;
const fail = () => { throw new Error('Production staffing pre-execute observation refused; details suppressed'); };

const plainObject = (value, keys) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

/** Reject any SQL that could make a hosted change or omit transaction bounds. */
export function assertProductionStaffingPreExecuteSql(sql) {
  if (typeof sql !== 'string' || Buffer.byteLength(sql, 'utf8') > MAX_BYTES) fail();
  const uncommented = sql.replace(/--[^\r\n]*/gu, '').replace(/\/\*[\s\S]*?\*\//gu, '').replace(/'(?:''|[^'])*'/gu, "''");
  const leading = sql.replace(/^(?:[ \t]*--[^\r\n]*(?:\r?\n|$))+/u, '').trimStart();
  if (
    !/^BEGIN\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+REPEATABLE\s+READ\s+READ\s+ONLY\s*;/iu.test(leading) ||
    !/ROLLBACK\s*;\s*$/iu.test(sql) ||
    !/SET\s+LOCAL\s+statement_timeout\s*=\s*'20s'\s*;/iu.test(sql) ||
    !/SET\s+LOCAL\s+lock_timeout\s*=\s*'3s'\s*;/iu.test(sql) ||
    !/SET\s+LOCAL\s+idle_in_transaction_session_timeout\s*=\s*'30s'\s*;/iu.test(sql) ||
    /^\s*\\/mu.test(sql) ||
    /\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|copy|vacuum|analyze|refresh|lock|do|call)\b/iu.test(uncommented) ||
    /\b(?:pg_terminate_backend|pg_cancel_backend|set_config)\s*\(/iu.test(uncommented)
  ) fail();
  return true;
}

function parseProjection(output) {
  if (typeof output !== 'string' || Buffer.byteLength(output, 'utf8') > MAX_BYTES) fail();
  const lines = output.split(/\r?\n/u).filter(Boolean);
  if (lines.length !== 1 || Buffer.byteLength(lines[0], 'utf8') > MAX_BYTES) fail();
  let value;
  try { value = JSON.parse(lines[0]); } catch { fail(); }
  if (!plainObject(value, ['routine', 'dependencies', 'bodyProvenance'])) fail();
  return value;
}

/**
 * Collects only the catalog profile needed before the first staffing RPC
 * replacement. It is read-only and never admits a migration execution.
 */
export async function collectProductionStaffingPreExecute({
  workspace,
  source,
  sourceOptions,
  environment = process.env,
  now = () => new Date(),
} = {}) {
  if (typeof workspace !== 'string' || !isAbsolute(workspace) || environment !== process.env ||
    environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production' ||
    environment.SUPABASE_DB_CONNECTION_MODE !== 'session-pooler' || typeof now !== 'function') fail();
  try {
    const bound = bindProductionCollectorSource({
      workspace,
      source,
      sourceOptions,
      moduleUrl: import.meta.url,
      moduleRelative: MODULE_RELATIVE,
      sourceRelatives: SOURCE_RELATIVES,
      sqlRelatives: [SQL_RELATIVE],
    });
    const sql = bound.sql[SQL_RELATIVE];
    assertProductionStaffingPreExecuteSql(sql);
    const targetBindingSha256 = productionTargetBindingSha256(environment.EXPECTED_SUPABASE_PROJECT_REF);
    if (environment.EXPECTED_SUPABASE_TARGET_BINDING_SHA256 &&
      environment.EXPECTED_SUPABASE_TARGET_BINDING_SHA256 !== targetBindingSha256) fail();
    const [{ verifyApprovedSupabaseCliExecutable }, catalog, target] = await Promise.all([
      import('../../../supabase/verify/run-reviewed-supabase-cli.mjs'),
      import('../../../supabase/verify/verify-production-baseline-catalog.mjs'),
      import('../../../supabase/verify/verify-target-binding.mjs'),
    ]);
    verifyApprovedSupabaseCliExecutable();
    const executable = catalog.verifyApprovedPsqlExecutable();
    const certificate = catalog.verifyApprovedSslRootCertificate();
    await target.verifyConfiguredSupabaseTarget({ workspace: bound.workspace, environment });
    const url = new NodeURL(environment.SUPABASE_DB_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.port ||
      !url.username || !url.password || url.pathname !== '/postgres') fail();
    const childEnvironment = {};
    for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'PATH', 'Path', 'TEMP', 'TMP']) {
      if (typeof environment[key] === 'string') childEnvironment[key] = environment[key];
    }
    Object.assign(childEnvironment, {
      PGAPPNAME: 'hr-masterdata-production-staffing-pre-execute-observation',
      PGCONNECT_TIMEOUT: '10', PGDATABASE: 'postgres', PGHOST: url.hostname, PGPORT: url.port,
      PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: 'verify-full', PGSSLROOTCERT: certificate,
      PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=20000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000',
    });
    let result;
    let collectionStartedAtMs;
    try {
      bound.recheck();
      const collectionStartedAt = now();
      if (!(collectionStartedAt instanceof Date) || Number.isNaN(collectionStartedAt.getTime())) fail();
      collectionStartedAtMs = collectionStartedAt.getTime();
      result = spawnSync(executable, [
        '--no-psqlrc', '--quiet', '--tuples-only', '--no-align',
        '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=terse',
      ], {
        cwd: bound.workspace, env: childEnvironment, input: sql, windowsHide: true,
        encoding: 'utf8', timeout: 45_000, maxBuffer: MAX_BYTES,
      });
    } finally {
      for (const key of Object.keys(childEnvironment)) delete childEnvironment[key];
    }
    if (result?.error || result?.signal != null || result?.status !== 0 || typeof result?.stdout !== 'string') fail();
    const capturedAt = now();
    if (!(capturedAt instanceof Date) || Number.isNaN(capturedAt.getTime()) || capturedAt.getTime() < collectionStartedAtMs) fail();
    const observation = Object.freeze({
      schemaVersion: 1,
      kind: 'production-staffing-pre-execute-observation',
      environment: 'production',
      sourceSha: bound.source.sourceSha,
      sourceTree: bound.source.sourceTree,
      sourceManifestSha256: bound.source.sourceManifestSha256,
      targetBindingSha256,
      collectionStartedAtUtc: new Date(collectionStartedAtMs).toISOString(),
      capturedAtUtc: capturedAt.toISOString(),
      ...parseProjection(result.stdout),
    });
    const assessment = assessProductionStaffingPreExecuteProof(observation, {
      sourceSha: bound.source.sourceSha,
      sourceTree: bound.source.sourceTree,
      sourceManifestSha256: bound.source.sourceManifestSha256,
      targetBindingSha256,
      now: capturedAt,
    });
    return Object.freeze({
      observation,
      assessment,
      hostedWriteAttempted: false,
      rawDefinitionsPersisted: false,
    });
  } catch { fail(); }
}
