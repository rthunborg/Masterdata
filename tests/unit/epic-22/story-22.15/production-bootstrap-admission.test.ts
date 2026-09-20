import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  assessProductionBootstrapAdmission,
  parseExactProductionBootstrapDryRun,
  PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS,
  validateProductionBootstrapSource,
  validateProductionBootstrapSubset,
} from '../../../../src/lib/release/production-bootstrap-admission.mjs';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const manifestSha = 'c'.repeat(64);

function migrations() {
  return PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS.map((version, index) => ({
    version,
    file: `${version}_forward_${index}.sql`,
    gitBlob: `${index.toString(16)}`.repeat(40).slice(0, 40),
    sha256: `${(index + 1).toString(16)}`.repeat(64).slice(0, 64),
  }));
}

function source() {
  return {
    sourceCommit: commit,
    sourceTree: tree,
    sourceManifestSha256: manifestSha,
    reviewedSupabaseCliVersion: '2.115.0',
    migrations: migrations(),
  };
}

function subset() {
  const value = source();
  return {
    schemaVersion: 1,
    kind: 'offline-forward-subset',
    executable: false,
    privateMaterialAllowed: false,
    approvalAttested: false,
    gitExecutableSha256: 'd'.repeat(64),
    ...value,
  };
}

function exactDryRun() {
  return migrations().map(
    (entry) => `Applying migration * ${entry.file}`
  ).join('\n');
}

function observedState(now = new Date('2026-09-20T12:00:00.000Z')) {
  const facts = validateProductionBootstrapSubset({ source: source(), subset: subset() });
  return {
    schemaVersion: 1,
    kind: 'production-forward-bootstrap-observed-state',
    environment: 'production',
    sourceCommit: commit,
    sourceTree: tree,
    sourceManifestSha256: manifestSha,
    subsetSha256: facts.subsetSha256,
    targetBindingSha256: 'e'.repeat(64),
    observationSha256: 'f'.repeat(64),
    capturedAt: now.toISOString(),
  };
}

