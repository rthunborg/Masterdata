import { describe, expect, it, vi } from 'vitest';
import { preparePrivateForwardWorkspace, verifyPrivateForwardWorkspace } from '../../../../src/lib/release/launch-private-forward-workspace.mjs';

describe('retired private forward workspace entry points', () => {
  for (const [name, operation] of Object.entries({ preparePrivateForwardWorkspace, verifyPrivateForwardWorkspace })) {
    it(name + ' rejects before inspecting any caller-supplied paths or executables', async () => {
      const accessed = vi.fn(() => { throw new Error('private option was accessed'); });
      const options = new Proxy({}, { get: accessed, ownKeys: accessed });
      await expect(operation(options)).rejects.toThrow('Private forward workspace is unavailable until a protected bootstrap is reviewed');
      expect(accessed).not.toHaveBeenCalled();
    });
    it(name + ' cannot be enabled by caller-supplied approval or bootstrap flags', async () => {
      await expect(operation({ approvalAttested: true, bootstrapVerified: true, executable: true })).rejects.toThrow('Private forward workspace is unavailable until a protected bootstrap is reviewed');
    });
    it(name + ' also rejects missing inputs', async () => {
      await expect(operation()).rejects.toThrow('Private forward workspace is unavailable until a protected bootstrap is reviewed');
    });
  }
});
