import { createHash, randomBytes } from 'node:crypto';
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  lstatSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { inspectForwardSource } from '../../src/lib/release/prepare-forward-subset.mjs';
import {
  parseExactProductionBootstrapDryRun,
  PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS,
} from '../../src/lib/release/production-bootstrap-admission.mjs';
import { PRODUCTION_HISTORY_REPAIR_VERSIONS } from '../../src/lib/release/production-history-repair-baseline.mjs';
import {
  runProductionBaselineCatalogVerifier,
  evaluateCatalogCsv,
} from '../../supabase/verify/verify-production-baseline-catalog.mjs';
import {
  assertGuardedPostgresSystemIdentifierHash,
  createGuardedFixtureDatabaseWithHash,
} from './guarded-postgres-fixture.mjs';
import {
  buildProductionCliMatrixFixture,
  PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL,
} from './production-cli-matrix-fixture.mjs';
import {
  CLI_MATRIX_CASES,
  classifyCliMatrixResult,
  verifyPendingMatrixDryRun,
} from './production-cli-matrix-result.mjs';
import {
  buildHistoryFaultSetup,
  HISTORY_FAULT_OBSERVER_SQL,
  interpretHistoryFaultObservation,
} from './production-cli-matrix-hook.mjs';
import { runTimeoutAfterObservedHistoryFault } from './production-cli-matrix-timeout.mjs';
import {
  MATRIX_CATALOG_SNAPSHOT_SQL,
  MATRIX_PRESERVATION_SQL,
  MATRIX_AGGREGATES_SQL,
  projectMatrixObservation,
} from './production-cli-matrix-observer.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const need = (condition, code) => {
  if (!condition) throw new Error(code);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const COMPLETE_HISTORY_VERSIONS = Object.freeze([
  ...new Set([
    ...PRODUCTION_HISTORY_REPAIR_VERSIONS,
    ...PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS,
  ]),
].sort());

/** The successful local rehearsal mirrors the protected runner's child
 * command. Its loopback DSN deliberately differs only in TLS mode: the
 * protected production child uses verify-full with a reviewed CA, while this
 * guarded fixture has no TLS endpoint. Connectivity remains in the PG env. */
export function buildProtectedMatrixCliInvocation({ databaseName, dryRun }) {
  need(
    typeof databaseName === 'string' && /^[a-z0-9_]+$/u.test(databaseName),
    'matrix_protected_database_name'
  );
  need(typeof dryRun === 'boolean', 'matrix_protected_dry_run');
  const dsn = `postgresql:///${databaseName}?sslmode=disable`;
  const args = [
    'db', 'push',
    ...(dryRun ? ['--dry-run'] : []),
    '--include-all', '--skip-vault', '--db-url', dsn,
  ];
  return Object.freeze({
    args: Object.freeze(args),
    dsn,
    spawn: Object.freeze({ stdio: 'pipe', encoding: 'utf8', input: '' }),
    receipt: Object.freeze({
      normalizedProtectedShape: true,
      hasDryRun: dryRun,
      includesAll: true,
      hasYes: false,
      neutralLocalDsn: true,
      tlsMode: 'disable_local_fixture_only',
      pgEnvironmentSuppliesConnectivity: true,
      stdio: 'pipe',
      encoding: 'utf8',
      stdin: 'closed_empty',
      hasSupabaseConfigToml: false,
      hasMigrationManifest: true,
    }),
  });
}

export function assertProtectedMatrixCliInvocation(invocation, { dryRun }) {
  const expected = buildProtectedMatrixCliInvocation({
    databaseName: 'cli_matrix_assertion',
    dryRun,
  });
  need(
    invocation &&
      Array.isArray(invocation.args) &&
      invocation.args.length === expected.args.length &&
      invocation.args.slice(0, -1).every((value, index) => value === expected.args[index]) &&
      /^postgresql:\/\/\/[a-z0-9_]+\?sslmode=disable$/u.test(invocation.args.at(-1) ?? '') &&
      invocation.spawn?.stdio === 'pipe' &&
      invocation.spawn?.encoding === 'utf8' &&
      invocation.spawn?.input === '' &&
      invocation.receipt?.normalizedProtectedShape === true &&
      invocation.receipt?.hasYes === false &&
      invocation.receipt?.neutralLocalDsn === true &&
      invocation.receipt?.stdin === 'closed_empty' &&
      invocation.receipt?.hasSupabaseConfigToml === false &&
      invocation.receipt?.hasMigrationManifest === true,
    'matrix_protected_command_shape'
  );
  return true;
}

