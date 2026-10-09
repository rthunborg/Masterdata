-- Counts describe the connected database only. No binary attribution or future
-- inability to install a job substrate is inferred from a worker's name.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
WITH core_types(name) AS (
 VALUES ('client backend'), ('autovacuum launcher'), ('autovacuum worker'),
 ('background worker'), ('background writer'), ('checkpointer'),
 ('logical replication launcher'), ('startup'), ('walreceiver'), ('walsender')
), candidates AS (
 SELECT backend_type FROM pg_stat_activity
 WHERE datname=current_database()
 AND NOT EXISTS(SELECT 1 FROM core_types WHERE name=backend_type)
)
SELECT jsonb_build_object(
 'managedBackendProfileMd5',(SELECT md5(coalesce(string_agg(backend_type,E'\x1e' ORDER BY backend_type),'')) FROM candidates
   WHERE backend_type='pg_cron launcher' OR backend_type ~ '^pg_net [0-9]+\.[0-9]+\.[0-9]+ worker$'),
 'cronLauncherCount',(SELECT count(*)::int FROM candidates WHERE backend_type='pg_cron launcher'),
 'netWorkerCount',(SELECT count(*)::int FROM candidates WHERE backend_type ~ '^pg_net [0-9]+\.[0-9]+\.[0-9]+ worker$'),
 'otherCandidateBackendCount',(SELECT count(*)::int FROM candidates WHERE backend_type<>'pg_cron launcher' AND backend_type !~ '^pg_net [0-9]+\.[0-9]+\.[0-9]+ worker$'),
 'cronPreloaded',coalesce(current_setting('shared_preload_libraries',true),'') ~ '(^|,)[[:space:]]*pg_cron[[:space:]]*(,|$)',
 'netPreloaded',coalesce(current_setting('shared_preload_libraries',true),'') ~ '(^|,)[[:space:]]*pg_net[[:space:]]*(,|$)',
 'cronDatabaseMatchesConnected',coalesce(current_setting('cron.database_name',true)=current_database(),false),
 'netDatabaseMatchesConnected',coalesce(current_setting('pg_net.database_name',true)=current_database(),false),
 'cronLaunchActiveJobs',coalesce(current_setting('cron.launch_active_jobs',true)='on',false),
 'pgCronExtensionCount',(SELECT count(*)::int FROM pg_extension WHERE extname='pg_cron'),
 'pgNetExtensionCount',(SELECT count(*)::int FROM pg_extension WHERE extname='pg_net'),
 'cronJobTablePresent',to_regclass('cron.job') IS NOT NULL,
 'netRequestQueueTablePresent',to_regclass('net.http_request_queue') IS NOT NULL,
 'netResponseTablePresent',to_regclass('net._http_response') IS NOT NULL
)::text;
ROLLBACK;
