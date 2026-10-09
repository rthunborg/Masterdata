import { describe, expect, it } from 'vitest';
import {
  CLI_MATRIX_CASES,
  classifyCliMatrixResult,
  verifyPendingMatrixDryRun,
} from '../../../support/production-cli-matrix-result.mjs';
import { PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS as versions } from '../../../../src/lib/release/production-bootstrap-admission.mjs';

function observed(caseName: keyof typeof CLI_MATRIX_CASES) {
  const spec = CLI_MATRIX_CASES[caseName];
  return {
    child: { kind: 'exit', code: spec.mode === 'success' ? 0 : 1 },
    observerComplete: true,
    sourceMatched: true,
    guardIdentityMatched: true,
    dryRunUnchanged: true,
    dryRunOrderMatched: true,
    history: versions.slice(0, spec.prefix),
    beforeCurrentSha256: 'a'.repeat(64),
    afterCurrentSha256: 'a'.repeat(64),
    preservationMatched: true,
    catalogMatched: true,
    currentPostcondition: spec.mode === 'success',
    strictCatalogPassed: true,
    guardErrorVersion: spec.target,
    guardErrorMatched: true,
    beforeAlreadySatisfiedPostcondition: false,
    onlyExpectedCurrentChange: true,
    hook: {
      armed: true,
      observed: true,
      targetVersion: spec.target,
      firingCount: 1,
      unexpectedFiringCount: 0,
      errorMatched: true,
    },
  };
}

describe('pending suffix dry-run proof', () => {
  const migrations = versions.map((version) => ({
    version,
    file: `${version}_synthetic.sql`,
    gitBlob: 'a'.repeat(40),
    sha256: 'b'.repeat(64),
  }));
  it.each([1, 3, 8, 11, 12])(
    'proves the exact pending suffix after prefix %i',
    (count) => {
      const output = migrations
        .slice(count)
        .map((m) => m.file)
        .join('\n');
      expect(
        verifyPendingMatrixDryRun(output, migrations, versions.slice(0, count))
          .pendingVersions
      ).toEqual(versions.slice(count));
    }
  );
  it.each(['missing', 'extra', 'reordered', 'already_applied'])(
    'rejects incorrect child listing: %s',
    (change) => {
      let files = migrations.slice(3).map((m) => m.file);
      if (change === 'missing') files = files.slice(1);
      if (change === 'extra') files.push('20270101000000_unknown.sql');
      if (change === 'reordered') files.reverse();
      if (change === 'already_applied') files.unshift(migrations[0].file);
      expect(() =>
        verifyPendingMatrixDryRun(
          files.join('\n'),
          migrations,
          versions.slice(0, 3)
        )
      ).toThrow();
    }
  );
  it('rejects non-prefix history instead of synthesizing a misleading complete listing', () => {
    expect(() =>
      verifyPendingMatrixDryRun('', migrations, [versions[1]])
    ).toThrow('Invalid local matrix pending history');
    expect(() => verifyPendingMatrixDryRun('', migrations, versions)).toThrow(
      'Invalid local matrix pending history'
    );
  });
});

