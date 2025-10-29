-- Migration: Add JSONB key removal function
-- Description: Creates database function to remove keys from JSONB data columns in party-specific tables
-- Created: 2025-10-29
-- Purpose: Support column deletion by removing custom column data from all party data tables

-- Create function to remove a JSONB key from a specific table's data column
CREATE OR REPLACE FUNCTION remove_jsonb_key(
  table_name TEXT,
  key_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Execute dynamic UPDATE to remove the key from the JSONB data column
  EXECUTE format(
    'UPDATE %I SET data = data - %L WHERE data ? %L',
    table_name,
    key_name,
    key_name
  );
  
  -- Get the number of affected rows
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (will be restricted by RLS in API)
GRANT EXECUTE ON FUNCTION remove_jsonb_key(TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION remove_jsonb_key(TEXT, TEXT) IS 
  'Removes a specified key from the JSONB data column in a party-specific table. Used when deleting custom columns.';
