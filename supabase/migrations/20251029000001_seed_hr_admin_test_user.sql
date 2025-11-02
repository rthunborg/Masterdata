-- Migration: Seed HR Admin Test User
-- Description: Creates HR Admin test account for development/testing
-- Created: 2025-10-29
-- IMPORTANT: This is a test account for development only. Do not use in production.

-- Test Credentials:
-- admin@test.com / Test123!

-- This migration is idempotent - can be run multiple times without creating duplicates

-- Function to create HR Admin test user (auth + public user records)
CREATE OR REPLACE FUNCTION create_hr_admin_test_user(
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

    RAISE NOTICE 'Created HR Admin test user: % with role: %', p_email, p_role;
  ELSE
    RAISE NOTICE 'HR Admin test user already exists: %', p_email;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create HR Admin test user
SELECT create_hr_admin_test_user('admin@test.com', 'Test123!', 'hr_admin');

-- Clean up the temporary function
DROP FUNCTION create_hr_admin_test_user(TEXT, TEXT, TEXT);
