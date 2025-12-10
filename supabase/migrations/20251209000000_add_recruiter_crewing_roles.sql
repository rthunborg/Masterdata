/*
  # Add New User Roles and Update Permissions

  1. New Roles:
    - `recruiter`: Internal role with full employee edit access but no settings access
    - `crewing`: External role with limited read-only field access

  2. Updates:
    - Update `UserRole` enum in application code (handled in TypeScript)
    - Add new roles to database check constraints if necessary
*/

-- 1. Grant 'recruiter' full view/edit access to all columns (mirroring HR Admin)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, role_permissions FROM column_config LOOP
        -- For Recruiter: Set full access (view: true, edit: true)
        -- This ensures they can "do all of the same things from those two views as HR Superusers"
        UPDATE column_config
        SET role_permissions = jsonb_set(
            role_permissions,
            '{recruiter}',
            '{"view": true, "edit": true}'::jsonb
        )
        WHERE id = r.id;
    END LOOP;
END $$;

-- 2. Grant 'crewing' limited view access
DO $$
DECLARE
    -- The allowed fields list based on user requirements:
    -- "Stena Data, ÖMC Date, First Name, Surname, Town District, Mobile, Email, Social Security No, Rank, Gender, Stena ID- Origo nummer and Crewing/Done"
    -- Maps to db_column_name values found in audit/code:
    allowed_fields text[] := ARRAY[
        'stena_date',        -- Stena Data (Date)
        'omc_date',          -- ÖMC Date
        'first_name',        -- First Name
        'surname',           -- Surname
        'town_district',     -- Town District
        'mobile',            -- Mobile
        'email',             -- Email
        'ssn',               -- Social Security No
        'rank',              -- Rank
        'gender',            -- Gender
        'origo',             -- Stena ID- Origo nummer (mapped from 'Origo' column_name -> 'origo' db_column_name)
        'crewing_done'       -- Crewing/Done
    ];
    r RECORD;
    col_name text;
BEGIN
    FOR r IN SELECT id, db_column_name, column_name, role_permissions FROM column_config LOOP
        -- Normalize db_column_name to handle potentially inconsistent casing, though db_column_name should be snake_case
        col_name := lower(r.db_column_name);

        -- Check if field is in allowed list
        -- Special handling for mapped names if needed, but 'origo' seems to cover 'Stena ID- Origo nummer' based on common patterns
        -- "Social Security No" is "ssn", "Stena Data" is likely "stena_date"
        
        IF col_name = ANY(allowed_fields) THEN
            -- Allow View, Deny Edit (Read-only)
             UPDATE column_config
            SET role_permissions = jsonb_set(
                role_permissions,
                '{crewing}',
                '{"view": true, "edit": false}'::jsonb
            )
            WHERE id = r.id;
        ELSE
            -- Deny View, Deny Edit
             UPDATE column_config
            SET role_permissions = jsonb_set(
                role_permissions,
                '{crewing}',
                '{"view": false, "edit": false}'::jsonb
            )
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
