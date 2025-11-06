-- Migration: Update remove_jsonb_key function for new architecture
-- Description: Updates function to work with employees.custom_data instead of party tables
-- Created: 2025-11-06
-- Purpose: Support custom column deletion from employees.custom_data JSONB column
-- Related: Story 9.2 - Consolidate Custom Column Data

-- Replace function to work with employees table
CREATE OR REPLACE FUNCTION remove_jsonb_key(
  table_name TEXT,
  key_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
  column_name TEXT;
BEGIN
  -- SECURITY: Whitelist allowed tables to prevent SQL injection
  -- Now only employees table has custom data
  IF table_name = 'employees' THEN
    column_name := 'custom_data';
  ELSE
    RAISE EXCEPTION 'Invalid table name: %. Only employees table can be modified.', table_name
      USING HINT = 'Allowed tables: employees';
  END IF;

  -- Execute dynamic UPDATE to remove the key from the JSONB column
  -- %I provides identifier quoting, %L provides literal quoting (prevents injection)
  EXECUTE format(
    'UPDATE %I SET %I = %I - %L WHERE %I ? %L',
    table_name,
    column_name,
    column_name,
    key_name,
    column_name,
    key_name
  );
  
  -- Get the number of affected rows for audit logging
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment with new architecture details
COMMENT ON FUNCTION remove_jsonb_key(TEXT, TEXT) IS 
  'Removes a specified key from the JSONB custom_data column in employees table. 
   SECURITY: Table parameter is whitelisted to prevent SQL injection. 
   Only callable by service_role - API routes must authenticate HR Admin before invoking.
   Used when deleting custom columns via DELETE /api/admin/columns/[id].';
