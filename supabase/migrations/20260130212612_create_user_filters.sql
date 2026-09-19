-- Migration: Create user_filters table for Story 20.6
-- Description: Allow users to save frequently-used filter combinations with custom names

-- Create user_filters table
CREATE TABLE user_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_filter_name UNIQUE (user_id, name),
  CONSTRAINT valid_name_length CHECK (char_length(name) > 0 AND char_length(name) <= 50)
);

-- Index for faster lookups by user
CREATE INDEX idx_user_filters_user_id ON user_filters(user_id);

-- Index for name searches (case-insensitive)
CREATE INDEX idx_user_filters_name ON user_filters(user_id, LOWER(name));

-- Enable Row Level Security
ALTER TABLE user_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own filters
CREATE POLICY "Users can view their own filters"
  ON user_filters FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own filters
CREATE POLICY "Users can create their own filters"
  ON user_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own filters
CREATE POLICY "Users can update their own filters"
  ON user_filters FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own filters
CREATE POLICY "Users can delete their own filters"
  ON user_filters FOR DELETE
  USING (auth.uid() = user_id);

-- Create or use existing updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_filters
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Add helpful comment
COMMENT ON TABLE user_filters IS 'Stores user-defined filter combinations for quick reuse (Story 20.6)';
COMMENT ON COLUMN user_filters.filters IS 'JSONB array of FilterState objects matching src/lib/types/filter.ts';
COMMENT ON COLUMN user_filters.name IS 'User-friendly name for the filter (max 50 chars, unique per user)';
