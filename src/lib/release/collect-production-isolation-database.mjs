import { spawnSync } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { bindProductionCollectorSource } from './production-collector-source-binding.mjs';
import { productionTargetBindingSha256 } from './production-observed-profile.mjs';
import { parseProductionStatementTriggerInventory, parseProductionDatabaseDrainSummary } from './production-isolation-probes.mjs';
import { verifyApprovedPsqlExecutable, verifyApprovedSslRootCertificate } from '../../../supabase/verify/verify-production-baseline-catalog.mjs';
import { verifyConfiguredSupabaseTarget } from '../../../supabase/verify/verify-target-binding.mjs';

const MODULE = 'src/lib/release/collect-production-isolation-database.mjs';
const TRIGGERS = 'src/lib/release/production-isolation-statement-trigger-inventory.sql';
const DRAIN = 'src/lib/release/production-isolation-database-drain.sql';
const SOURCE = Object.freeze([
  MODULE, TRIGGERS, DRAIN, 'src/lib/release/production-isolation-probes.mjs',
  'src/lib/release/production-platform-config.mjs', 'src/lib/release/production-managed-writer-profiles.mjs',
  'src/lib/release/production-collector-source-binding.mjs', 'src/lib/release/prepare-forward-subset.mjs',
  'src/lib/release/production-observed-profile.mjs', 'supabase/migration-baseline-manifest.json',
  'package.json', 'pnpm-lock.yaml', 'supabase/verify/run-reviewed-supabase-cli.mjs',
  'supabase/verify/verify-production-baseline-catalog.mjs', 'supabase/verify/verify-target-binding.mjs',
]);
const fail = () => { throw new Error('Production isolation database collection refused'); };
const exact = (value, keys) => value !== null && !Array.isArray(value) && typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length &&
  Object.getOwnPropertySymbols(value).length === 0 && keys.every(key =>
    Object.getOwnPropertyDescriptor(value, key)?.enumerable === true &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'));
const timestamp = () => new Date().toISOString();

/** The SQL selector is private; public entry points each name one fixed Git-bound query. */
async function collect({ workspace, binding, sourceOptions, environment = process.env } = {}, relative, parse) {
  if (typeof workspace !== 'string' || !isAbsolute(workspace) || environment !== process.env ||
    environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production' ||
    environment.SUPABASE_DB_CONNECTION_MODE !== 'session-pooler' ||
    !exact(binding, ['sourceSha', 'sourceTree', 'sourceManifestSha256', 'targetBindingSha256'])) fail();
  try {
    const bound = bindProductionCollectorSource({
      workspace, source: { sourceSha: binding.sourceSha, sourceTree: binding.sourceTree,
        sourceManifestSha256: binding.sourceManifestSha256 }, sourceOptions,
      moduleUrl: import.meta.url, moduleRelative: MODULE, sourceRelatives: SOURCE,
      sqlRelatives: [TRIGGERS, DRAIN],
    });
    if (binding.targetBindingSha256 !== productionTargetBindingSha256(environment.EXPECTED_SUPABASE_PROJECT_REF)) fail();
    const executable = verifyApprovedPsqlExecutable({
      spawn: (file, args, options) => spawnSync(file, args, { ...options, timeout: 10_000, maxBuffer: 65_536 }),
    });
    const certificate = verifyApprovedSslRootCertificate();
    await verifyConfiguredSupabaseTarget({ workspace: bound.workspace, environment });
    const url = new URL(environment.SUPABASE_DB_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.port ||
      !url.username || !url.password || url.pathname !== '/postgres') fail();
    const child = {};
    for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'PATH', 'Path', 'TEMP', 'TMP']) {
      if (typeof environment[key] === 'string') child[key] = environment[key];
    }
    Object.assign(child, { PGAPPNAME: 'hr-masterdata-production-isolation-aggregate',
      PGCONNECT_TIMEOUT: '10', PGDATABASE: 'postgres', PGHOST: url.hostname, PGPORT: url.port,
      PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: 'verify-full', PGSSLROOTCERT: certificate,
      PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=20000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000' });
    let result; let collectionStartedAtUtc;
    try {
      bound.recheck();
      collectionStartedAtUtc = timestamp();
      result = spawnSync(executable,
        ['--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=terse'],
        { cwd: bound.workspace, env: child, input: bound.sql[relative], windowsHide: true,
          encoding: 'utf8', timeout: 30_000, maxBuffer: 65_536 });
    } finally { for (const key of Object.keys(child)) delete child[key]; }
    if (result?.status !== 0 || result?.signal !== null || result?.error || typeof result.stdout !== 'string') fail();
    const summary = parse(result.stdout);
    return Object.freeze({ collectionStartedAtUtc, capturedAtUtc: timestamp(), summary });
  } catch { fail(); }
}

export function collectProductionIsolationStatementTriggers(options) {
  return collect(options, TRIGGERS, parseProductionStatementTriggerInventory);
}
export function collectProductionIsolationDatabaseDrain(options) {
  return collect(options, DRAIN, parseProductionDatabaseDrainSummary);
}