import { describe, expect, it } from 'vitest';
import {
  assertInitialMatrixObservation,
  runProductionCliMatrixCase,
} from '../../../support/production-cli-matrix-runner.mjs';
import { SYNTHETIC_AGGREGATES } from '../../../support/production-cli-matrix-fixture.mjs';

const binding = {
  owned: true,
  verified: true,
  resourceId: '00000000-0000-0000-0000-000000000000',
  expectedSystemIdentifierSha256: 'a'.repeat(64),
  composeSha256: 'b'.repeat(64),
  port: 27442,
  password: 'c'.repeat(32),
  observedAtUtc: new Date().toISOString(),
};

describe('declared initial matrix profile', () => {
  const expected = {
    ...SYNTHETIC_AGGREGATES,
    savedFilters: 48,
    savedFilterOrphans: 48,
    savedFilterEmptyNames: 0,
    savedFilterOverlengthNames: 0,
  };
  const observation = () => ({
    history: [],
    counts: {
      ...expected,
      unmappedActors: 0,
      repayment: {
        omcNull: 70,
        omcTrue: 2,
        omcFalse: 1,
        pe3Null: 70,
        pe3True: 2,
        pe3False: 1,
      },
    },
  });
  it('admits the complete declared synthetic profile', () => {
    expect(() =>
      assertInitialMatrixObservation(observation(), expected)
    ).not.toThrow();
  });
  it.each([
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
  ])('rejects drift in %s', (key) => {
    const initial = observation();
    Object.assign(initial.counts, { [key]: 999 });
    expect(() => assertInitialMatrixObservation(initial, expected)).toThrow(
      'matrix_fixture_aggregates'
    );
  });
  it.each(['omcNull', 'omcTrue', 'omcFalse', 'pe3Null', 'pe3True', 'pe3False'])(
    'rejects repayment drift in %s',
    (key) => {
      const initial = observation();
      Object.assign(initial.counts.repayment, { [key]: 999 });
      expect(() => assertInitialMatrixObservation(initial, expected)).toThrow(
        'matrix_fixture_repayment'
      );
    }
  );
  it('rejects a prepopulated history even with matching data', () => {
    expect(() =>
      assertInitialMatrixObservation(
        { ...observation(), history: ['20260314000001'] },
        expected
      )
    ).toThrow('matrix_fixture_initial_state');
  });
});

describe('local CLI matrix admission rejection', () => {
  it.each(['unreviewed', '__proto__', 'toString'])(
    'rejects unknown cases before touching files or targets: %s',
    async (caseName) => {
      await expect(runProductionCliMatrixCase({ caseName })).rejects.toThrow(
        'matrix_case'
      );
    }
  );

  it.each([
    { owned: false },
    { verified: false },
    { expectedSystemIdentifierSha256: '' },
    { expectedSystemIdentifierSha256: 'A'.repeat(64) },
    { composeSha256: '' },
    { resourceId: 'arbitrary' },
    { resourceId: '-'.repeat(36) },
    { port: 543.2 },
    { port: 1023 },
    { port: 65536 },
    { password: 'secret-canary' },
    { observedAtUtc: 'invalid' },
    { observedAtUtc: new Date(Date.now() - 3600000).toISOString() },
    { observedAtUtc: new Date(Date.now() + 3600000).toISOString() },
  ])(
    'rejects invalid guard facts before source/tool/database work: %j',
    async (delta) => {
      await expect(
        runProductionCliMatrixCase({
          caseName: 'postcleanup_success',
          guardBinding: { ...binding, ...delta },
        })
      ).rejects.toThrow('matrix_guard_binding');
    }
  );

  it('does not expose malformed input in errors', async () => {
    try {
      await runProductionCliMatrixCase({
        caseName: 'postcleanup_success',
        guardBinding: { password: 'secret-canary' },
      });
    } catch (error) {
      expect(String(error)).not.toContain('secret-canary');
      return;
    }
    throw new Error('Expected rejection');
  });
});
