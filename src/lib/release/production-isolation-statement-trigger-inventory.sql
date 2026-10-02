-- Aggregate-only prerequisite for the fixed empty-array Data API denial probe.
-- It is deliberately separate from the later database/drain interval.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

SELECT jsonb_build_object(
  'relationExists', to_regclass('public.employees') IS NOT NULL,
  'statementTriggerInventoryComplete', true,
  'enabledStatementTriggerCount', count(*) FILTER (
    WHERE trigger_row.tgenabled <> 'D'
      AND (trigger_row.tgtype & 1) = 0
  )
)::text
FROM pg_trigger AS trigger_row
WHERE trigger_row.tgrelid = to_regclass('public.employees');

ROLLBACK;
