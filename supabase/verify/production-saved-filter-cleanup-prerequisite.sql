-- Read-only evidence for the immutable saved-filter reconciliation guard.
-- This query deliberately returns aggregate counts only. It neither performs
-- cleanup nor asserts that a cleanup has been approved or completed.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

SELECT
  count(*)::bigint AS total,
  count(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1
      FROM auth.users AS auth_user
      WHERE auth_user.id = saved_filter.user_id
    )
  )::bigint AS orphan_auth_references,
  count(*) FILTER (WHERE char_length(saved_filter.name) = 0)::bigint AS empty_names,
  count(*) FILTER (WHERE char_length(saved_filter.name) > 50)::bigint AS overlength_names
FROM public.user_filters AS saved_filter;

COMMIT;
