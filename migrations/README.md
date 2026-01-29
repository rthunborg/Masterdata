# Database Migrations

This directory contains SQL migration files for the Masterdata application.

## Available Migrations

### add_changed_by_tracking.sql

**Purpose:** Adds user tracking to the `employee_column_changes` audit table.

**What it does:**
- Updates the `track_employee_column_changes()` trigger function to capture `auth.uid()` 
- Stores the authenticated user's UUID in the `changed_by` field
- Allows you to track which user made changes to employee columns

**When to apply:** 
- Apply this migration if the `changed_by` field in `employee_column_changes` table is currently null
- This enables full audit trail of who changed what columns

## How to Apply Migrations

### Option 1: Via Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of the migration file (e.g., `add_changed_by_tracking.sql`)
5. Paste into the editor
6. Click **Run** to execute

### Option 2: Via Supabase CLI

```bash
supabase db execute --file migrations/add_changed_by_tracking.sql
```

### Option 3: Via npm script

```bash
pnpm migration:changed-by
```

This will display the SQL that needs to be run manually in the Supabase SQL Editor.

## Testing After Migration

After applying the migration, you can test that it's working:

1. Update an employee field via the UI or API
2. Query the `employee_column_changes` table:

```sql
SELECT 
  ec.*,
  u.email as changed_by_email
FROM employee_column_changes ec
LEFT JOIN users u ON ec.changed_by = u.auth_user_id
ORDER BY ec.changed_at DESC
LIMIT 10;
```

3. Verify that `changed_by` now contains the user's UUID (not null)
4. Verify that it matches the `auth_user_id` from the `users` table

## Schema Reference

### employee_column_changes table

| Column       | Type      | Description                                      |
|--------------|-----------|--------------------------------------------------|
| id           | UUID      | Primary key                                      |
| employee_id  | UUID      | Reference to employees table                     |
| column_name  | TEXT      | Name of the column that changed                  |
| changed_at   | TIMESTAMP | When the change occurred                         |
| changed_by   | UUID      | UUID of the authenticated user who made the change (references users.auth_user_id) |

## Troubleshooting

### "changed_by is still null after migration"

- Ensure you applied the migration successfully
- Check that the trigger was recreated: 
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'employee_column_changes_trigger';
  ```
- Verify the function exists:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'track_employee_column_changes';
  ```

### "Permission denied" errors

- Ensure the migration is run with appropriate database permissions
- The service role key should have sufficient privileges

## Migration History

| Date       | Migration                    | Description                              |
|------------|------------------------------|------------------------------------------|
| 2026-01-29 | add_changed_by_tracking.sql  | Add user tracking to column changes      |
