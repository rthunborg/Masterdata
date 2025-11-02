-- Add last_active_at column to users table
ALTER TABLE public.users ADD COLUMN last_active_at TIMESTAMPTZ;

-- Add index for efficient sorting
CREATE INDEX idx_users_last_active ON public.users(last_active_at DESC NULLS LAST);

-- Add column comment for documentation
COMMENT ON COLUMN public.users.last_active_at IS 'Timestamp of last authenticated request (updated by middleware)';
