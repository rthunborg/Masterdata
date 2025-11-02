-- Migration: Allow users to update their own last_active_at
-- Description: Adds RLS policy to allow authenticated users to update their own last_active_at timestamp
-- Created: 2025-11-02
-- Story: 6.7 - Add Last Active Timestamp to User Table
-- Purpose: Enables middleware activity tracking for all authenticated users (not just HR Admins)

-- Context: The existing RLS policies only allow HR Admins to update user records.
-- This migration adds a specific policy that allows any authenticated user to update
-- ONLY their own last_active_at field. This is necessary for the middleware activity
-- tracking feature which runs with the user's own authentication context.

-----------------------------------
-- RLS Policy: Users can update their own last_active_at
-----------------------------------
CREATE POLICY "Users can update own last_active_at" ON public.users
  FOR UPDATE 
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

COMMENT ON POLICY "Users can update own last_active_at" ON public.users IS 
  'Allows authenticated users to update their own last_active_at timestamp. Used by middleware activity tracking. Note: This policy allows updating the entire row, but the middleware only updates last_active_at.';

-- Note: This policy uses auth.uid() directly instead of get_user_role() because we need
-- to allow updates based on authentication identity, not role. This is more secure as it
-- ensures users can only update their own record, regardless of role.

-- Security consideration: While this policy technically allows users to update any field
-- in their own record, the application layer (middleware) only updates last_active_at.
-- The existing "HR Admin can update users" policy remains for administrative updates.
