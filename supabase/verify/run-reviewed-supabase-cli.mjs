import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { verifyApprovedSslRootCertificate } from './verify-production-baseline-catalog.mjs';
import { verifyConfiguredSupabaseTarget } from './verify-target-binding.mjs';

export const REVIEWED_SUPABASE_CLI_VERSION = '2.115.0';
export const REVIEWED_TARGET_FLAG = '--reviewed-target';
export const REVIEWED_ENVIRONMENT_FLAG = '--reviewed-environment';

const REVIEWED_DATABASE_URL = 'postgresql:///postgres?sslmode=verify-full';
const DATABASE_COMMAND_GROUPS = new Set(['db', 'migration']);
const REVIEWED_DATABASE_COMMANDS = new Set([
  'db:advisors',
  'db:push',
  'migration:list',
  'migration:repair',
]);
const MIGRATION_VERSION_PATTERN = /^\d{14}$/u;
const REVIEWED_ENVIRONMENTS = new Set(['staging', 'production']);
const PRODUCTION_REVIEWED_EXECUTE_VERSIONS = Object.freeze([
  '20260314000001',
  '20260314000002',
  '20260614000000',
  '20260615000000',
  '20260709194903',
  '20260710144000',
  '20260710150000',
  '20260831200026',
  '20260909115242',
  '20260910094517',
  '20260910115024',
  '20260910184840',
  '20260910184841',
]);
const PRODUCTION_PROTECTED_APPLY_REQUIRED_MESSAGE =
  'Production --include-all apply requires the installed protected cutover runner and fresh reviewed prerequisites under full production traffic isolation';

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_VERSION_ENVIRONMENT_KEYS = [
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
];

function createSafeVersionEnvironment(environment) {
  const childEnvironment = {};
  for (const key of SAFE_VERSION_ENVIRONMENT_KEYS) {
    if (typeof environment[key] === 'string') {
      childEnvironment[key] = environment[key];
    }
  }
  return childEnvironment;
}

function isNativeTargetSelector(argument) {
  return (
    argument === '--db-url' ||
    argument.startsWith('--db-url=') ||
    argument === '--linked' ||
    argument.startsWith('--linked=') ||
    argument === '--local' ||
    argument.startsWith('--local=') ||
    argument === '--proxy' ||
    argument.startsWith('--proxy=') ||
    argument === '--password' ||
    argument.startsWith('--password=') ||
    argument === '-p' ||
    /^-p.+/u.test(argument)
  );
}

function argumentsEqual(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((argument, index) => argument === expected[index])
  );
}

function isApprovedDatabaseHelpCommand(args) {
  return (
    argumentsEqual(args, ['db', 'push', '--help']) ||
    argumentsEqual(args, ['db', 'push', '-h'])
  );
}

function isApprovedReviewedDatabaseArguments(
  args,
  approvedRepairVersions,
  approvedStagingPush,
  approvedIncludeAllEnvironment
) {
  if (
    argumentsEqual(args, ['migration', 'list', REVIEWED_TARGET_FLAG]) ||
    (approvedStagingPush &&
      (argumentsEqual(args, [
        'db',
        'push',
        REVIEWED_TARGET_FLAG,
        '--skip-vault',
      ]) ||
        argumentsEqual(args, [
          'db',
          'push',
          REVIEWED_TARGET_FLAG,
          '--dry-run',
          '--skip-vault',
        ])))
  ) {
    return true;
  }

  if (
    approvedIncludeAllEnvironment &&
    (argumentsEqual(args, [
      'db',
      'push',
      REVIEWED_TARGET_FLAG,
      REVIEWED_ENVIRONMENT_FLAG,
      approvedIncludeAllEnvironment,
      '--include-all',
      '--skip-vault',
    ]) ||
      argumentsEqual(args, [
        'db',
        'push',
        REVIEWED_TARGET_FLAG,
        REVIEWED_ENVIRONMENT_FLAG,
        approvedIncludeAllEnvironment,
        '--dry-run',
        '--include-all',
        '--skip-vault',
      ]))
  ) {
    return true;
  }

  if (
    args.length === 8 &&
    args[0] === 'migration' &&
    args[1] === 'repair' &&
    args[2] === '--status' &&
    args[3] === 'applied' &&
    MIGRATION_VERSION_PATTERN.test(args[4]) &&
    args[5] === REVIEWED_TARGET_FLAG &&
    args[6] === REVIEWED_ENVIRONMENT_FLAG &&
    REVIEWED_ENVIRONMENTS.has(args[7]) &&
    approvedRepairVersions?.has(args[4])
  ) {
    return true;
  }

  return (
    args.length === 5 &&
    args[0] === 'db' &&
    args[1] === 'advisors' &&
    args[2] === REVIEWED_TARGET_FLAG &&
    args[3] === '--type' &&
    (args[4] === 'security' || args[4] === 'performance')
  );
}

