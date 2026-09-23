import { describe, expect, it, vi } from 'vitest';

import {
  collectProductionPlatformConfig,
  PRODUCTION_PLATFORM_CONFIG_MAX_RESPONSE_BYTES,
  PRODUCTION_PLATFORM_CONFIG_TIMEOUT_MS,
} from '../../../../src/lib/release/production-platform-config.mjs';

const projectRef = 'abcdefghijklmnopqrst';
const targetBindingSha256 = 'f'.repeat(64);
const token = 'synthetic-trusted-token';
const now = new Date('2026-09-23T12:00:00.000Z');
const environment = Object.freeze({
  EXPECTED_SUPABASE_ENVIRONMENT: 'production',
  EXPECTED_SUPABASE_PROJECT_REF: projectRef,
  EXPECTED_SUPABASE_TARGET_BINDING_SHA256: targetBindingSha256,
});

const response = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const supportedResponses = () => [
  response({
    hook_custom_access_token_enabled: false,
    hook_mfa_verification_attempt_enabled: true,
    hook_unknown_enabled: true,
    private_value: 'must-not-appear',
  }),
  response({ suspend: false, secret: 'must-not-appear' }),
  response({ db_schema: 'public, graphql_public, storage, internal' }),
];

function collect(fetchImpl: typeof fetch) {
  return collectProductionPlatformConfig({
    projectRef, token, fetchImpl, now, workspace: 'C:/synthetic-review',
    environment, targetVerifier: async () => true,
  });
}

