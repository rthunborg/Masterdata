BEGIN;

-- =============================================================
-- Story 21.1: Staffing Needs Tables & Permission Migration
-- =============================================================

-- 1) Create staffing_needs table
CREATE TABLE staffing_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL UNIQUE CHECK (location IN ('Trelleborg', 'Göteborg')),
  headcount_need integer NOT NULL DEFAULT 0 CHECK (headcount_need >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- 2) Create staffing_needs_changelog table
CREATE TABLE staffing_needs_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  old_value integer NOT NULL,
  new_value integer NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Index on changelog for efficient location + time queries
CREATE INDEX idx_staffing_needs_changelog_location_date
  ON staffing_needs_changelog (location, changed_at DESC);

-- 4) Enable RLS on both tables
ALTER TABLE staffing_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_needs_changelog ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies for staffing_needs
CREATE POLICY staffing_needs_select
  ON staffing_needs FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY staffing_needs_update
  ON staffing_needs FOR UPDATE
  USING (get_user_role() IN ('hr_admin', 'crewing'));

-- 6) RLS policies for staffing_needs_changelog
CREATE POLICY staffing_needs_changelog_select
  ON staffing_needs_changelog FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY staffing_needs_changelog_insert
  ON staffing_needs_changelog FOR INSERT
  WITH CHECK (get_user_role() IN ('hr_admin', 'crewing'));

-- 7) Seed staffing_needs with two location rows
INSERT INTO staffing_needs (location, headcount_need, updated_at, updated_by)
VALUES
  ('Trelleborg', 0, now(), NULL),
  ('Göteborg', 0, now(), NULL);

-- 8) Revoke Crewing edit permission on crewing_done column
UPDATE column_config
SET role_permissions = jsonb_set(
  role_permissions,
  '{crewing}',
  '{"view": true, "edit": false}'::jsonb
)
WHERE db_column_name = 'crewing_done';

COMMIT;
