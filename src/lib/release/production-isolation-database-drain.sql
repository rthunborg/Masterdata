-- Aggregate-only post-control drain observation. It returns no identifiers,
-- addresses, application names, query text, or row data. Every remaining
-- client backend is applicable: this query deliberately exempts no worker,
-- role, or application-name pattern. The worker binds the independent fixed
-- denial probe as the post-barrier attempt evidence.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

WITH sessions AS (
  SELECT backend_type, state, backend_xid
  FROM pg_stat_activity
  WHERE datname = current_database() AND pid <> pg_backend_pid()
), replication AS (
  SELECT count(*) FILTER (WHERE active)::bigint AS active_slot_count
  FROM pg_replication_slots
), subscriptions AS (
  SELECT count(*) FILTER (WHERE subenabled)::bigint AS enabled_count
  FROM pg_subscription
  WHERE subdbid = (SELECT oid FROM pg_database WHERE datname = current_database())
)
SELECT jsonb_build_object(
  'allApplicableSessionsObserved', true,
  'applicableApplicationSessionCount', count(*) FILTER (WHERE backend_type = 'client backend'),
  'inflightWriteCount', count(*) FILTER (WHERE backend_type = 'client backend' AND state <> 'idle' AND backend_xid IS NOT NULL),
  'preparedApplicationWriteCount', (SELECT count(*)::bigint FROM pg_prepared_xacts WHERE database = current_database()),
  'existingApplicationSessionCount', count(*) FILTER (WHERE backend_type = 'client backend'),
  'replicationSlotInventoryComplete', true,
  'activeReplicationSlotCount', (SELECT active_slot_count FROM replication),
  'subscriptionInventoryComplete', true,
  'enabledSubscriptionCount', (SELECT enabled_count FROM subscriptions)
)::text
FROM sessions;

ROLLBACK;
