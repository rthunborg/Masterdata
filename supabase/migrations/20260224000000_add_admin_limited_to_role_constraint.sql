/*
  # Add admin_limited to User Role Check Constraint

  The admin_limited role exists in application code but was missing from the
  database CHECK constraint on users.role, which would prevent creating
  admin_limited users at the database level.

  1. Drop existing check constraint on `users.role`
  2. Recreate with all 8 roles including 'admin_limited'
*/

DO $$
DECLARE
    con_name text;
BEGIN
    SELECT con.conname INTO con_name
    FROM pg_catalog.pg_constraint con
    INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'users'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%role%';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(con_name);
    END IF;
END $$;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('hr_admin', 'recruiter', 'admin_limited', 'crewing', 'sodexo', 'omc', 'payroll', 'toplux'));
