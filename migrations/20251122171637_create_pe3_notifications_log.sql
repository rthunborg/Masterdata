-- Migration: Create PE3 Notifications Log Table
-- Story: 14.2 - PE3 Deadline Notifications
-- Creates table to track sent PE3 deadline notifications for idempotency

-- Create pe3_notifications_log table
CREATE TABLE IF NOT EXISTS public.pe3_notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deadline_type TEXT NOT NULL CHECK (deadline_type IN ('submit', 'cancel')),
  deadline_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate notifications per deadline type/date
ALTER TABLE public.pe3_notifications_log
ADD CONSTRAINT pe3_notifications_log_unique_deadline
UNIQUE (deadline_type, deadline_date);

-- Add index on deadline_date for query performance
CREATE INDEX idx_pe3_notifications_log_deadline_date
ON public.pe3_notifications_log(deadline_date);

-- Add index on sent_at for audit queries
CREATE INDEX idx_pe3_notifications_log_sent_at
ON public.pe3_notifications_log(sent_at);

-- Add column comments for documentation
COMMENT ON TABLE public.pe3_notifications_log IS
  'Tracks sent PE3 deadline notifications to ensure idempotency (one email per deadline type per day)';

COMMENT ON COLUMN public.pe3_notifications_log.deadline_type IS
  'Type of deadline: submit or cancel';

COMMENT ON COLUMN public.pe3_notifications_log.deadline_date IS
  'The date of the deadline (YYYY-MM-DD)';

COMMENT ON COLUMN public.pe3_notifications_log.sent_at IS
  'Timestamp when the notification was sent';

-- Verify table was created successfully
DO $$
DECLARE
  table_exists BOOLEAN;
  constraint_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pe3_notifications_log'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Failed to create pe3_notifications_log table';
  END IF;
  
  -- Check unique constraint exists
  SELECT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'pe3_notifications_log_unique_deadline'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Failed to create unique constraint on pe3_notifications_log';
  END IF;
  
  -- Check indexes exist (should have 3: primary key + 2 custom indexes)
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'pe3_notifications_log';
  
  IF index_count < 3 THEN
    RAISE EXCEPTION 'Failed to create all indexes on pe3_notifications_log';
  END IF;
  
  RAISE NOTICE 'pe3_notifications_log table created successfully';
END $$;

