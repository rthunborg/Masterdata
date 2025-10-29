-- Migration: Add RLS Policies for User Management
-- Description: Adds INSERT and UPDATE Row Level Security policies for HR Admin role on users table
-- Created: 2025-10-29
-- Story: 5.1 - User Account Management Interface
-- Purpose: Implements defense-in-depth security by enforcing RLS policies at database level
--          in addition to application-level authorization checks

-- Context: The initial schema (20251027000000_initial_schema.sql) created the users table
-- with RLS enabled but only included SELECT policies. This migration adds the missing
-- INSERT and UPDATE policies to ensure HR Admins can create and modify user accounts
-- while preventing unauthorized access at the database level.

-----------------------------------
-- RLS Policy: HR Admin can insert users
-----------------------------------
CREATE POLICY "HR Admin can insert users" ON public.users
  FOR INSERT 
  WITH CHECK (get_user_role() = 'hr_admin');

COMMENT ON POLICY "HR Admin can insert users" ON public.users IS 
  'Allows HR Admin role to create new user accounts. Used by POST /api/admin/users endpoint.';

-----------------------------------
-- RLS Policy: HR Admin can update users
-----------------------------------
CREATE POLICY "HR Admin can update users" ON public.users
  FOR UPDATE 
  USING (get_user_role() = 'hr_admin');

COMMENT ON POLICY "HR Admin can update users" ON public.users IS 
  'Allows HR Admin role to modify existing user accounts (e.g., activate/deactivate). Used by PATCH /api/admin/users/[id] endpoint.';

-- Note: DELETE policy intentionally omitted
-- Users should be deactivated (is_active = false) rather than deleted to maintain audit trail
-- and referential integrity with related records.
