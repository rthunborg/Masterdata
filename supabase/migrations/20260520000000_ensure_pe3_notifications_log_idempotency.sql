-- Migration: Ensure PE3 notification log idempotency
-- Description: Creates and constrains PE3 deadline notification claims so concurrent cron invocations cannot duplicate sends.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.pe3_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_type TEXT NOT NULL,
  deadline_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pe3_notifications_log
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE public.pe3_notifications_log
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.pe3_notifications_log
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pe3_notifications_log'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.pe3_notifications_log
      ADD CONSTRAINT pe3_notifications_log_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.pe3_notifications_log
  ADD COLUMN IF NOT EXISTS deadline_type TEXT;

ALTER TABLE public.pe3_notifications_log
  ADD COLUMN IF NOT EXISTS deadline_date DATE;

ALTER TABLE public.pe3_notifications_log
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.pe3_notifications_log
SET sent_at = NOW()
WHERE sent_at IS NULL;

ALTER TABLE public.pe3_notifications_log
  ALTER COLUMN sent_at SET DEFAULT NOW(),
  ALTER COLUMN sent_at SET NOT NULL;

ALTER TABLE public.pe3_notifications_log
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.pe3_notifications_log
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE public.pe3_notifications_log
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.pe3_notifications_log
  ALTER COLUMN deadline_type SET NOT NULL,
  ALTER COLUMN deadline_date SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pe3_notifications_log_deadline_type_check'
      AND conrelid = 'public.pe3_notifications_log'::regclass
  ) THEN
    ALTER TABLE public.pe3_notifications_log
      ADD CONSTRAINT pe3_notifications_log_deadline_type_check
      CHECK (deadline_type IN ('submit', 'cancel'));
  END IF;
END $$;

DELETE FROM public.pe3_notifications_log existing
USING public.pe3_notifications_log duplicate
WHERE existing.deadline_type = duplicate.deadline_type
  AND existing.deadline_date = duplicate.deadline_date
  AND existing.ctid > duplicate.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pe3_notifications_log_unique_deadline
  ON public.pe3_notifications_log(deadline_type, deadline_date);

CREATE INDEX IF NOT EXISTS idx_pe3_notifications_log_sent_at
  ON public.pe3_notifications_log(sent_at);

COMMENT ON TABLE public.pe3_notifications_log IS
  'Tracks PE3 deadline notification claims and sent markers for submit/cancel cron jobs.';

COMMENT ON INDEX idx_pe3_notifications_log_unique_deadline IS
  'Prevents duplicate PE3 deadline notifications for the same type and date.';

ALTER TABLE public.pe3_notifications_log ENABLE ROW LEVEL SECURITY;
