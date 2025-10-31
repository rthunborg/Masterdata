-- Migration: Add last_active_at column to users table

-- Add last_active_at column
ALTER TABLE public.users ADD COLUMN last_active_at TIMESTAMPTZ;

-- Create index for query optimization (sorting by last active)
CREATE INDEX idx_users_last_active ON public.users(last_active_at);

-- NOTE: Column is nullable - no default value
-- NULL means user has never logged in or activity tracking wasn't implemented yet
