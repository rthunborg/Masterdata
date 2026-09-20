import { describe, expect, it, vi } from 'vitest';

import {
  POSTGRES_SYSTEM_IDENTIFIER_QUERY,
  assertGuardedPostgresSystemIdentifier,
  createGuardedFixtureDatabase,
  requireGuardedPostgresSystemIdentifier,
} from '../../../support/guarded-postgres-fixture.mjs';

const systemIdentifier = '7612345678901234567';

describe('guarded PostgreSQL fixture identity', () => {
  it.each([undefined, '', '  ', '0', '-1', '123abc', '0123', '12345678901234567890'])(
    'rejects an absent or malformed expected system identifier: %p',
    (value) => {
      expect(() => requireGuardedPostgresSystemIdentifier(value)).toThrow(
        'Expected guarded PostgreSQL system identifier is unavailable or invalid'
      );
    }
  );

  it('creates a fixture only after the launcher record matches the admin server', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ system_identifier: systemIdentifier }] })
      .mockResolvedValueOnce({ rows: [] });

    await createGuardedFixtureDatabase({
      adminClient: { query },
      expectedSystemIdentifier: systemIdentifier,
      databaseName: 'story_2215_cleanup_fixture',
    });

    expect(query).toHaveBeenNthCalledWith(1, POSTGRES_SYSTEM_IDENTIFIER_QUERY);
    expect(query).toHaveBeenNthCalledWith(
      2,
      'CREATE DATABASE story_2215_cleanup_fixture TEMPLATE template0'
    );
  });

  it('does not issue a write when the observed system identifier differs', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ system_identifier: '7612345678901234568' }],
    });

    await expect(
      createGuardedFixtureDatabase({
        adminClient: { query },
        expectedSystemIdentifier: systemIdentifier,
        databaseName: 'story_2215_cleanup_fixture',
      })
    ).rejects.toThrow('Guarded PostgreSQL system identifier does not match the launcher record');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(POSTGRES_SYSTEM_IDENTIFIER_QUERY);
  });

  it.each([
    [],
    [{ system_identifier: '' }],
    [{ system_identifier: 'not-a-system-identifier' }],
    [
      { system_identifier: systemIdentifier },
      { system_identifier: systemIdentifier },
    ],
  ])('rejects an unreadable observed identity without issuing a write: %j', async (rows) => {
    const query = vi.fn().mockResolvedValue({ rows });

    await expect(
      createGuardedFixtureDatabase({
        adminClient: { query },
        expectedSystemIdentifier: systemIdentifier,
        databaseName: 'story_2215_cleanup_fixture',
      })
    ).rejects.toThrow('Observed PostgreSQL system identifier is unavailable or invalid');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(POSTGRES_SYSTEM_IDENTIFIER_QUERY);
  });

  it('checks the newly opened fixture connection before schema setup', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ system_identifier: systemIdentifier }],
    });

    await expect(
      assertGuardedPostgresSystemIdentifier({
        adminClient: { query },
        expectedSystemIdentifier: systemIdentifier,
      })
    ).resolves.toBe(systemIdentifier);
    expect(query).toHaveBeenCalledExactlyOnceWith(POSTGRES_SYSTEM_IDENTIFIER_QUERY);
  });

  it('does not connect or issue a write when the launcher identifier is missing', async () => {
    const query = vi.fn();

    await expect(
      createGuardedFixtureDatabase({
        adminClient: { query },
        expectedSystemIdentifier: undefined,
        databaseName: 'story_2215_cleanup_fixture',
      })
    ).rejects.toThrow('Expected guarded PostgreSQL system identifier is unavailable or invalid');
    expect(query).not.toHaveBeenCalled();
  });
});
