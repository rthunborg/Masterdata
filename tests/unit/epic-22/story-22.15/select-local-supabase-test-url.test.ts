import { describe, expect, it } from 'vitest';
import { selectLocalSupabaseTestUrl } from '../../../support/select-local-supabase-test-url';

describe('local Supabase test URL selection', () => {
  it('retains only the exact guard-owned app fixture URL when selected', () => {
    expect(selectLocalSupabaseTestUrl({
      EPIC_22_GUARD_MANAGED_FIXTURE: 'true',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:18421',
    })).toBe('http://127.0.0.1:18421');
  });

  it.each([
    [{}, 'http://127.0.0.1:15421'],
    [{ EPIC_22_GUARD_MANAGED_FIXTURE: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://hosted.example' }, 'http://127.0.0.1:15421'],
    [{ EPIC_22_GUARD_MANAGED_FIXTURE: 'false', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:18421' }, 'http://127.0.0.1:15421'],
  ])('uses the configured local default without an exact guard fixture selection', (environment, expected) => {
    expect(selectLocalSupabaseTestUrl(environment)).toBe(expected);
  });
});
