-- Migration: Seed Test User Accounts for External Parties
-- Description: Creates test accounts for Sodexo, OMC, Payroll, and Toplux users for development/testing
-- Created: 2025-10-28
-- IMPORTANT: These are test accounts for development only. Do not use in production.

-- Test Credentials:
-- sodexo@test.com / Test123!
-- omc@test.com / Test123!
-- payroll@test.com / Test123!
-- toplux@test.com / Test123!

-- This migration is idempotent - can be run multiple times without creating duplicates

-- Function to create test user (auth + public user records)
CREATE OR REPLACE FUNCTION create_test_user(
  p_email TEXT,
  p_password TEXT,
  p_role TEXT
) RETURNS void AS $$
DECLARE
  v_auth_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user already exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_super_admin,
      last_sign_in_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')), -- Bcrypt hash
      NOW(),
      '',
      '',
      '',
      '',
      '{}',
      '{}',
      NOW(),
      NOW(),
      false,
      NULL
    )
    RETURNING id INTO v_auth_id;

    -- Insert corresponding record in public.users table
    INSERT INTO public.users (auth_user_id, email, role, is_active)
    VALUES (v_auth_id, p_email, p_role, true);

    RAISE NOTICE 'Created test user: % with role: %', p_email, p_role;
  ELSE
    RAISE NOTICE 'Test user already exists: %', p_email;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create test users
SELECT create_test_user('sodexo@test.com', 'Test123!', 'sodexo');
SELECT create_test_user('omc@test.com', 'Test123!', 'omc');
SELECT create_test_user('payroll@test.com', 'Test123!', 'payroll');
SELECT create_test_user('toplux@test.com', 'Test123!', 'toplux');

-- Clean up the temporary function
DROP FUNCTION create_test_user(TEXT, TEXT, TEXT);
