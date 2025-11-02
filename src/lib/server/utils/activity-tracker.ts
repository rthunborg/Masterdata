/**
 * Determines if user activity should be updated based on last active timestamp
 * @param lastActive - ISO timestamp of last activity or null if never active
 * @returns true if activity should be updated (null or >5 minutes ago)
 */
export function shouldUpdateActivity(lastActive: string | null): boolean {
  if (!lastActive) return true; // Never updated before

  const lastActiveTime = new Date(lastActive).getTime();
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;

  return now - lastActiveTime > fiveMinutesMs;
}