function resolveManifestMigrationPlan(manifest, reviewedEnvironment) {
  const environmentPlan = manifest?.environmentPlans?.[reviewedEnvironment];
  let repairVersions = environmentPlan?.['repair-after-catalog-proof'];
  let executeVersions = environmentPlan?.execute;

  if (typeof repairVersions === 'string') {
    repairVersions = repairVersions
      .split('.')
      .reduce((value, key) => value?.[key], manifest);
  }
  if (typeof executeVersions === 'string') {
    executeVersions = executeVersions
      .split('.')
      .reduce((value, key) => value?.[key], manifest);
  }

  if (
    !Array.isArray(repairVersions) ||
    repairVersions.some(
      (version) =>
        typeof version !== 'string' || !MIGRATION_VERSION_PATTERN.test(version)
    ) ||
    new Set(repairVersions).size !== repairVersions.length ||
    !Array.isArray(executeVersions) ||
    executeVersions.some(
      (version) =>
        typeof version !== 'string' ||
        !MIGRATION_VERSION_PATTERN.test(version) ||
        repairVersions.includes(version)
    ) ||
    new Set(executeVersions).size !== executeVersions.length
  ) {
    throw new Error(
      'Reviewed migration baseline manifest is unavailable or invalid'
    );
  }

  return {
    repairVersions: new Set(repairVersions),
    executeVersions: new Set(executeVersions),
    orderedExecuteVersions: executeVersions,
  };
}

function resolveManifestRepairVersions(manifest, reviewedEnvironment) {
  return resolveManifestMigrationPlan(manifest, reviewedEnvironment)
    .repairVersions;
}

function resolveManifestProductionIncludeAll(manifest) {
  const plan = resolveManifestMigrationPlan(manifest, 'production');
  if (
    !argumentsEqual(plan.orderedExecuteVersions, PRODUCTION_REVIEWED_EXECUTE_VERSIONS) ||
    PRODUCTION_REVIEWED_EXECUTE_VERSIONS.some(
      (version) =>
        !plan.executeVersions.has(version) || plan.repairVersions.has(version)
    )
  ) {
    throw new Error(
      'Reviewed migration baseline manifest is unavailable or invalid'
    );
  }
  return true;
}

function loadApprovedRepairVersions({
  args,
  workspace,
  environment,
  readManifest = readFileSync,
}) {
  const reviewedEnvironment = args[7];
  if (
    !REVIEWED_ENVIRONMENTS.has(reviewedEnvironment) ||
    environment.EXPECTED_SUPABASE_ENVIRONMENT !== reviewedEnvironment
  ) {
    return undefined;
  }

  try {
    const manifestPath = path.join(
      workspace,
      'supabase',
      'migration-baseline-manifest.json'
    );
    const manifest = JSON.parse(readManifest(manifestPath, 'utf8'));
    return resolveManifestRepairVersions(manifest, reviewedEnvironment);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'Reviewed migration baseline manifest is unavailable or invalid'
    ) {
      throw error;
    }
    throw new Error(
      'Reviewed migration baseline manifest is unavailable or invalid'
    );
  }
}

