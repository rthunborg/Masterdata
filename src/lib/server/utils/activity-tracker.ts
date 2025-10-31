import { createClient } from '@supabase/supabase-js';

const ACTIVITY_UPDATE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Updates user's last_active_at timestamp if threshold has passed.
 * Throttles updates to avoid excessive database writes.
 *
 * @param authUserId - Supabase auth user ID (from auth.users.id)
 * @returns Promise that resolves when update completes (or is skipped)
 *
 * @example
 * await updateUserActivity('auth-user-123');
 * // Updates only if > 5 minutes have passed since last activity
 */
export async function updateUserActivity(authUserId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS
  );

  // Fetch user from database to get current last_active_at
  const { data: dbUser, error: fetchError } = await supabase
    .from('users')
    .select('id, last_active_at')
    .eq('auth_user_id', authUserId)
    .single();

  if (fetchError || !dbUser) {
    // User not found in database - skip update
    return;
  }

  // Check if 5 minutes have passed since last activity
  const shouldUpdate = !dbUser.last_active_at || 
    (Date.now() - new Date(dbUser.last_active_at).getTime()) >= ACTIVITY_UPDATE_THRESHOLD_MS;

  if (shouldUpdate) {
    const { error } = await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', dbUser.id);

    if (error) {
      throw new Error(`Failed to update user activity: ${error.message}`);
    }
  }
}
