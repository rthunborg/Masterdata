import { describe, expect, it, vi } from 'vitest';

import {
  POSTGRES_SYSTEM_IDENTIFIER_QUERY,
  assertGuardedPostgresSystemIdentifier,
  assertGuardedPostgresSystemIdentifierHash,
  createGuardedFixtureDatabase,
  createGuardedFixtureDatabaseWithHash,
  requireGuardedPostgresSystemIdentifier,
} from '../../../support/guarded-postgres-fixture.mjs';
import { createHash } from 'node:crypto';

const systemIdentifier = '7612345678901234567';
const systemIdentifierSha256 = createHash('sha256')
  .update(systemIdentifier, 'utf8')
  .digest('hex');

describe('guarded PostgreSQL fixture identity', () => {
  it.each([
    undefined,
    '',
    '  ',
    '0',
    '-1',
    '123abc',
    '0123',
    '12345678901234567890',
  ])(
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
      .mockResolvedValueOnce({
        rows: [{ system_identifier: systemIdentifier }],
      })
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
    ).rejects.toThrow(
      'Guarded PostgreSQL system identifier does not match the launcher record'
    );
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
  ])(
    'rejects an unreadable observed identity without issuing a write: %j',
    async (rows) => {
      const query = vi.fn().mockResolvedValue({ rows });

      await expect(
        createGuardedFixtureDatabase({
          adminClient: { query },
          expectedSystemIdentifier: systemIdentifier,
          databaseName: 'story_2215_cleanup_fixture',
        })
      ).rejects.toThrow(
        'Observed PostgreSQL system identifier is unavailable or invalid'
      );
      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(POSTGRES_SYSTEM_IDENTIFIER_QUERY);
    }
  );

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
    expect(query).toHaveBeenCalledExactlyOnceWith(
      POSTGRES_SYSTEM_IDENTIFIER_QUERY
    );
  });

  it('does not connect or issue a write when the launcher identifier is missing', async () => {
    const query = vi.fn();

    await expect(
      createGuardedFixtureDatabase({
        adminClient: { query },
        expectedSystemIdentifier: undefined,
        databaseName: 'story_2215_cleanup_fixture',
      })
    ).rejects.toThrow(
      'Expected guarded PostgreSQL system identifier is unavailable or invalid'
    );
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    'A'.repeat(64),
    'a'.repeat(63),
    'a'.repeat(65),
    'a'.repeat(63) + 'g',
  ])(
    'rejects a malformed expected SHA-256 before querying: %p',
    async (value) => {
      const query = vi.fn();

      await expect(
        assertGuardedPostgresSystemIdentifierHash({
          adminClient: { query },
          expectedSystemIdentifierSha256: value,
        })
      ).rejects.toThrow(
        'Expected guarded PostgreSQL system identifier SHA-256 is unavailable or invalid'
      );
      expect(query).not.toHaveBeenCalled();
    }
  );

  it.each([
    [],
    [{ system_identifier: 7612345678901234567 }],
    [{ system_identifier: '0' }],
    [{ system_identifier: '7612345678901234567; DROP DATABASE postgres' }],
    [
      { system_identifier: systemIdentifier },
      { system_identifier: systemIdentifier },
    ],
  ])(
    'rejects a malformed observed identity before hashing: %j',
    async (rows) => {
      const query = vi.fn().mockResolvedValue({ rows });

      await expect(
        assertGuardedPostgresSystemIdentifierHash({
          adminClient: { query },
          expectedSystemIdentifierSha256: systemIdentifierSha256,
        })
      ).rejects.toThrow(
        'Observed PostgreSQL system identifier is unavailable or invalid'
      );
      expect(query).toHaveBeenCalledExactlyOnceWith(
        POSTGRES_SYSTEM_IDENTIFIER_QUERY
      );
    }
  );

  it('returns only the matching SHA-256 for every fresh fixture connection', async () => {
    const firstConnection = {
      query: vi.fn().mockResolvedValue({
        rows: [{ system_identifier: systemIdentifier }],
      }),
    };
    const secondConnection = {
      query: vi.fn().mockResolvedValue({
        rows: [{ system_identifier: systemIdentifier }],
      }),
    };

    await expect(
      assertGuardedPostgresSystemIdentifierHash({
        adminClient: firstConnection,
        expectedSystemIdentifierSha256: systemIdentifierSha256,
      })
    ).resolves.toBe(systemIdentifierSha256);
    await expect(
      assertGuardedPostgresSystemIdentifierHash({
        adminClient: secondConnection,
        expectedSystemIdentifierSha256: systemIdentifierSha256,
      })
    ).resolves.toBe(systemIdentifierSha256);
    expect(firstConnection.query).toHaveBeenCalledExactlyOnceWith(
      POSTGRES_SYSTEM_IDENTIFIER_QUERY
    );
    expect(secondConnection.query).toHaveBeenCalledExactlyOnceWith(
      POSTGRES_SYSTEM_IDENTIFIER_QUERY
    );
  });

  it('redacts query failures and does not leak raw errors or system identifiers', async () => {
    const rawError = new Error(`password=unredacted ${systemIdentifier}`);
    const query = vi.fn().mockRejectedValue(rawError);

    const result = await assertGuardedPostgresSystemIdentifierHash({
      adminClient: { query },
      expectedSystemIdentifierSha256: systemIdentifierSha256,
    }).catch((error) => error);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(
      'Observed PostgreSQL system identifier is unavailable or invalid'
    );
    expect(result.message).not.toContain('password=unredacted');
    expect(result.message).not.toContain(systemIdentifier);
  });

  it('rejects a SHA-256 mismatch without exposing either value or creating a database', async () => {
    const observedSystemIdentifier = '7612345678901234568';
    const query = vi.fn().mockResolvedValue({
      rows: [{ system_identifier: observedSystemIdentifier }],
    });

    const result = await createGuardedFixtureDatabaseWithHash({
      adminClient: { query },
      expectedSystemIdentifierSha256: systemIdentifierSha256,
      databaseName: 'story_2215_hash_fixture',
    }).catch((error) => error);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(
      'Guarded PostgreSQL system identifier SHA-256 does not match the launcher record'
    );
    expect(result.message).not.toContain(systemIdentifierSha256);
    expect(result.message).not.toContain(observedSystemIdentifier);
    expect(query).toHaveBeenCalledExactlyOnceWith(
      POSTGRES_SYSTEM_IDENTIFIER_QUERY
    );
  });

  it('rejects an injected database name before querying or creating a database', async () => {
    const query = vi.fn();

    await expect(
      createGuardedFixtureDatabaseWithHash({
        adminClient: { query },
        expectedSystemIdentifierSha256: systemIdentifierSha256,
        databaseName: 'fixture; DROP DATABASE postgres',
      })
    ).rejects.toThrow(
      'Guarded fixture database name is unavailable or invalid'
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('hash-checks a fixture database before issuing CREATE DATABASE', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ system_identifier: systemIdentifier }],
      })
      .mockResolvedValueOnce({ rows: [] });

    await createGuardedFixtureDatabaseWithHash({
      adminClient: { query },
      expectedSystemIdentifierSha256: systemIdentifierSha256,
      databaseName: 'story_2215_hash_fixture',
    });

    expect(query).toHaveBeenNthCalledWith(1, POSTGRES_SYSTEM_IDENTIFIER_QUERY);
    expect(query).toHaveBeenNthCalledWith(
      2,
      'CREATE DATABASE story_2215_hash_fixture TEMPLATE template0'
    );
  });
});