function loadApprovedIncludeAllEnvironment({
  args,
  workspace,
  environment,
  readManifest = readFileSync,
}) {
  if (
    !REVIEWED_ENVIRONMENTS.has(args[4]) ||
    environment.EXPECTED_SUPABASE_ENVIRONMENT !== args[4]
  ) {
    return false;
  }

  try {
    const manifestPath = path.join(
      workspace,
      'supabase',
      'migration-baseline-manifest.json'
    );
    const manifest = JSON.parse(readManifest(manifestPath, 'utf8'));
    if (args[4] === 'production') {
      resolveManifestProductionIncludeAll(manifest);
      return 'production';
    }
    const plan = resolveManifestMigrationPlan(manifest, 'staging');
    if (plan.repairVersions.size !== 0 || plan.executeVersions.size !== 1 ||
        !plan.executeVersions.has('20260910184840') ||
        !manifest.orderedPrerequisites?.some((entry) =>
          entry.version === '20260910184840' && entry.beforeVersion === '20260910184841')) {
      throw new Error('Reviewed migration baseline manifest is unavailable or invalid');
    }
    return 'staging';
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'Reviewed migration baseline manifest is unavailable or invalid'
    ) {
      throw error;
    }
    throw new Error(
      'Reviewed migration baseline manifest is unavailable or invalid'
    );
  }
}

function getDatabaseCommandKey(args) {
  return args.length >= 2 ? `${args[0]}:${args[1]}` : '';
}

