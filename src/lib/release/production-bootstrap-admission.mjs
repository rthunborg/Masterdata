import { createHash } from 'node:crypto';

export const PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS = Object.freeze([
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

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}$/u;
const MIGRATION_FILE = /^(\d{14})_[a-z0-9_]+\.sql$/u;
const MAX_DRY_RUN_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;
const OFFLINE_SUBSET_RECEIPT_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'executable',
  'privateMaterialAllowed',
  'approvalAttested',
  'gitExecutableSha256',
  'sourceCommit',
  'sourceTree',
  'sourceManifestSha256',
  'reviewedSupabaseCliVersion',
  'migrations',
]);
const MIGRATION_RECEIPT_KEYS = Object.freeze([
  'version',
  'file',
  'gitBlob',
  'sha256',
]);

const fail = (message) => {
  throw new Error(message);
};

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function assertSha256(value, message) {
  if (typeof value !== 'string' || !SHA256.test(value)) fail(message);
}

function assertGitSha(value, message) {
  if (typeof value !== 'string' || !GIT_SHA.test(value)) fail(message);
}

function assertExactObjectKeys(value, keys, message) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    !same(Object.keys(value).sort(), [...keys].sort())
  ) {
    fail(message);
  }
}

function assertExactMigrationEntries(entries, message) {
  if (!Array.isArray(entries) || entries.length !== PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS.length) {
    fail(message);
  }
  const versions = entries.map((entry) => entry?.version);
  if (!same(versions, PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS)) fail(message);

  for (const entry of entries) {
    assertExactObjectKeys(entry, MIGRATION_RECEIPT_KEYS, message);
    if (
      typeof entry.file !== 'string' ||
      !MIGRATION_FILE.test(entry.file) ||
      MIGRATION_FILE.exec(entry.file)?.[1] !== entry.version ||
      !GIT_SHA.test(entry.gitBlob ?? '') ||
      !SHA256.test(entry.sha256 ?? '')
    ) {
      fail(message);
    }
  }
}

/**
 * Validates facts obtained from inspectForwardSource. This is deliberately a
 * structural check: callers still have to obtain the facts from a clean,
 * pinned source through the existing source/subset verifier.
 */
export function validateProductionBootstrapSource(source) {
  if (!source || typeof source !== 'object') {
    fail('Production bootstrap source identity is unavailable or invalid');
  }
  assertGitSha(
    source.sourceCommit,
    'Production bootstrap source identity is unavailable or invalid'
  );
  assertGitSha(
    source.sourceTree,
    'Production bootstrap source identity is unavailable or invalid'
  );
  assertSha256(
    source.sourceManifestSha256,
    'Production bootstrap source identity is unavailable or invalid'
  );
  if (source.reviewedSupabaseCliVersion !== '2.115.0') {
    fail('Production bootstrap source identity is unavailable or invalid');
  }
  assertExactMigrationEntries(
    source.migrations,
    'Production bootstrap source identity is unavailable or invalid'
  );
  return Object.freeze({
    sourceCommit: source.sourceCommit,
    sourceTree: source.sourceTree,
    sourceManifestSha256: source.sourceManifestSha256,
    migrations: source.migrations.map((entry) => ({ ...entry })),
  });
}

/**
 * Validates the non-executable receipt emitted by verifyForwardSubset. The
 * receipt must be byte-for-byte bound to the independently inspected source.
 */
export function validateProductionBootstrapSubset({ source, subset }) {
  const sourceFacts = validateProductionBootstrapSource(source);
  const isOfflineSubset = subset?.kind === 'offline-forward-subset';
  if (isOfflineSubset) {
    assertExactObjectKeys(
      subset,
      OFFLINE_SUBSET_RECEIPT_KEYS,
      'Production bootstrap subset is unavailable or invalid'
    );
  }
  if (
    !subset ||
    subset.schemaVersion !== 1 ||
    !isOfflineSubset ||
    subset.executable !== false ||
    subset.privateMaterialAllowed !== false ||
    subset.approvalAttested !== false ||
    (isOfflineSubset && 'targetBound' in subset) ||
    subset.reviewedSupabaseCliVersion !== '2.115.0'
  ) {
    fail('Production bootstrap subset is unavailable or invalid');
  }
  assertSha256(
    subset.gitExecutableSha256,
    'Production bootstrap subset is unavailable or invalid'
  );
  if (
    subset.sourceCommit !== sourceFacts.sourceCommit ||
    subset.sourceTree !== sourceFacts.sourceTree ||
    subset.sourceManifestSha256 !== sourceFacts.sourceManifestSha256
  ) {
    fail('Production bootstrap subset does not match the pinned source');
  }
  assertExactMigrationEntries(
    subset.migrations,
    'Production bootstrap subset is unavailable or invalid'
  );
  if (!same(subset.migrations, sourceFacts.migrations)) {
    fail('Production bootstrap subset does not match the pinned source');
  }
  return Object.freeze({
    ...sourceFacts,
    subsetSha256: createHash('sha256')
      .update(JSON.stringify(subset))
      .digest('hex'),
  });
}

