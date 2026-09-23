import { verifyConfiguredSupabaseTarget } from '../../../supabase/verify/verify-target-binding.mjs';

const PROJECT_REF = /^[a-z0-9]{20}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_RESPONSE_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

export const PRODUCTION_PLATFORM_CONFIG_MAX_RESPONSE_BYTES = MAX_RESPONSE_BYTES;
export const PRODUCTION_PLATFORM_CONFIG_TIMEOUT_MS = REQUEST_TIMEOUT_MS;

const ENDPOINTS = Object.freeze([
  Object.freeze({ kind: 'auth', path: 'config/auth' }),
  Object.freeze({ kind: 'realtime', path: 'config/realtime' }),
  Object.freeze({ kind: 'postgrest', path: 'postgrest' }),
]);

const AUTH_HOOKS = Object.freeze([
  'hook_custom_access_token_enabled',
  'hook_mfa_verification_attempt_enabled',
  'hook_password_verification_attempt_enabled',
  'hook_send_sms_enabled',
  'hook_send_email_enabled',
  'hook_before_user_created_enabled',
  'hook_after_user_created_enabled',
]);

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const descriptor of Object.values(
      Object.getOwnPropertyDescriptors(value)
    )) {
      if (Object.hasOwn(descriptor, 'value')) deepFreeze(descriptor.value);
    }
    Object.freeze(value);
  }
  return value;
};

const plainDataObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => descriptor.enumerable && Object.hasOwn(descriptor, 'value')
  );

const booleanOrUnknown = (value) => (typeof value === 'boolean' ? value : null);
const safeStatus = (value) =>
  Number.isSafeInteger(value) && value >= 100 && value <= 599 ? value : null;
const uint8Chunk = (value) =>
  Object.prototype.toString.call(value) === '[object Uint8Array]' &&
  Number.isSafeInteger(value.byteLength) &&
  value.byteLength >= 0;

function redactAuth(value) {
  const hooks = Object.fromEntries(
    AUTH_HOOKS.map((name) => [name, booleanOrUnknown(value[name])])
  );
  const keys = Object.keys(value);
  return {
    hooks,
    allKnownHooksObserved: AUTH_HOOKS.every(
      (name) => typeof value[name] === 'boolean'
    ),
    enabledKnownHookCount: Object.values(hooks).filter(
      (enabled) => enabled === true
    ).length,
    unknownHookCount: keys.filter(
      (name) => /^hook_.*_enabled$/u.test(name) && !AUTH_HOOKS.includes(name)
    ).length,
    unknownKeyCount: keys.filter((name) => !AUTH_HOOKS.includes(name)).length,
  };
}

function redactRealtime(value) {
  const keys = Object.keys(value);
  return {
    suspend: booleanOrUnknown(value.suspend),
    privateOnly: booleanOrUnknown(value.private_only),
    unknownKeyCount: keys.filter(
      (name) => name !== 'suspend' && name !== 'private_only'
    ).length,
  };
}

function redactPostgrest(value) {
  const configured = typeof value.db_schema === 'string';
  const schemas = configured
    ? value.db_schema
        .split(',')
        .map((schema) => schema.trim())
        .filter(Boolean)
    : [];
  return {
    schemaConfigurationObserved: configured,
    exposedSchemaCount: schemas.length,
    publicExposed: schemas.includes('public'),
    graphqlPublicExposed: schemas.includes('graphql_public'),
    otherSchemaCount: schemas.filter(
      (schema) => !['public', 'graphql_public', 'storage'].includes(schema)
    ).length,
    unknownKeyCount: Object.keys(value).filter((name) => name !== 'db_schema')
      .length,
  };
}

export function redactProductionPlatformConfig(kind, value) {
  if (!plainDataObject(value)) return null;
  if (kind === 'auth') return deepFreeze(redactAuth(value));
  if (kind === 'realtime') return deepFreeze(redactRealtime(value));
  if (kind === 'postgrest') return deepFreeze(redactPostgrest(value));
  return null;
}

async function cancelBody(response) {
  try {
    await response?.body?.cancel?.();
  } catch {
    // The receipt intentionally records no transport details.
  }
}

