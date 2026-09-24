import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
const PRODUCTION_STAFFING_PRE_EXECUTE_PROOF_BLOCK_MESSAGE =
  'Production --include-all apply is blocked until the reviewed staffing pre-execute function proof is implemented and passes under full production traffic isolation';

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

export async function runReviewedSupabaseCli({
  args = process.argv.slice(2),
  workspace = process.cwd(),
  environment = process.env,
  spawn = spawnSync,
  executableVerifier = verifyApprovedSupabaseCliExecutable,
  targetVerifier = verifyConfiguredSupabaseTarget,
  rootCertificateVerifier = verifyApprovedSslRootCertificate,
  readManifest = readFileSync,
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
      !args.includes('--dry-run')
    ) {
      throw new Error(PRODUCTION_STAFFING_PRE_EXECUTE_PROOF_BLOCK_MESSAGE);
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
    stdio: 'inherit',
    windowsHide: true,
  });

  if (result.error) {
    throw new Error('Reviewed Supabase CLI command could not be started');
  }
  if (typeof result.status !== 'number') {
    throw new Error(
      'Reviewed Supabase CLI command did not return an exit status'
    );
  }

  return result.status;
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