describe('Story 22.15 production forward-bootstrap admission', () => {
  it('requires the complete immutable 13-version source identity', () => {
    expect(validateProductionBootstrapSource(source()).migrations).toHaveLength(13);

    const reordered = source();
    reordered.migrations.reverse();
    expect(() => validateProductionBootstrapSource(reordered)).toThrow(
      'Production bootstrap source identity is unavailable or invalid'
    );

    const altered = source();
    altered.migrations[0].sha256 = '0'.repeat(64);
    expect(validateProductionBootstrapSource(altered).migrations[0].sha256).toBe(
      '0'.repeat(64)
    );
  });

  it('binds the non-executable subset to every pinned source entry', () => {
    expect(
      validateProductionBootstrapSubset({ source: source(), subset: subset() }).sourceCommit
    ).toBe(commit);

    const mismatched = subset();
    mismatched.migrations[6].gitBlob = '0'.repeat(40);
    expect(() =>
      validateProductionBootstrapSubset({ source: source(), subset: mismatched })
    ).toThrow('Production bootstrap subset does not match the pinned source');
  });

  it.each([
    ['executable', (value: ReturnType<typeof subset>) => (value.executable = true)],
    ['private material', (value: ReturnType<typeof subset>) => (value.privateMaterialAllowed = true)],
    ['approval claim', (value: ReturnType<typeof subset>) => (value.approvalAttested = true)],
    ['offline target binding', (value: ReturnType<typeof subset>) => Object.assign(value, { targetBound: true })],
    ['unallowlisted private field', (value: ReturnType<typeof subset>) => Object.assign(value, { privateConnectionApproved: false })],
  ])('rejects a %s source-only subset receipt', (_label, change) => {
    const altered = subset();
    change(altered);
    expect(() =>
      validateProductionBootstrapSubset({ source: source(), subset: altered })
    ).toThrow('Production bootstrap subset is unavailable or invalid');
  });

  it('rejects unallowlisted nested migration receipt fields', () => {
    const altered = subset();
    Object.assign(altered.migrations[0], { targetBound: false });
    expect(() =>
      validateProductionBootstrapSubset({ source: source(), subset: altered })
    ).toThrow('Production bootstrap subset is unavailable or invalid');
  });

  it('requires exactly the ordered thirteen versions in dry-run output', () => {
    const parsed = parseExactProductionBootstrapDryRun(exactDryRun(), migrations());
    expect(parsed.versions).toEqual(PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS);
    expect(parsed.files).toEqual(migrations().map((entry) => entry.file));
    expect(parsed.outputSha256).toBe(sha(exactDryRun()));
  });

  it.each([
    ['a missing file', (files: string[]) => files.slice(1)],
    ['a duplicate file', (files: string[]) => [...files, files[0]]],
    ['a reordered file', (files: string[]) => [...files].reverse()],
    ['an unknown suffix', (files: string[]) => [...files.slice(0, -1), `${PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS.at(-1)}_other.sql`]],
    ['an extra uppercase filename', (files: string[]) => [...files, '20260920123456_Unexpected.sql']],
    ['an extra bare version', (files: string[]) => [...files, '20260920123456']],
    ['a trailing file extension', (files: string[]) => [...files.slice(0, -1), `${files.at(-1)}.bak`]],
  ])('rejects dry-run output with %s', (_label, change) => {
    const output = change(migrations().map((entry) => entry.file))
      .map((file) => `Applying migration * ${file}`)
      .join('\n');
    expect(() => parseExactProductionBootstrapDryRun(output, migrations())).toThrow(
      'Production bootstrap dry-run does not list the exact ordered subset'
    );
  });

  it('rejects bare version output because it does not establish the exact source file', () => {
    const output = PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS.map(
      (version) => `Applying migration ${version}`
    ).join('\n');
    expect(() => parseExactProductionBootstrapDryRun(output, migrations())).toThrow(
      'Production bootstrap dry-run does not list the exact ordered subset'
    );
  });

  it('accepts a private preparation receipt only while all authority flags are false', () => {
    const preparation = {
      ...subset(),
      kind: 'private-forward-preparation',
      targetBound: false,
    };
    expect(
      validateProductionBootstrapSubset({ source: source(), subset: preparation }).sourceTree
    ).toBe(tree);
    preparation.targetBound = true;
    expect(() =>
      validateProductionBootstrapSubset({ source: source(), subset: preparation })
    ).toThrow('Production bootstrap subset is unavailable or invalid');
  });

  it('returns a blocked assessment even when caller supplies claimed cleanup and isolation flags', () => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    const assessment = assessProductionBootstrapAdmission({
      source: source(),
      subset: subset(),
      dryRunOutput: exactDryRun(),
      dryRunExitStatus: 0,
      observedState: observedState(now),
      now,
      cleanupPassed: true,
      isolationPassed: true,
      ownerApproved: true,
    });

    expect(assessment.disposition).toBe('blocked');
    expect(assessment.blockers).toEqual([
      'live_cleanup_proof_collector_not_implemented',
      'live_full_technical_isolation_collector_not_implemented',
      'production_non_dry_run_apply_remains_blocked',
    ]);
  });

  it('rejects stale, misbound, or unsuccessful observed-state evidence before an assessment', () => {
    const now = new Date('2026-09-20T12:20:01.000Z');
    const stale = observedState(new Date('2026-09-20T12:00:00.000Z'));
    expect(() =>
      assessProductionBootstrapAdmission({
        source: source(), subset: subset(), dryRunOutput: exactDryRun(),
        dryRunExitStatus: 0, observedState: stale, now,
      })
    ).toThrow('Production bootstrap observed-state evidence is stale or invalid');

    const misbound = observedState(now);
    misbound.sourceTree = '0'.repeat(40);
    expect(() =>
      assessProductionBootstrapAdmission({
        source: source(), subset: subset(), dryRunOutput: exactDryRun(),
        dryRunExitStatus: 0, observedState: misbound, now,
      })
    ).toThrow('Production bootstrap observed-state evidence does not bind to this candidate');

    expect(() =>
      assessProductionBootstrapAdmission({
        source: source(), subset: subset(), dryRunOutput: exactDryRun(),
        dryRunExitStatus: 1, observedState: observedState(now), now,
      })
    ).toThrow('Production bootstrap dry-run did not complete successfully');
  });

  it('does not permit callers to weaken the 15-minute evidence freshness bound', () => {
    const now = new Date('2026-09-20T12:20:01.000Z');
    expect(() => assessProductionBootstrapAdmission({
      source: source(), subset: subset(), dryRunOutput: exactDryRun(),
      dryRunExitStatus: 0, observedState: observedState(now), now,
      maxEvidenceAgeMs: 15 * 60 * 1000 + 1,
    })).toThrow('Production bootstrap evidence age policy exceeds the reviewed maximum');
  });
});