async function readCappedJson(response) {
  const reader = response?.body?.getReader?.();
  if (!reader) return null;
  const chunks = [];
  let total = 0;
  let complete = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        complete = true;
        break;
      }
      if (!uint8Chunk(value)) return null;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) return null;
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    } finally {
      bytes.fill(0);
    }
  } catch {
    return null;
  } finally {
    if (!complete) {
      try {
        await reader.cancel?.();
      } catch {
        // The receipt intentionally records no transport details.
      }
    }
    chunks.fill(null);
    try {
      reader.releaseLock?.();
    } catch {
      // The receipt intentionally records no transport details.
    }
  }
}

const unavailable = (httpStatus = null) =>
  deepFreeze({ observed: false, httpStatus });

function createRequestTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timer.unref?.();
  return Object.freeze({
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  });
}

function validTrustedInputs(projectRef, token, fetchImpl, now, workspace, environment, targetVerifier) {
  return (
    typeof projectRef === 'string' &&
    PROJECT_REF.test(projectRef) &&
    typeof workspace === 'string' && workspace.length > 0 &&
    environment?.EXPECTED_SUPABASE_ENVIRONMENT === 'production' &&
    environment.EXPECTED_SUPABASE_PROJECT_REF === projectRef &&
    SHA256.test(environment.EXPECTED_SUPABASE_TARGET_BINDING_SHA256 ?? '') &&
    typeof targetVerifier === 'function' &&
    typeof token === 'string' &&
    token.length > 0 &&
    token.length <= 4096 &&
    !/[\r\n]/u.test(token) &&
    typeof fetchImpl === 'function' &&
    now instanceof Date &&
    !Number.isNaN(now.getTime())
  );
}

/**
 * Collects a fixed, read-only and redacted projection of three Supabase
 * platform endpoints. It never grants an operational decision, and it never
 * returns the token, raw response, unknown values, or transport error details.
 */
export async function collectProductionPlatformConfig({
  projectRef,
  token,
  fetchImpl,
  now = new Date(),
  workspace = process.cwd(),
  environment = process.env,
  targetVerifier = verifyConfiguredSupabaseTarget,
} = {}) {
  const configurations = Object.fromEntries(
    ENDPOINTS.map(({ kind }) => [kind, unavailable()])
  );
  const receipt = {
    schemaVersion: 1,
    kind: 'production-platform-config-readonly',
    capturedAtUtc:
      now instanceof Date && !Number.isNaN(now.getTime())
        ? now.toISOString()
        : null,
    collectionSucceeded: false,
    hostedWriteAttempted: false,
    targetBindingSha256: null,
    configurations,
  };
  if (!validTrustedInputs(projectRef, token, fetchImpl, now, workspace, environment, targetVerifier)) {
    return deepFreeze(receipt);
  }
  try {
    if (await targetVerifier({ workspace, environment }) !== true) return deepFreeze(receipt);
  } catch {
    return deepFreeze(receipt);
  }
  receipt.targetBindingSha256 = environment.EXPECTED_SUPABASE_TARGET_BINDING_SHA256;

  for (const { kind, path } of ENDPOINTS) {
    let response;
    let timeout;
    try {
      timeout = createRequestTimeout();
      response = await fetchImpl(
        `https://api.supabase.com/v1/projects/${projectRef}/${path}`,
        {
          method: 'GET',
          redirect: 'error',
          headers: { Authorization: `Bearer ${token}` },
          signal: timeout.signal,
        }
      );
      const httpStatus = safeStatus(response?.status);
      if (
        !response ||
        response.redirected !== false ||
        response.ok !== true ||
        httpStatus === null ||
        httpStatus < 200 ||
        httpStatus >= 300
      ) {
        await cancelBody(response);
        configurations[kind] = unavailable(httpStatus);
        continue;
      }
      const redacted = redactProductionPlatformConfig(
        kind,
        await readCappedJson(response)
      );
      configurations[kind] = redacted
        ? deepFreeze({ observed: true, httpStatus, ...redacted })
        : unavailable(httpStatus);
    } catch {
      await cancelBody(response);
      configurations[kind] = unavailable();
    } finally {
      timeout?.clear();
    }
  }
  receipt.collectionSucceeded = Object.values(configurations).every(
    (configuration) => configuration.observed === true
  );
  return deepFreeze(receipt);
}