export function buildPinnedMatrixToolEnvironment(environment = process.env) {
  const env = { SUPABASE_PROFILE: 'supabase' };
  for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT'])
    if (typeof environment[key] === 'string') env[key] = environment[key];
  return env;
}

function pinnedTool(tool, version) {
  need(
    tool &&
      path.isAbsolute(tool.executablePath) &&
      /^[a-f0-9]{64}$/u.test(tool.sha256),
    'matrix_tool_identity'
  );
  need(
    lstatSync(tool.executablePath).isFile() &&
      !lstatSync(tool.executablePath).isSymbolicLink() &&
      hash(readFileSync(tool.executablePath)) === tool.sha256,
    'matrix_tool_hash'
  );
  const env = buildPinnedMatrixToolEnvironment();
  const result = spawnSync(tool.executablePath, ['--version'], {
    env,
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    shell: false,
  });
  need(
    !result.error && result.status === 0 && result.stdout.trim() === version,
    'matrix_tool_version'
  );
}

export function assertInitialMatrixObservation(initial, expected) {
  for (const key of [
    'employees',
    'auditRows',
    'auditNonNullActors',
    'auditDistinctNonNullActors',
    'staffingLocations',
    'users',
    'importantDates',
    'staffingChangelog',
    'columnConfig',
    'savedFilters',
    'savedFilterOrphans',
    'savedFilterEmptyNames',
    'savedFilterOverlengthNames',
  ]) {
    need(initial.counts[key] === expected[key], 'matrix_fixture_aggregates');
  }
  need(
    initial.counts.unmappedActors === 0 && initial.history.length === 0,
    'matrix_fixture_initial_state'
  );
  for (const prefix of ['omc', 'pe3']) {
    for (const state of ['Null', 'True', 'False']) {
      need(
        initial.counts.repayment[prefix + state] ===
          expected['repayment' + state],
        'matrix_fixture_repayment'
      );
    }
  }
}

/** Test-only local runner. The trusted operator supplies a fresh guard-derived
 * binding, not a hosted URL. The server itself must match that binding on every
 * new connection. This API is not a production admission boundary. */
