-- Add dietary requirements columns to employees table
-- Use IF NOT EXISTS to prevent errors if running multiple times/updates
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS special_diet BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS diet_details TEXT;

-- Add comment for documentation
COMMENT ON COLUMN employees.special_diet IS 'Whether the employee has special dietary requirements';
COMMENT ON COLUMN employees.diet_details IS 'Details of the dietary requirements (mandatory if special_diet is true)';

-- Add entries to column_config if they don't exist
INSERT INTO column_config (column_name, db_column_name, column_type, is_masterdata, role_permissions, display_order)
SELECT 'Specialkost', 'special_diet', 'boolean', true, '{"hr_admin": {"view": true, "edit": true}, "omc": {"view": true, "edit": false}, "crewing": {"view": true, "edit": false}, "recruiter": {"view": true, "edit": false}, "sodexo": {"view": true, "edit": false}}', 110
WHERE NOT EXISTS (
    SELECT 1 FROM column_config WHERE db_column_name = 'special_diet'
);

INSERT INTO column_config (column_name, db_column_name, column_type, is_masterdata, role_permissions, display_order)
SELECT 'Diet', 'diet_details', 'text', true, '{"hr_admin": {"view": true, "edit": true}, "omc": {"view": true, "edit": false}, "crewing": {"view": true, "edit": false}, "recruiter": {"view": true, "edit": false}, "sodexo": {"view": true, "edit": false}}', 111
WHERE NOT EXISTS (
    SELECT 1 FROM column_config WHERE db_column_name = 'diet_details'
);

-- Update permissions if they already exist (to ensure Sodexo is included if run previously without it)
UPDATE column_config
SET role_permissions = '{"hr_admin": {"view": true, "edit": true}, "omc": {"view": true, "edit": false}, "crewing": {"view": true, "edit": false}, "recruiter": {"view": true, "edit": false}, "sodexo": {"view": true, "edit": false}}'::jsonb
WHERE db_column_name IN ('special_diet', 'diet_details');
