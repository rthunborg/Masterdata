/*
  # Update User Role Check Constraint

  1. Drop existing check constraint on `users.role`
  2. Add new check constraint including 'recruiter' and 'crewing'
*/

DO $$
DECLARE
    con_name text;
BEGIN
    -- Find the name of the check constraint on the role column
    SELECT con.conname INTO con_name
    FROM pg_catalog.pg_constraint con
    INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'users'
      AND con.contype = 'c'
      -- Look for a constraint that involves the role column
      AND pg_get_constraintdef(con.oid) LIKE '%role%';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(con_name);
    END IF;
END $$;

-- Add the new constraint with all roles
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('hr_admin', 'recruiter', 'crewing', 'sodexo', 'omc', 'payroll', 'toplux'));