export async function runProductionCliMatrixCase({
  caseName,
  sourceOptions,
  destination,
  guardBinding,
  cli,
  psql,
}) {
  need(Object.hasOwn(CLI_MATRIX_CASES, caseName), 'matrix_case');
  const spec = CLI_MATRIX_CASES[caseName];
  need(
    guardBinding?.owned === true &&
      guardBinding.verified === true &&
      /^[a-f0-9]{64}$/u.test(guardBinding.expectedSystemIdentifierSha256) &&
      /^[a-f0-9]{64}$/u.test(guardBinding.composeSha256) &&
      typeof guardBinding.resourceId === 'string' &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(
        guardBinding.resourceId
      ) &&
      Number.isInteger(guardBinding.port) &&
      guardBinding.port >= 1024 &&
      guardBinding.port <= 65535 &&
      typeof guardBinding.password === 'string' &&
      /^[a-f0-9]{32,64}$/u.test(guardBinding.password) &&
      Number.isFinite(Date.parse(guardBinding.observedAtUtc)) &&
      Date.now() - Date.parse(guardBinding.observedAtUtc) >= 0 &&
      Date.now() - Date.parse(guardBinding.observedAtUtc) < 15 * 60 * 1000,
    'matrix_guard_binding'
  );
  const source = inspectForwardSource(sourceOptions);
  pinnedTool(cli, '2.115.0');
  pinnedTool(psql, 'psql (PostgreSQL) 17.11');
  need(path.isAbsolute(destination), 'matrix_destination');
  const databaseName = 'cli_matrix_' + randomBytes(12).toString('hex');
  const expectedSystemIdentifierSha256 =
    guardBinding.expectedSystemIdentifierSha256;
  const env = buildPinnedMatrixToolEnvironment();
  Object.assign(env, {
    PGHOST: '127.0.0.1',
    PGPORT: String(guardBinding.port),
    PGUSER: 'postgres',
    PGPASSWORD: guardBinding.password,
    SUPABASE_DB_PASSWORD: guardBinding.password,
    PGDATABASE: databaseName,
    PGAPPNAME: databaseName + '_cli',
    PGSSLMODE: 'disable',
    PGCONNECT_TIMEOUT: '5',
    PGOPTIONS: '-c statement_timeout=10000 -c lock_timeout=3000',
    CI: 'true',
    DO_NOT_TRACK: '1',
  });
  const url = `postgresql://postgres@127.0.0.1:${guardBinding.port}/${databaseName}?sslmode=disable`;
  async function connected(database, action, readOnly = false) {
    const client = new pg.Client({
      host: '127.0.0.1',
      port: guardBinding.port,
      user: 'postgres',
      password: guardBinding.password,
      database,
      ssl: false,
      connectionTimeoutMillis: 5000,
      statement_timeout: 15000,
      query_timeout: 20000,
      application_name: databaseName + '_observer',
    });
    try {
      await client.connect();
      await assertGuardedPostgresSystemIdentifierHash({
        adminClient: client,
        expectedSystemIdentifierSha256,
      });
      if (readOnly) await client.query('BEGIN READ ONLY');
      return await action(client);
    } catch {
      throw new Error('matrix_database_operation_failed');
    } finally {
      await client.end().catch(() => {});
    }
  }
  async function snapshot() {
    return connected(
      databaseName,
      async (client) => {
        const exists = (
          await client.query(
            "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS present"
          )
        ).rows[0].present;
        const history = exists
          ? (
              await client.query(
                'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version'
              )
            ).rows.map((r) => r.version)
          : [];
        const catalog = (await client.query(MATRIX_CATALOG_SNAPSHOT_SQL))
          .rows[0].state;
        const preservation = (await client.query(MATRIX_PRESERVATION_SQL))
          .rows[0].state;
        const aggregates = (await client.query(MATRIX_AGGREGATES_SQL)).rows[0]
          .counts;
        return projectMatrixObservation({
          catalog,
          preservation,
          aggregates,
          history,
        });
      },
      true
    );
  }
  const variant =
    caseName === 'observed_guard_stop'
      ? 'observed_orphans_48'
      : caseName === 'implicit_history_write_failure'
        ? 'implicit_column_absent'
        : 'postcleanup_zero_filters';
  const fixture = buildProductionCliMatrixFixture({ variant });
  const receipt = {
    schemaVersion: 1,
    kind: 'local-synthetic-cli-matrix-case',
    caseName,
    hostedAccess: false,
    productionAdmission: false,
    source: source.receipt,
    guard: {
      resourceId: guardBinding.resourceId,
      composeSha256: guardBinding.composeSha256,
      expectedSystemIdentifierSha256,
    },
    tools: {
      cliVersion: '2.115.0',
      cliSha256: cli.sha256,
      psqlVersion: '17.11',
      psqlSha256: psql.sha256,
    },
    fixture: fixture.representation,
    databaseName,
    retained: true,
    startedAtUtc: new Date().toISOString(),
    classification: 'uncertain_current_file',
    attempts: [],
  };
  let terminal = false;
  function materialize(label, count = 13) {
    const work = path.join(destination, label);
    mkdirSync(work);
    mkdirSync(path.join(work, 'supabase'));
    mkdirSync(path.join(work, 'supabase', 'migrations'));
    // The protected host supplies only the thirteen SQL files, manifest and
    // private link material. The success rehearsal intentionally omits a
    // config.toml so it proves that same minimal work shape.
    if (caseName !== 'postcleanup_success')
      writeFileSync(
        path.join(work, 'supabase', 'config.toml'),
        'project_id = "synthetic-cli-matrix"\n',
        { flag: 'wx' }
      );
    else
      writeFileSync(
        path.join(work, 'supabase', 'migration-baseline-manifest.json'),
        readFileSync(path.join(source.root, 'supabase', 'migration-baseline-manifest.json')),
        { flag: 'wx' }
      );
    if (caseName === 'postcleanup_success') {
      mkdirSync(path.join(work, 'supabase', '.temp'));
      writeFileSync(
        path.join(work, 'supabase', '.temp', 'project-ref'),
        'abcdefghijklmnopqrst',
        { flag: 'wx' }
      );
      receipt.successWorktree = {
        hasSupabaseConfigToml: false,
        hasMigrationManifest: true,
        hasSyntheticProjectLink: true,
        migrationCount: count,
      };
    }
    for (const entry of source.receipt.migrations.slice(0, count))
      writeFileSync(
        path.join(work, 'supabase', 'migrations', entry.file),
        source.contents.get(entry.version),
        { flag: 'wx' }
      );
    return work;
  }
  async function invoke(
    work,
    { dryRun = false, timeout = 60000, count = 13 } = {}
  ) {
    need(!terminal, 'matrix_terminal_no_continuation');
    need(
      same(inspectForwardSource(sourceOptions).receipt, source.receipt),
      'matrix_source_changed'
    );
    need(
      same(
        readdirSync(path.join(work, 'supabase', 'migrations')).sort(),
        source.receipt.migrations
          .slice(0, count)
          .map((m) => m.file)
          .sort()
      ),
      'matrix_subset_changed'
    );
    for (const m of source.receipt.migrations.slice(0, count))
      need(
        hash(
          readFileSync(path.join(work, 'supabase', 'migrations', m.file))
        ) === m.sha256,
        'matrix_subset_bytes'
      );
    await connected(databaseName, async () => {});
    pinnedTool(cli, '2.115.0');
    const protectedInvocation =
      caseName === 'postcleanup_success' && count === 13
        ? buildProtectedMatrixCliInvocation({ databaseName, dryRun })
        : null;
    const args = protectedInvocation?.args ?? [
      'db', 'push', '--db-url', url, '--skip-vault', '--yes',
      ...(dryRun ? ['--dry-run'] : []),
    ];
    if (protectedInvocation) {
      assertProtectedMatrixCliInvocation(protectedInvocation, { dryRun });
      receipt.protectedCommandShape ??= [];
      receipt.protectedCommandShape.push(protectedInvocation.receipt);
    }
    const started = Date.now();
    const result = spawnSync(cli.executablePath, args, {
      cwd: work,
      env,
      stdio: protectedInvocation?.spawn.stdio ?? 'pipe',
      input: protectedInvocation?.spawn.input,
      encoding: protectedInvocation?.spawn.encoding ?? 'utf8',
      windowsHide: true,
      shell: false,
      timeout,
      maxBuffer: 1024 * 1024,
    });
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const child = result.error
      ? {
          kind: result.error.code === 'ETIMEDOUT' ? 'timeout' : 'error',
          code: null,
        }
      : result.signal
        ? { kind: 'signal', code: null }
        : { kind: 'exit', code: result.status };
    receipt.attempts.push({
      purpose: dryRun
        ? 'dry_run'
        : count === 13
          ? 'measured_apply'
          : 'fixture_prefix_apply',
      child,
      durationMs: Date.now() - started,
      outputSha256: hash(output),
      outputBytes: Buffer.byteLength(output),
      sourceVersions: source.receipt.migrations
        .slice(0, count)
        .map((m) => m.version),
      lastApplyingVersion:
        [...output.matchAll(/Applying migration (\d{14})_[^\r\n]+/gu)].at(
          -1
        )?.[1] ?? null,
      sqlStates: [
        ...new Set(
          [...output.matchAll(/SQLSTATE ([A-Z0-9]{5})/gu)].map((m) => m[1])
        ),
      ],
    });
    if (!dryRun && (child.kind !== 'exit' || child.code !== 0)) terminal = true;
    return { child, output };
  }
  async function invokeAfterObservedTimeoutFault(work, { observeHook, targetVersion }) {
    need(!terminal, 'matrix_terminal_no_continuation');
    need(
      same(inspectForwardSource(sourceOptions).receipt, source.receipt),
      'matrix_source_changed'
    );
    need(
      same(
        readdirSync(path.join(work, 'supabase', 'migrations')).sort(),
        source.receipt.migrations.map((m) => m.file).sort()
      ),
      'matrix_subset_changed'
    );
    for (const m of source.receipt.migrations)
      need(
        hash(readFileSync(path.join(work, 'supabase', 'migrations', m.file))) === m.sha256,
        'matrix_subset_bytes'
      );
    await connected(databaseName, async () => {});
    pinnedTool(cli, '2.115.0');
    const timed = await runTimeoutAfterObservedHistoryFault({
      executable: cli.executablePath,
      args: ['db', 'push', '--db-url', url, '--skip-vault', '--yes'],
      options: {
        cwd: work,
        env,
        encoding: 'utf8',
        input: '',
      },
      targetVersion,
      observeHook,
    });
    receipt.timeoutFaultObservation = timed.observedHook;
    receipt.attempts.push({
      purpose: 'measured_apply',
      child: timed.child,
      durationMs: timed.durationMs,
      outputSha256: hash(timed.output),
      outputBytes: timed.outputBytes,
      sourceVersions: source.receipt.migrations.map((m) => m.version),
      lastApplyingVersion:
        [...timed.output.matchAll(/Applying migration (\d{14})_[^\r\n]+/gu)].at(-1)?.[1] ?? null,
      sqlStates: [
        ...new Set(
          [...timed.output.matchAll(/SQLSTATE ([A-Z0-9]{5})/gu)].map((m) => m[1])
        ),
      ],
      timeoutCancellation: timed.cancellation,
    });
    return { child: timed.child, output: timed.output };
  }
  function repairHistory(version) {
    pinnedTool(cli, '2.115.0');
    const started = Date.now();
    const result = spawnSync(cli.executablePath, [
      'migration', 'repair', '--db-url', url, '--status', 'applied', version,
    ], {
      cwd: source.root,
      env,
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const child = result.error
      ? { kind: result.error.code === 'ETIMEDOUT' ? 'timeout' : 'error', code: null }
      : result.signal
        ? { kind: 'signal', code: null }
        : { kind: 'exit', code: result.status };
    return {
      version,
      child,
      durationMs: Date.now() - started,
      outputSha256: hash(output),
      outputBytes: Buffer.byteLength(output),
    };
  }
  let stage = 'fixture_setup';
  let fixturePrepared = false;
  try {
    mkdirSync(destination);
    stage = 'fixture_create_database';
    await connected('postgres', (client) =>
      createGuardedFixtureDatabaseWithHash({
        adminClient: client,
        expectedSystemIdentifierSha256,
        databaseName,
      })
    );
    stage = 'fixture_bootstrap_schema';
    await connected(databaseName, async (client) => {
      await client.query(PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL);
    });
    stage = 'fixture_profile_data';
    await connected(databaseName, async (client) => {
      await client.query(fixture.sql);
    });
    fixturePrepared = true;
    let hookSetup;
    if (spec.mode === 'reject' || spec.mode === 'timeout') {
      hookSetup = buildHistoryFaultSetup({
        targetVersion: spec.target,
        mode: spec.mode,
      });
      await connected(databaseName, (client) => client.query(hookSetup.sql));
      receipt.hookSetupSha256 = hookSetup.sha256;
      receipt.historyTableManuallyCreated = true;
    }
    const work = materialize('measured');
    stage = 'initial_observer';
    const initial = await snapshot();
    assertInitialMatrixObservation(initial, fixture.representation.aggregates);
    stage = 'initial_dry_run';
    const dry = await invoke(work, { dryRun: true });
    need(
      dry.child.kind === 'exit' && dry.child.code === 0,
      'matrix_initial_dry_run'
    );
    parseExactProductionBootstrapDryRun(dry.output, source.receipt.migrations);
    need(same(initial, await snapshot()), 'matrix_dry_run_changed_state');
    if (spec.mode !== 'success') {
      stage = 'prefix_setup';
      const prefix = await invoke(materialize('prefix', spec.prefix), {
        count: spec.prefix,
      });
      need(
        prefix.child.kind === 'exit' && prefix.child.code === 0,
        'matrix_prefix_failed'
      );
      if (caseName.startsWith('trigger_')) {
        const sql =
          'ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog;';
        await connected(databaseName, (client) => client.query(sql));
        receipt.malformedProfileSha256 = hash(sql);
      }
    }
    stage = 'before_observer';
    const before = await snapshot();
    if (spec.mode !== 'success') {
      need(
        same(
          before.history,
          source.receipt.migrations.slice(0, spec.prefix).map((m) => m.version)
        ),
        'matrix_prefix_history'
      );
      stage = 'pending_dry_run';
      const pending = await invoke(work, { dryRun: true });
      need(
        pending.child.kind === 'exit' && pending.child.code === 0,
        'matrix_pending_dry_run'
      );
      receipt.pendingDryRun = verifyPendingMatrixDryRun(
        pending.output,
        source.receipt.migrations,
        before.history
      );
      need(
        same(before, await snapshot()),
        'matrix_pending_dry_run_changed_state'
      );
    }
    if (hookSetup)
      receipt.hookBefore = await connected(
        databaseName,
        async (client) =>
          interpretHistoryFaultObservation(
            hookSetup,
            (await client.query(HISTORY_FAULT_OBSERVER_SQL)).rows
          ),
        true
      );
    if (hookSetup)
      need(
        receipt.hookBefore.armed && receipt.hookBefore.firingCount === 0,
        'matrix_hook_not_armed'
      );
    stage = 'measured_apply';
    const applied = spec.mode === 'timeout'
      ? await invokeAfterObservedTimeoutFault(work, {
          targetVersion: hookSetup.targetVersion,
          observeHook: () => connected(
            databaseName,
            async (client) => interpretHistoryFaultObservation(
              hookSetup,
              (await client.query(HISTORY_FAULT_OBSERVER_SQL)).rows
            ),
            true
          ),
        })
      : await invoke(work, { timeout: 60000 });
    terminal = true;
    // The injected server sleep is bounded at eight seconds. Give it a fixed
    // bounded settling window, then observe rather than retrying the apply.
    if (spec.mode === 'timeout')
      await new Promise((resolve) => setTimeout(resolve, 10000));
    if (spec.mode === 'timeout') {
      receipt.serverSettled = await connected(
        databaseName,
        async (client) =>
          (
            await client.query(
              "SELECT NOT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state IS DISTINCT FROM 'idle') AS settled"
            )
          ).rows[0].settled,
        true
      );
      need(receipt.serverSettled === true, 'matrix_server_not_settled');
    }
    stage = 'after_observer';
    const after = await snapshot();
    receipt.before = before;
    receipt.after = after;
    if (hookSetup)
      receipt.hookAfter = await connected(
        databaseName,
        async (client) =>
          interpretHistoryFaultObservation(
            hookSetup,
            (await client.query(HISTORY_FAULT_OBSERVER_SQL)).rows
          ),
        true
      );
    let strictCatalogPassed = false;
    if (
      spec.mode === 'success' &&
      applied.child.kind === 'exit' &&
      applied.child.code === 0
    ) {
      stage = 'strict_catalog';
      await connected(databaseName, async () => {});
      await runProductionBaselineCatalogVerifier({
        phase: 'post_apply',
        workspace: source.root,
        environment: { SUPABASE_DB_URL: url },
        targetVerifier: () => connected(databaseName, async () => {}),
        psqlVerifier: () => {
          pinnedTool(psql, 'psql (PostgreSQL) 17.11');
          return psql.executablePath;
        },
        rootCertificateVerifier: () => '',
        spawn: (exe, args) => {
          const result = spawnSync(exe, args, {
            cwd: source.root,
            env,
            encoding: 'utf8',
            windowsHide: true,
            timeout: 30000,
            maxBuffer: 1024 * 1024,
          });
          if (!result.error && result.status === 0)
            receipt.catalog = evaluateCatalogCsv(result.stdout);
          return result;
        },
      });
      strictCatalogPassed = true;
    }
    if (
      caseName === 'postcleanup_success' &&
      applied.child.kind === 'exit' &&
      applied.child.code === 0 &&
      strictCatalogPassed
    ) {
      stage = 'measured_history_repair';
      const repairAttempts = PRODUCTION_HISTORY_REPAIR_VERSIONS.map(repairHistory);
      need(
        repairAttempts.every((attempt) => attempt.child.kind === 'exit' && attempt.child.code === 0),
        'matrix_history_repair_failed'
      );
      const afterRepair = await snapshot();
      need(same(afterRepair.history, COMPLETE_HISTORY_VERSIONS), 'matrix_history_repair_not_exact_68');
      need(after.catalogSha256 === afterRepair.catalogSha256, 'matrix_history_repair_changed_catalog');
      need(after.preservationSha256 === afterRepair.preservationSha256, 'matrix_history_repair_changed_preservation');
      receipt.historyRepair = {
        kind: 'local-pinned-cli-history-repair',
        versions: [...PRODUCTION_HISTORY_REPAIR_VERSIONS],
        attempts: repairAttempts,
        afterHistory: afterRepair.history,
        catalogUnchanged: true,
        preservationUnchanged: true,
      };
    }
    const physicalKey =
      spec.mode === 'reject' || spec.mode === 'timeout'
        ? caseName === 'implicit_history_write_failure'
          ? 'checklistSha256'
          : 'headcountSha256'
        : caseName === 'observed_guard_stop'
          ? 'savedFilterSha256'
          : 'catalogSha256';
    const currentPostcondition =
      physicalKey === 'headcountSha256'
        ? after.headcountPostcondition
        : physicalKey === 'checklistSha256'
          ? after.checklistPostcondition
          : strictCatalogPassed;
    const knownGuardError =
      caseName === 'observed_guard_stop'
        ? /user_filters requires approved data cleanup before reconciliation/u
        : /Unexpected represented trigger function attributes/u;
    const lastApplying = [
      ...applied.output.matchAll(/Applying migration (\d{14})_[^\r\n]+/gu),
    ].at(-1)?.[1];
    const facts = {
      child: applied.child,
      observerComplete: true,
      history: after.history,
      sourceMatched: same(
        inspectForwardSource(sourceOptions).receipt,
        source.receipt
      ),
      guardIdentityMatched: true,
      dryRunUnchanged: true,
      dryRunOrderMatched: true,
      beforeCurrentSha256: before[physicalKey],
      afterCurrentSha256: after[physicalKey],
      preservationMatched:
        before.preservationSha256 === after.preservationSha256,
      catalogMatched: before.catalogSha256 === after.catalogSha256,
      currentPostcondition,
      strictCatalogPassed,
      guardErrorMatched: knownGuardError.test(applied.output),
      guardErrorVersion: lastApplying,
      beforeAlreadySatisfiedPostcondition:
        physicalKey === 'headcountSha256'
          ? before.headcountPostcondition
          : before.checklistPostcondition,
      onlyExpectedCurrentChange:
        physicalKey === 'headcountSha256'
          ? before.nonCurrentHeadcountSha256 ===
              after.nonCurrentHeadcountSha256 &&
            typeof before.nonCurrentHeadcountSha256 === 'string'
          : physicalKey === 'checklistSha256' &&
            before.nonCurrentChecklistSha256 ===
              after.nonCurrentChecklistSha256 &&
            typeof before.nonCurrentChecklistSha256 === 'string',
      hook: hookSetup
        ? {
            ...receipt.hookAfter,
            unexpectedFiringCount: 0,
            errorMatched: applied.output.includes('CLI_MATRIX_HISTORY_REJECT'),
          }
        : undefined,
    };
    // Narrow physical postconditions are necessary but do not assert unrelated
    // catalog preservation; the observer must prove that separately.
    receipt.before = before;
    receipt.after = after;
    Object.assign(receipt, classifyCliMatrixResult(caseName, facts));
  } catch (error) {
    receipt.failureStage = stage;
    receipt.failure = /^matrix_[a-z_]+$/u.test(error?.message ?? '')
      ? error.message
      : ['fixture_create_database', 'fixture_bootstrap_schema', 'fixture_profile_data'].includes(stage)
        ? `matrix_${stage}_failed`
        : 'matrix_incomplete_proof';
    if (fixturePrepared && !receipt.after) {
      try {
        receipt.failureObservation = await snapshot();
      } catch {
        receipt.failureObservationUnavailable = true;
      }
    }
  }
  receipt.finishedAtUtc = new Date().toISOString();
  return receipt;
}
