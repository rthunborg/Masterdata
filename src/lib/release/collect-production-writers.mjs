import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { resolve, isAbsolute } from 'node:path';
import {
  assertDatabaseWriterClassificationSql,
  parseDatabaseWriterClassification,
} from './production-database-writer-classification.mjs';

const SQL_FILE = fileURLToPath(new NodeURL('./production-database-writer-classification.sql', import.meta.url));
const MAX_BYTES = 65536;
const fail = () => { throw new Error('Production writer observation refused; details suppressed'); };

/** A read-only collector, never an isolation or write-admission decision. */
export async function collectProductionWriters({ workspace, environment = process.env } = {}) {
  if (typeof workspace !== 'string' || !isAbsolute(workspace)
    || environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production') fail();
  try {
    const [{ verifyApprovedSupabaseCliExecutable }, catalog, target] = await Promise.all([
      import('../../../supabase/verify/run-reviewed-supabase-cli.mjs'),
      import('../../../supabase/verify/verify-production-baseline-catalog.mjs'),
      import('../../../supabase/verify/verify-target-binding.mjs'),
    ]);
    // These functions check the approved records in the host's process
    // environment. Reject a different caller environment rather than claiming
    // that checking one environment verified another.
    if (environment !== process.env) fail();
    verifyApprovedSupabaseCliExecutable();
    const executable = catalog.verifyApprovedPsqlExecutable();
    const certificate = catalog.verifyApprovedSslRootCertificate();
    await target.verifyConfiguredSupabaseTarget({ workspace: resolve(workspace), environment });
    const sql = readFileSync(SQL_FILE, 'utf8');
    assertDatabaseWriterClassificationSql(sql);
    const url = new NodeURL(environment.SUPABASE_DB_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname
      || !url.port || !url.username || !url.password || url.pathname !== '/postgres') fail();
    const childEnvironment = {};
    for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'PATH', 'Path', 'TEMP', 'TMP']) {
      if (typeof environment[key] === 'string') childEnvironment[key] = environment[key];
    }
    Object.assign(childEnvironment, {
      PGAPPNAME: 'hr-masterdata-production-writer-observation',
      PGCONNECT_TIMEOUT: '10', PGDATABASE: 'postgres', PGHOST: url.hostname,
      PGPORT: url.port, PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: 'verify-full', PGSSLROOTCERT: certificate,
      PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=20000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000',
    });
    const observedAtUtc = new Date().toISOString();
    let result;
    try {
      result = spawnSync(executable, [
        '--no-psqlrc', '--quiet', '--tuples-only', '--no-align',
        '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=terse',
      ], {
        cwd: resolve(workspace), env: childEnvironment, input: sql,
        windowsHide: true, encoding: 'utf8', timeout: 45000, maxBuffer: MAX_BYTES,
      });
    } finally {
      // Do not retain a second password-bearing environment after child exit.
      for (const key of Object.keys(childEnvironment)) delete childEnvironment[key];
    }
    if (result?.error || result?.signal != null || result?.status !== 0 || typeof result?.stdout !== 'string') fail();
    return Object.freeze({
      kind: 'production-writer-observation', observedAtUtc,
      inventory: parseDatabaseWriterClassification(result.stdout),
      isolationProved: false,
    });
  } catch { fail(); }
}