/**
 * Extracts migration versions from captured CLI output. The parser is strict
 * on purpose: an output format it cannot prove is a stop condition.
 */
export function parseExactProductionBootstrapDryRun(output, expectedMigrations) {
  assertExactMigrationEntries(
    expectedMigrations,
    'Production bootstrap dry-run expected subset is unavailable or invalid'
  );
  if (
    typeof output !== 'string' ||
    output.includes('\0') ||
    Buffer.byteLength(output, 'utf8') > MAX_DRY_RUN_OUTPUT_BYTES
  ) {
    fail('Production bootstrap dry-run output is unavailable or invalid');
  }
  const files = [...output.matchAll(
    /(?<![a-zA-Z0-9_])(\d{14}(?:_[^\s]+)?)(?![a-zA-Z0-9_])/gu
  )].map(
    (match) => match[1]
  );
  const expectedFiles = expectedMigrations.map((entry) => entry.file);
  if (!same(files, expectedFiles)) {
    fail('Production bootstrap dry-run does not list the exact ordered subset');
  }
  return Object.freeze({
    files: [...files],
    versions: expectedMigrations.map((entry) => entry.version),
    outputSha256: createHash('sha256').update(output).digest('hex'),
  });
}

function validateFreshObservation({ observation, facts, now, maxEvidenceAgeMs }) {
  if (!observation || typeof observation !== 'object') {
    fail('Production bootstrap observed-state evidence is unavailable');
  }
  if (
    observation.schemaVersion !== 1 ||
    observation.kind !== 'production-forward-bootstrap-observed-state' ||
    observation.environment !== 'production' ||
    observation.sourceCommit !== facts.sourceCommit ||
    observation.sourceTree !== facts.sourceTree ||
    observation.sourceManifestSha256 !== facts.sourceManifestSha256 ||
    observation.subsetSha256 !== facts.subsetSha256
  ) {
    fail('Production bootstrap observed-state evidence does not bind to this candidate');
  }
  assertSha256(
    observation.targetBindingSha256,
    'Production bootstrap observed-state evidence is unavailable'
  );
  assertSha256(
    observation.observationSha256,
    'Production bootstrap observed-state evidence is unavailable'
  );
  const capturedAt = Date.parse(observation.capturedAt ?? '');
  if (
    !Number.isFinite(capturedAt) ||
    capturedAt > now.getTime() ||
    now.getTime() - capturedAt > maxEvidenceAgeMs
  ) {
    fail('Production bootstrap observed-state evidence is stale or invalid');
  }
  return Object.freeze({
    capturedAt: new Date(capturedAt).toISOString(),
    observationSha256: observation.observationSha256,
    targetBindingSha256: observation.targetBindingSha256,
  });
}

/**
 * A plan-only gate. It validates source/subset/dry-run and freshness binding,
 * but always remains blocked: the count-only cleanup prerequisite collector
 * is not bound into a protected target bootstrap and cannot prove separately
 * authorised cleanup or full technical isolation. In particular,
 * caller-supplied booleans are intentionally ignored and cannot enable a
 * production write.
 */
export function assessProductionBootstrapAdmission({
  source,
  subset,
  dryRunOutput,
  dryRunExitStatus,
  observedState,
  now = new Date(),
  maxEvidenceAgeMs = DEFAULT_MAX_EVIDENCE_AGE_MS,
} = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    fail('Production bootstrap admission clock is unavailable or invalid');
  }
  if (!Number.isInteger(maxEvidenceAgeMs) || maxEvidenceAgeMs <= 0) {
    fail('Production bootstrap evidence age policy is unavailable or invalid');
  }
  if (maxEvidenceAgeMs > DEFAULT_MAX_EVIDENCE_AGE_MS) {
    fail('Production bootstrap evidence age policy exceeds the reviewed maximum');
  }
  const facts = validateProductionBootstrapSubset({ source, subset });
  if (dryRunExitStatus !== 0) {
    fail('Production bootstrap dry-run did not complete successfully');
  }
  const dryRun = parseExactProductionBootstrapDryRun(
    dryRunOutput,
    facts.migrations
  );
  const observation = validateFreshObservation({
    observation: observedState,
    facts,
    now,
    maxEvidenceAgeMs,
  });

  return Object.freeze({
    schemaVersion: 1,
    kind: 'production-forward-bootstrap-admission-assessment',
    disposition: 'blocked',
    sourceCommit: facts.sourceCommit,
    sourceTree: facts.sourceTree,
    sourceManifestSha256: facts.sourceManifestSha256,
    subsetSha256: facts.subsetSha256,
    dryRunOutputSha256: dryRun.outputSha256,
    observedAt: observation.capturedAt,
    observationSha256: observation.observationSha256,
    targetBindingSha256: observation.targetBindingSha256,
    blockers: Object.freeze([
      'live_cleanup_prerequisites_not_bound_to_protected_bootstrap',
      'live_full_technical_isolation_collector_not_implemented',
      'production_non_dry_run_apply_remains_blocked',
    ]),
  });
}
