import { describe, expect, it } from 'vitest';
import { runProductionCliMatrixCase } from '../../../support/production-cli-matrix-runner.mjs';

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
