-- Migration: Add Admin Limited Role
-- Description: Adds the 'admin_limited' role (displayed as "Administratör" in UI)
--              with view permissions matching hr_admin/recruiter
--              but restricted edit permissions (checklist items + loneniva only)
-- Date: 2026-01-19
-- Run manually in Supabase SQL Editor or via psql
--
-- NOTE: The 'role' column in the 'users' table is stored as TEXT, not a PostgreSQL enum.
--       Role validation is handled at the application level. This migration only updates
--       the column_config table to include admin_limited view permissions.

-- ============================================================================
-- STEP 1: Update all column_config rows to include admin_limited permissions
--         - View: Same as hr_admin (copy hr_admin's view permission)
--         - Edit: Always false (edit logic handled in application code)
-- ============================================================================

UPDATE column_config
SET role_permissions = role_permissions || jsonb_build_object(
    'admin_limited', jsonb_build_object(
        'view', COALESCE((role_permissions->'hr_admin'->>'view')::boolean, false),
        'edit', false
    )
)
WHERE NOT (role_permissions ? 'admin_limited');

-- ============================================================================
-- STEP 2: Verify the migration
-- ============================================================================

-- Show count of updated columns
SELECT
    COUNT(*) as total_columns_updated,
    COUNT(*) FILTER (WHERE (role_permissions->'admin_limited'->>'view')::boolean = true) as columns_with_view_access
FROM column_config
WHERE role_permissions ? 'admin_limited';

-- Optional: Show sample of updated permissions for verification
-- SELECT
--     column_name,
--     role_permissions->'admin_limited' as admin_limited_perms,
--     role_permissions->'hr_admin' as hr_admin_perms
-- FROM column_config
-- LIMIT 10;
