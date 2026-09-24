const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:15421';
const GUARDED_APP_FIXTURE_API_URL = 'http://127.0.0.1:18421';

/** Keep unit probes on the explicitly selected guard-owned app fixture. */
export function selectLocalSupabaseTestUrl(environment: Record<string, string | undefined>) {
  return environment.EPIC_22_GUARD_MANAGED_FIXTURE === 'true' &&
    environment.NEXT_PUBLIC_SUPABASE_URL === GUARDED_APP_FIXTURE_API_URL
    ? GUARDED_APP_FIXTURE_API_URL
    : DEFAULT_LOCAL_API_URL;
}
