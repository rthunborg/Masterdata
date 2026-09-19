/**
 * Shared non-production execution detection.
 *
 * Single source of truth for "is this a non-production runtime?" — originally
 * introduced for the Story 22.2 Supabase guard and now also consumed by the
 * Story 22.11 email-delivery fail-safe. Keep ONE definition; both callers
 * import from here so the recognized env markers never drift.
 */

export type GuardEnv = Record<string, string | undefined>;

export const NON_PRODUCTION_ENV_VALUES = new Set([
  "development",
  "test",
  "staging",
  "preview",
  "presentation",
]);

export function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function isTruthyFlag(value: string | undefined) {
  return ["1", "true", "yes"].includes(normalize(value));
}

export function isNonProductionExecution(env: GuardEnv) {
  const environmentValues = [
    env.NODE_ENV,
    env.APP_ENV,
    env.NEXT_PUBLIC_APP_ENV,
    env.VERCEL_ENV,
    env.DEPLOYMENT_ENV,
    env.NEXT_PUBLIC_DEPLOYMENT_ENV,
  ].map(normalize);

  return (
    environmentValues.some((value) => NON_PRODUCTION_ENV_VALUES.has(value)) ||
    isTruthyFlag(env.NEXT_PUBLIC_IS_STAGING) ||
    isTruthyFlag(env.IS_STAGING) ||
    isTruthyFlag(env.PRESENTATION_ENV) ||
    isTruthyFlag(env.NEXT_PUBLIC_PRESENTATION_ENV)
  );
}