describe('Story 22.15 production platform configuration', () => {
  it('uses only the fixed read-only endpoint envelope and returns redacted primitives', async () => {
    const responses = supportedResponses();
    const fetchImpl = vi.fn(async () => responses.shift()!);

    const receipt = await collect(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
      `https://api.supabase.com/v1/projects/${projectRef}/config/realtime`,
      `https://api.supabase.com/v1/projects/${projectRef}/postgrest`,
    ]);
    for (const [, options] of fetchImpl.mock.calls) {
      expect(options).toMatchObject({
        method: 'GET',
        redirect: 'error',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
    expect(PRODUCTION_PLATFORM_CONFIG_TIMEOUT_MS).toBe(20_000);
    expect(receipt).toMatchObject({
      schemaVersion: 1,
      kind: 'production-platform-config-readonly',
      capturedAtUtc: now.toISOString(),
      collectionSucceeded: true,
      hostedWriteAttempted: false,
      targetBindingSha256,
      configurations: {
        auth: {
          observed: true,
          hooks: {
            hook_custom_access_token_enabled: false,
            hook_mfa_verification_attempt_enabled: true,
            hook_send_email_enabled: null,
          },
          allKnownHooksObserved: false,
          enabledKnownHookCount: 1,
          unknownHookCount: 1,
          unknownKeyCount: 2,
        },
        realtime: {
          observed: true,
          suspend: false,
          privateOnly: null,
          unknownKeyCount: 1,
        },
        postgrest: {
          observed: true,
          schemaConfigurationObserved: true,
          exposedSchemaCount: 4,
          publicExposed: true,
          graphqlPublicExposed: true,
          otherSchemaCount: 1,
        },
      },
    });
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain('must-not-appear');
    expect(serialized).not.toContain('private_value');
    expect(receipt.configurations.auth).not.toHaveProperty(
      'allKnownHooksDisabled'
    );
    expect(receipt.configurations.postgrest).not.toHaveProperty(
      'serviceDisabled'
    );
    expect(Object.isFrozen(receipt)).toBe(true);
  });

  it('does not treat missing auth or realtime booleans as disabled', async () => {
    const fetchImpl = vi.fn(async () => response({}));
    const receipt = await collect(fetchImpl);

    expect(receipt.configurations.auth).toMatchObject({
      observed: true,
      allKnownHooksObserved: false,
      enabledKnownHookCount: 0,
      hooks: { hook_send_sms_enabled: null },
    });
    expect(receipt.configurations.realtime).toMatchObject({
      observed: true,
      suspend: null,
      privateOnly: null,
    });
  });

  it('does not infer PostgREST service state from schema configuration', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith('/postgrest')
        ? response({ db_schema: 'internal' })
        : response({})
    );
    const receipt = await collect(fetchImpl);

    expect(receipt.configurations.postgrest).toMatchObject({
      observed: true,
      schemaConfigurationObserved: true,
      publicExposed: false,
      graphqlPublicExposed: false,
      otherSchemaCount: 1,
    });
    expect(receipt.configurations.postgrest).not.toHaveProperty(
      'serviceDisabled'
    );
  });

  it('fails closed for denied, oversized, redirected, or throwing responses', async () => {
    const denied = await collect(
      vi.fn(async (url: string) =>
        url.endsWith('/config/auth')
          ? response({ raw: 'denied' }, 401)
          : response({})
      )
    );
    expect(denied).toMatchObject({
      collectionSucceeded: false,
      configurations: { auth: { observed: false, httpStatus: 401 } },
    });
    expect(JSON.stringify(denied)).not.toContain('denied');

    const oversized = await collect(
      vi.fn(async (url: string) =>
        url.endsWith('/config/auth')
          ? new Response(
              new Uint8Array(PRODUCTION_PLATFORM_CONFIG_MAX_RESPONSE_BYTES + 1),
              { status: 200 }
            )
          : response({})
      )
    );
    expect(oversized).toMatchObject({
      collectionSucceeded: false,
      configurations: { auth: { observed: false, httpStatus: 200 } },
    });

    const streamCancel = vi.fn(async () => undefined);
    const streamFailure = await collect(
      vi.fn(async (url: string) =>
        url.endsWith('/config/auth')
          ? {
              status: 200,
              ok: true,
              redirected: false,
              body: {
                getReader: () => ({
                  read: async () => {
                    throw new Error('secret stream failure');
                  },
                  cancel: streamCancel,
                  releaseLock: vi.fn(),
                }),
              },
            }
          : response({})
      ) as typeof fetch
    );
    expect(streamFailure).toMatchObject({
      collectionSucceeded: false,
      configurations: { auth: { observed: false, httpStatus: 200 } },
    });
    expect(streamCancel).toHaveBeenCalledOnce();

    const shapeCancel = vi.fn(async () => undefined);
    const malformedShape = await collect(
      vi.fn(async (url: string) =>
        url.endsWith('/config/auth')
          ? {
              status: 0,
              ok: true,
              redirected: false,
              body: { cancel: shapeCancel },
            }
          : response({})
      ) as typeof fetch
    );
    expect(malformedShape).toMatchObject({
      collectionSucceeded: false,
      configurations: { auth: { observed: false, httpStatus: null } },
    });
    expect(shapeCancel).toHaveBeenCalledOnce();

    const cancel = vi.fn(async () => undefined);
    const redirected = await collect(
      vi.fn(async () => ({
        status: 302,
        ok: false,
        redirected: true,
        body: { cancel },
      })) as typeof fetch
    );
    expect(redirected.collectionSucceeded).toBe(false);
    expect(redirected.configurations.auth).toEqual({
      observed: false,
      httpStatus: 302,
    });
    expect(cancel).toHaveBeenCalled();

    const failed = await collect(
      vi.fn(async () => {
        throw new Error(`transport ${token} detail`);
      }) as typeof fetch
    );
    expect(failed.collectionSucceeded).toBe(false);
    expect(JSON.stringify(failed)).not.toContain(token);
    expect(JSON.stringify(failed)).not.toContain('transport');
  });

  it('rejects invalid trusted inputs without a request or diagnostic details', async () => {
    const fetchImpl = vi.fn();
    const receipt = await collectProductionPlatformConfig({
      projectRef: 'invalid',
      token,
      fetchImpl,
      now,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(receipt).toEqual({
      schemaVersion: 1,
      kind: 'production-platform-config-readonly',
      capturedAtUtc: now.toISOString(),
      collectionSucceeded: false,
      hostedWriteAttempted: false,
      targetBindingSha256: null,
      configurations: {
        auth: { observed: false, httpStatus: null },
        realtime: { observed: false, httpStatus: null },
        postgrest: { observed: false, httpStatus: null },
      },
    });
  });

  it('rejects a valid but wrong project before any platform read', async () => {
    const fetchImpl = vi.fn();
    const targetVerifier = vi.fn(async () => true);
    const receipt = await collectProductionPlatformConfig({
      projectRef: 'stagingprojectref000', token, fetchImpl, now,
      workspace: 'C:/synthetic-review', environment, targetVerifier,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(targetVerifier).not.toHaveBeenCalled();
    expect(receipt).toMatchObject({ collectionSucceeded: false, targetBindingSha256: null });
  });

  it('requires a successful reviewed target binding before requesting settings', async () => {
    const fetchImpl = vi.fn();
    const targetVerifier = vi.fn(async () => false);
    const receipt = await collectProductionPlatformConfig({
      projectRef, token, fetchImpl, now,
      workspace: 'C:/synthetic-review', environment, targetVerifier,
    });
    expect(targetVerifier).toHaveBeenCalledOnce();
    expect(targetVerifier).toHaveBeenCalledWith({
      workspace: 'C:/synthetic-review', environment,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(receipt).toMatchObject({ collectionSucceeded: false, targetBindingSha256: null });
  });
});