describe('local CLI matrix terminal classification', () => {
  it.each([
    'observed_guard_stop',
    'trigger_profile_stop_184840',
    'trigger_profile_stop_184841',
  ] as const)(
    'requires exact guard boundary and preserved state: %s',
    (name) => {
      expect(classifyCliMatrixResult(name, observed(name)).classification).toBe(
        'proven_rejected_before_current_effect'
      );
      for (const delta of [
        { guardErrorVersion: versions[0] },
        { guardErrorMatched: false },
        { catalogMatched: false },
        { afterCurrentSha256: 'b'.repeat(64) },
        { history: [] },
        { child: { kind: 'exit', code: 0 } },
      ])
        expect(
          classifyCliMatrixResult(name, { ...observed(name), ...delta })
            .classification
        ).toBe('ambiguous_stop');
    }
  );

  it('requires complete catalog and preservation for success', () => {
    const name = 'postcleanup_success';
    expect(classifyCliMatrixResult(name, observed(name)).classification).toBe(
      'proven_complete_local_rehearsal'
    );
    for (const delta of [
      { strictCatalogPassed: false },
      { currentPostcondition: false },
      { preservationMatched: false },
      { history: [...versions, versions[0]] },
      { child: { kind: 'exit', code: 1 } },
    ]) {
      expect(
        classifyCliMatrixResult(name, { ...observed(name), ...delta })
          .classification
      ).toBe('ambiguous_stop');
    }
  });

  it.each([
    'explicit_history_write_failure',
    'implicit_history_write_failure',
  ] as const)(
    'measures transaction outcome rather than using file shape: %s',
    (name) => {
      expect(classifyCliMatrixResult(name, observed(name)).classification).toBe(
        'rolled_back_unrecorded_current'
      );
      expect(
        classifyCliMatrixResult(name, {
          ...observed(name),
          afterCurrentSha256: 'b'.repeat(64),
          currentPostcondition: true,
          catalogMatched: false,
        }).classification
      ).toBe('committed_unrecorded_current');
      for (const delta of [
        { beforeAlreadySatisfiedPostcondition: true },
        { catalogMatched: false },
        { currentPostcondition: true },
        { afterCurrentSha256: 'b'.repeat(64) },
        {
          afterCurrentSha256: 'b'.repeat(64),
          currentPostcondition: true,
          onlyExpectedCurrentChange: false,
        },
        ...[
          { armed: false },
          { observed: false },
          { targetVersion: versions[12] },
          { firingCount: 0 },
          { firingCount: 2 },
          { unexpectedFiringCount: 1 },
          { errorMatched: false },
        ].map((hook) => ({ hook: { ...observed(name).hook, ...hook } })),
      ])
        expect(
          classifyCliMatrixResult(name, { ...observed(name), ...delta })
            .classification
        ).toBe('ambiguous_stop');
    }
  );

  it.each(Object.keys(CLI_MATRIX_CASES) as (keyof typeof CLI_MATRIX_CASES)[])(
    'never treats incomplete or untrustworthy results as rollback: %s',
    (name) => {
      for (const delta of [
        { child: { kind: 'timeout', code: null } },
        { child: { kind: 'signal', code: null } },
        { child: { kind: 'error', code: null } },
        { observerComplete: false },
        { afterCurrentSha256: null },
        { currentPostcondition: undefined },
      ]) {
        expect(
          classifyCliMatrixResult(name, { ...observed(name), ...delta })
            .classification
        ).toBe('uncertain_current_file');
      }
    }
  );

  it('keeps an intentionally timed-out case uncertain even with a normal exit or known-looking snapshot', () => {
    expect(
      classifyCliMatrixResult(
        'explicit_history_write_timeout',
        observed('explicit_history_write_timeout')
      ).classification
    ).toBe('uncertain_current_file');
  });

  it.each([
    'sourceMatched',
    'guardIdentityMatched',
    'dryRunUnchanged',
    'dryRunOrderMatched',
  ])('rejects unbound input: %s', (key) => {
    expect(
      classifyCliMatrixResult('observed_guard_stop', {
        ...observed('observed_guard_stop'),
        [key]: false,
      }).classification
    ).toBe('ambiguous_stop');
  });

  it('rejects unknown cases and prototype names', () => {
    for (const name of ['unknown', 'toString', '__proto__'])
      expect(() => classifyCliMatrixResult(name, {})).toThrow(
        'Unknown local CLI matrix case'
      );
  });

  it('projects a closed receipt without propagating arbitrary input or granting continuation', () => {
    const result = classifyCliMatrixResult('postcleanup_success', {
      ...observed('postcleanup_success'),
      rawOutput: 'sensitive-canary',
      url: 'sensitive-canary',
      password: 'sensitive-canary',
    });
    expect(result).toEqual({
      caseName: 'postcleanup_success',
      classification: 'proven_complete_local_rehearsal',
      syntheticOnly: true,
      mayContinue: false,
      mayRepair: false,
      retainDatabase: true,
    });
    expect(JSON.stringify(result)).not.toContain('sensitive-canary');
    expect(Object.isFrozen(result)).toBe(true);
  });
});