function createReviewedDatabaseEnvironment(
  environment,
  databaseUrl,
  sslRootCertificatePath
) {
  return {
    ...createSafeVersionEnvironment(environment),
    PGAPPNAME: 'hr-masterdata-reviewed-supabase-cli',
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

function prepareReviewedDatabaseArguments(args) {
  const reviewedTargetCount = args.filter(
    (argument) => argument === REVIEWED_TARGET_FLAG
  ).length;
  if (reviewedTargetCount !== 1) {
    throw new Error(
      'Remote database commands require exactly one reviewed target marker'
    );
  }
  if (args.some(isNativeTargetSelector)) {
    throw new Error(
      'Native Supabase CLI database target selectors are not permitted'
    );
  }

  const reviewedEnvironmentIndex = args.indexOf(REVIEWED_ENVIRONMENT_FLAG);
  const childArguments = args.filter(
    (argument, index) =>
      argument !== REVIEWED_TARGET_FLAG &&
      (reviewedEnvironmentIndex < 0 ||
        (index !== reviewedEnvironmentIndex &&
          index !== reviewedEnvironmentIndex + 1))
  );

  return [...childArguments, '--db-url', REVIEWED_DATABASE_URL];
}

export function verifyApprovedSupabaseCliExecutable({
  environment = process.env,
  readExecutable = readFileSync,
  resolveExecutable = realpathSync,
  spawn = spawnSync,
} = {}) {
  const configuredPath = environment.SUPABASE_CLI_EXECUTABLE;
  if (typeof configuredPath !== 'string' || !path.isAbsolute(configuredPath)) {
    throw new Error('Supabase CLI must use an approved absolute path');
  }

  const expectedSha256 =
    environment.EXPECTED_SUPABASE_CLI_SHA256?.trim().toLowerCase() ?? '';
  if (!SHA256_PATTERN.test(expectedSha256)) {
    throw new Error('Supabase CLI approved SHA-256 is unavailable or invalid');
  }

  let resolvedPath;
  let executable;
  try {
    resolvedPath = resolveExecutable(configuredPath);
    executable = readExecutable(resolvedPath);
  } catch {
    throw new Error('Supabase CLI approved executable is unavailable');
  }

  const actualSha256 = createHash('sha256').update(executable).digest('hex');
  if (actualSha256 !== expectedSha256) {
    throw new Error('Supabase CLI does not match the approved SHA-256');
  }

  const versionResult = spawn(resolvedPath, ['--version'], {
    encoding: 'utf8',
    env: createSafeVersionEnvironment(environment),
    windowsHide: true,
  });
  if (
    versionResult.error ||
    versionResult.status !== 0 ||
    versionResult.stdout?.trim() !== REVIEWED_SUPABASE_CLI_VERSION
  ) {
    throw new Error('Supabase CLI does not match the reviewed version');
  }

  return resolvedPath;
}

async function runReviewedSupabaseCliInternal({
  args = process.argv.slice(2),
  workspace = process.cwd(),
  environment = process.env,
  spawn = spawnSync,
  executableVerifier = verifyApprovedSupabaseCliExecutable,
  targetVerifier = verifyConfiguredSupabaseTarget,
  rootCertificateVerifier = verifyApprovedSslRootCertificate,
  readManifest = readFileSync,
  // This value is private to the capability factory below. The public runner
  // always supplies false and no caller option can override that boundary.
  protectedCutoverCapability = false,
  captureProtectedResult = false,
} = {}) {
  if (
    !Array.isArray(args) ||
    args.length === 0 ||
    args.some(
      (argument) => typeof argument !== 'string' || argument.includes('\0')
    )
  ) {
    throw new Error('A valid Supabase CLI command is required');
  }

  const isStandaloneVersionCommand = argumentsEqual(args, ['--version']);
  if (args[0].startsWith('-') && !isStandaloneVersionCommand) {
    throw new Error(
      'Supabase CLI root options before the command are not permitted'
    );
  }

  const databaseCommandKey = getDatabaseCommandKey(args);
  const isDatabaseCommand = DATABASE_COMMAND_GROUPS.has(args[0]);
  const isReviewedDatabaseCommand =
    REVIEWED_DATABASE_COMMANDS.has(databaseCommandKey);
  const hasReviewedTargetFlag = args.includes(REVIEWED_TARGET_FLAG);
  const hasReviewedEnvironmentFlag = args.includes(REVIEWED_ENVIRONMENT_FLAG);
  const hasHelpFlag = args.includes('--help') || args.includes('-h');
  const helpCommand = isApprovedDatabaseHelpCommand(args);
  if (hasReviewedTargetFlag && (!isReviewedDatabaseCommand || hasHelpFlag)) {
    throw new Error('Reviewed target marker is not valid for this command');
  }
  if (
    hasReviewedEnvironmentFlag &&
    databaseCommandKey !== 'migration:repair' &&
    databaseCommandKey !== 'db:push'
  ) {
    throw new Error(
      'Reviewed environment marker is not valid for this command'
    );
  }
  if (isDatabaseCommand && args.some(isNativeTargetSelector)) {
    throw new Error(
      'Native Supabase CLI database target selectors are not permitted'
    );
  }
  if (isDatabaseCommand && hasHelpFlag && !helpCommand) {
    throw new Error('This Supabase CLI help command is not approved');
  }
  if (isDatabaseCommand && !helpCommand && !isReviewedDatabaseCommand) {
    throw new Error('This Supabase CLI database command is not approved');
  }

  let childArguments = args;
  let childEnvironment = environment;
  let executable;
  if (isReviewedDatabaseCommand && !helpCommand) {
    childArguments = prepareReviewedDatabaseArguments(args);
    const approvedRepairVersions =
      databaseCommandKey === 'migration:repair'
        ? loadApprovedRepairVersions({
            args,
            workspace,
            environment,
            readManifest,
          })
        : undefined;
    const approvedIncludeAllEnvironment =
      databaseCommandKey === 'db:push' && args.includes('--include-all')
        ? loadApprovedIncludeAllEnvironment({
            args,
            workspace,
            environment,
            readManifest,
          })
        : false;
    const approvedStagingPush =
      databaseCommandKey === 'db:push' &&
      !args.includes('--include-all') &&
      environment.EXPECTED_SUPABASE_ENVIRONMENT === 'staging';
    if (
      !isApprovedReviewedDatabaseArguments(
        args,
        approvedRepairVersions,
        approvedStagingPush,
        approvedIncludeAllEnvironment
      )
    ) {
      throw new Error(
        'Supabase CLI database arguments do not match an approved command shape'
      );
    }
    if (
      databaseCommandKey === 'db:push' &&
      approvedIncludeAllEnvironment === 'production' &&
      !args.includes('--dry-run') &&
      protectedCutoverCapability !== true
    ) {
      throw new Error(PRODUCTION_PROTECTED_APPLY_REQUIRED_MESSAGE);
    }
    executable = executableVerifier({ environment });
    await targetVerifier({ workspace, environment });
    const sslRootCertificatePath = rootCertificateVerifier({ environment });
    const databaseUrl = new URL(environment.SUPABASE_DB_URL);
    childEnvironment = createReviewedDatabaseEnvironment(
      environment,
      databaseUrl,
      sslRootCertificatePath
    );
  }

  executable ??= executableVerifier({ environment });

  const result = spawn(executable, childArguments, {
    cwd: workspace,
    env: childEnvironment,
    stdio: protectedCutoverCapability === true || captureProtectedResult === true ? 'pipe' : 'inherit',
    windowsHide: true,
    ...(protectedCutoverCapability === true || captureProtectedResult === true
      ? { encoding: 'utf8', timeout: 90_000, maxBuffer: 1024 * 1024 }
      : {}),
  });

  if (result.error) {
    throw new Error('Reviewed Supabase CLI command could not be started');
  }
  if (typeof result.status !== 'number') {
    throw new Error(
      'Reviewed Supabase CLI command did not return an exit status'
    );
  }

  return captureProtectedResult === true ? result : result.status;
}

/** Public entry point: production non-dry-run apply remains blocked. */
export async function runReviewedSupabaseCli(options = {}) {
  return runReviewedSupabaseCliInternal({
    ...options,
    protectedCutoverCapability: false,
    captureProtectedResult: false,
  });
}

/**
 * Internal package seam for a closed, signed protected-cutover worker. This
 * is intentionally a factory rather than an option on the public runner, so
 * command-line callers and user-fed JSON cannot set an apply boolean. The
 * worker still has to validate its host-origin packet before invoking it.
 */
export function createProtectedProductionCutoverExecutor({ packet, nonce, workspace } = {}) {
  let root;
  if (
    typeof packet !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(nonce ?? '') ||
    typeof workspace !== 'string' ||
    !path.isAbsolute(workspace)
  ) {
    throw new Error('Protected production cutover capability is unavailable');
  }
  let envelope;
  let request;
  try {
    root = fileURLToPath(new URL('../../', import.meta.url));
    envelope = JSON.parse(packet);
    if (
      !envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
      JSON.stringify(Object.keys(envelope).sort()) !== JSON.stringify(['payload', 'signature']) ||
      typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string'
    ) throw new Error();
    const payload = Buffer.from(envelope.payload, 'base64');
    const publicKey = createPublicKey({
      key: JSON.parse(readFileSync(path.join(root, 'bootstrap-origin.json'), 'utf8')),
      format: 'jwk',
    });
    if (!verify('RSA-SHA256', payload, publicKey, Buffer.from(envelope.signature, 'base64'))) throw new Error();
    request = JSON.parse(payload.toString('utf8'));
  } catch {
    throw new Error('Protected production cutover capability is unavailable');
  }
  if (
    !request || typeof request !== 'object' || Array.isArray(request) ||
    request.schemaVersion !== 1 || request.operation !== 'apply-forward-13' ||
    request.nonce !== nonce || request.workspace !== workspace ||
    request.environment?.EXPECTED_SUPABASE_ENVIRONMENT !== 'production'
  ) {
    throw new Error('Protected production cutover capability is unavailable');
  }
  const fixedRequest = Object.freeze(request);
  let invoked = false;
  return async (...options) => {
    if (options.length !== 0 || invoked) throw new Error('Protected production cutover capability is unavailable');
    invoked = true;
    const packageRecord = JSON.parse(readFileSync(path.join(root, 'toolchain-package.json'), 'utf8'));
    if (
      packageRecord.sourceCommit !== fixedRequest.sourceSha ||
      packageRecord.sourceTree !== fixedRequest.sourceTree ||
      packageRecord.sourceManifestSha256 !== fixedRequest.sourceManifestSha256 ||
      fixedRequest.isolationContext?.sourceSha !== fixedRequest.sourceSha ||
      fixedRequest.isolationContext?.targetBindingSha256 !== fixedRequest.targetBindingSha256 ||
      fixedRequest.isolationContext?.sourceTree !== fixedRequest.sourceTree ||
      fixedRequest.isolationContext?.sourceManifestSha256 !== fixedRequest.sourceManifestSha256
    ) throw new Error('Protected production cutover capability is unavailable');
    const [staffingModule, isolationModule, observedModule, bootstrapModule] = await Promise.all([
      import('../../src/lib/release/production-staffing-pre-execute-contract.mjs'),
      import('../../src/lib/release/production-isolation-gate.mjs'),
      import('../../src/lib/release/production-observed-profile.mjs'),
      import('../../src/lib/release/production-bootstrap-admission.mjs'),
    ]);
    const verifyPrerequisites = () => {
    const keys = ['schemaVersion', 'operation', 'nonce', 'workspace', 'environment',
      'sourceSha', 'sourceTree', 'sourceManifestSha256', 'targetBindingSha256',
      'staffingReceipt', 'isolationReceipts', 'isolationContext', 'preForwardObservation', 'reviewRecords'];
    if (observedModule.productionTargetBindingSha256(fixedRequest.environment.EXPECTED_SUPABASE_PROJECT_REF) !== fixedRequest.targetBindingSha256 ||
      JSON.stringify(Object.keys(fixedRequest).sort()) !== JSON.stringify(keys.sort()) ||
      fixedRequest.preForwardObservation?.profilePhase !== 'post_cleanup' ||
      JSON.stringify(Object.keys(fixedRequest.reviewRecords ?? {}).sort()) !==
        JSON.stringify(['backupRecordSha256', 'cleanupCompletedAtUtc', 'cleanupRecordSha256']) ||
      !/^[a-f0-9]{64}$/u.test(fixedRequest.reviewRecords?.backupRecordSha256 ?? '') ||
      !/^[a-f0-9]{64}$/u.test(fixedRequest.reviewRecords?.cleanupRecordSha256 ?? '') ||
      typeof fixedRequest.reviewRecords?.cleanupCompletedAtUtc !== 'string' ||
      packageRecord.kind !== 'offline-protected-production-cutover-package' || packageRecord.schemaVersion !== 1 ||
      !Array.isArray(packageRecord.plan) ||
      JSON.stringify(packageRecord.plan.map(entry => entry.version)) !== JSON.stringify(bootstrapModule.PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS)) {
      throw new Error('Protected production cutover capability is unavailable');
    }
    const staffing = staffingModule.assessProductionStaffingPreExecuteProof(
      fixedRequest.staffingReceipt,
      {
        sourceSha: fixedRequest.sourceSha,
        sourceTree: fixedRequest.sourceTree,
        sourceManifestSha256: fixedRequest.sourceManifestSha256,
        targetBindingSha256: fixedRequest.targetBindingSha256,
      }
    );
    const isolation = isolationModule.assessProductionMaintenanceIsolation(
      fixedRequest.isolationReceipts,
      { expectedContext: fixedRequest.isolationContext }
    );
    const observed = observedModule.assessProductionObservedProfile({
      observation: fixedRequest.preForwardObservation,
      expectedContext: {sourceSha: fixedRequest.sourceSha, targetBindingSha256: fixedRequest.targetBindingSha256},
    });
    if (
      staffing.disposition !== 'staffing_pre_execute_proved_not_execution_authority' ||
      isolation.disposition !== 'isolation_proved_not_execution_authority' ||
      observed.disposition !== 'profile_match_not_admission'
    ) throw new Error('Protected production cutover capability is unavailable');
    const ordering = isolationModule.assessProductionCutoverReceiptOrdering({
      reviewRecords: fixedRequest.reviewRecords,
      preForwardObservation: fixedRequest.preForwardObservation,
      staffingReceipt: fixedRequest.staffingReceipt,
      isolationReceipts: fixedRequest.isolationReceipts,
    });
    if (ordering.disposition !== 'cutover_receipt_order_proved_not_execution_authority') {
      throw new Error('Protected production cutover capability is unavailable');
    }
    };
    verifyPrerequisites();
    const args = ['db', 'push', '--reviewed-target', '--reviewed-environment', 'production', '--include-all', '--skip-vault'];
    const dryArgs = ['db', 'push', '--reviewed-target', '--reviewed-environment', 'production', '--dry-run', '--include-all', '--skip-vault'];
    const dryRun = await runReviewedSupabaseCliInternal({
      args: dryArgs, workspace,
      environment: fixedRequest.environment, captureProtectedResult: true,
    });
    if (dryRun.status !== 0 || typeof dryRun.stdout !== 'string' || typeof dryRun.stderr !== 'string') {
      throw new Error('Protected production cutover dry run refused');
    }
    bootstrapModule.parseExactProductionBootstrapDryRun(
      dryRun.stdout + dryRun.stderr, packageRecord.plan
    );
    verifyPrerequisites();
    // Only the signed, installed worker reaches this fixed apply shape. The
    // public entry point cannot request this capability or supply child options.
    // A nonzero/uncertain result is never retried and never authorizes repair.
    return runReviewedSupabaseCliInternal({
      args, workspace, environment: fixedRequest.environment,
      protectedCutoverCapability: true,
    });
  };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runReviewedSupabaseCli().then(
    (status) => {
      process.exitCode = status;
    },
    (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Reviewed Supabase CLI command failed';
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  );
}
