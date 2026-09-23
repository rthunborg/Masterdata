import { describe, expect, it } from 'vitest';
import {
  buildHistoryFaultSetup,
  interpretHistoryFaultObservation,
} from '../../../support/production-cli-matrix-hook.mjs';

const setup = buildHistoryFaultSetup({
  targetVersion: '20260314000002',
  mode: 'reject',
});
const row = {
  firing_count: '0',
  function_attributes_match: true,
  sole_trigger: true,
  trigger_matches: true,
  function_body: setup.sql.split('$matrix_hook$')[1],
};

describe('synthetic history insert fault', () => {
  it.each([
    ['20260314000002', 'reject'],
    ['20260615000000', 'reject'],
    ['20260314000002', 'timeout'],
  ])(
    'constructs only a bounded target-specific fault: %s %s',
    (targetVersion, mode) => {
      const result = buildHistoryFaultSetup({ targetVersion, mode });
      expect(result.sql).toContain(`IF NEW.version = '${targetVersion}' THEN`);
      expect(result.sql).toContain(
        "nextval('cli_matrix_probe.history_fault_firings')"
      );
      expect(result.sql).toContain(
        "RAISE EXCEPTION 'CLI_MATRIX_HISTORY_REJECT'"
      );
      expect(result.sql.includes('pg_sleep(8)')).toBe(mode === 'timeout');
      expect(result.historyTableManuallyCreated).toBe(true);
      expect(result).toEqual(buildHistoryFaultSetup({ targetVersion, mode }));
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(result.sql).not.toMatch(/DROP|TRUNCATE|DELETE|COMMIT/iu);
    }
  );

  it.each([
    { targetVersion: '20260615000000', mode: 'timeout' },
    { targetVersion: '20260314000002', mode: 'arbitrary' },
    { targetVersion: "'; SELECT 1;--", mode: 'reject' },
    { targetVersion: '20260910184841', mode: 'reject' },
  ])('rejects unreviewed inputs: %j', (input) =>
    expect(() => buildHistoryFaultSetup(input)).toThrow(
      'Unsupported synthetic history fault'
    )
  );

  it('distinguishes armed from independently observed', () => {
    expect(interpretHistoryFaultObservation(setup, [row])).toMatchObject({
      armed: true,
      observed: false,
      firingCount: 0,
      complete: true,
    });
    expect(
      interpretHistoryFaultObservation(setup, [{ ...row, firing_count: '1' }])
    ).toMatchObject({
      armed: true,
      observed: true,
      firingCount: 1,
      complete: true,
    });
    expect(
      interpretHistoryFaultObservation(setup, [{ ...row, firing_count: '2' }])
    ).toMatchObject({ armed: true, observed: false, firingCount: 2 });
  });

  it.each([
    {
      function_body: row.function_body.replace(
        '20260314000002',
        '20260615000000'
      ),
    },
    { function_attributes_match: false },
    { sole_trigger: false },
    { trigger_matches: false },
    { function_body: null },
    { function_attributes_match: 'true' },
  ])('never accepts a changed or misdirected hook: %j', (delta) => {
    expect(
      interpretHistoryFaultObservation(setup, [
        { ...row, ...delta, firing_count: '1' },
      ])
    ).toMatchObject({ armed: false, observed: false, complete: false });
  });

  it.each([null, 1, '-1', '1.0', '01', '1000000', 'secret'])(
    'rejects unprovable counts: %j',
    (firing_count) => {
      expect(
        interpretHistoryFaultObservation(setup, [{ ...row, firing_count }])
      ).toMatchObject({ observed: false, firingCount: null, complete: false });
    }
  );

  it('requires exactly one observation and emits no raw body', () => {
    for (const rows of [[], [row, row], null])
      expect(interpretHistoryFaultObservation(setup, rows).complete).toBe(
        false
      );
    const result = interpretHistoryFaultObservation(setup, [
      { ...row, secret: 'canary' },
    ]);
    expect(Object.keys(result).sort()).toEqual([
      'armed',
      'complete',
      'firingCount',
      'observed',
      'targetVersion',
    ]);
    expect(JSON.stringify(result)).not.toContain('canary');
    expect(JSON.stringify(result)).not.toContain(row.function_body);
  });
});
