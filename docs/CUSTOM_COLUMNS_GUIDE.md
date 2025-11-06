# Custom Columns Guide

## Overview

Starting with Story 9.3, custom columns are implemented as **real database table columns** on the `employees` table, not as JSONB key-value pairs. This provides better performance, type safety, and database features.

## Architecture

### Before (Story 9.2):

```sql
employees.custom_data = { "Sodexo_MealPlan": "Premium", "OMC_Training": true, ... }
```

### After (Story 9.3):

```sql
ALTER TABLE employees
ADD COLUMN sodexo_meal_plan TEXT,
ADD COLUMN omc_training_completed BOOLEAN;
```

## Benefits

✅ **Type Safety**: Database enforces column types (TEXT, INTEGER, BOOLEAN, DATE, NUMERIC)  
✅ **Better Performance**: Native B-tree indexes instead of GIN indexes  
✅ **Simpler Queries**: `SELECT first_name, sodexo_meal_plan FROM employees`  
✅ **Standard SQL**: No special JSONB operators needed  
✅ **Column Constraints**: Can add NOT NULL, CHECK, DEFAULT values

## Adding a New Custom Column

### Step 1: HR Admin Creates Column Definition (UI)

1. Navigate to **Admin → Column Settings**
2. Click **"Create New Column"**
3. Enter column details:
   - **Column Name**: Must be `snake_case` (e.g., `sodexo_meal_plan`, `omc_training_status`)
   - **Column Type**: text, number, date, or boolean
   - **Category**: Group columns by party (e.g., "Sodexo", "OMC")
4. Click **"Create Column"**

**Important**: The column definition is saved to `column_config` table, but the actual database column is not created yet. A deployment is required.

### Step 2: Developer Creates Migration

1. Copy the migration template:

   ```bash
   cp migrations/_TEMPLATE_add_custom_column.sql migrations/20251106120000_add_sodexo_meal_plan.sql
   ```

2. Edit the migration file:

   ```sql
   -- Replace placeholders
   {COLUMN_NAME} -> sodexo_meal_plan
   {SQL_TYPE} -> TEXT
   {DESCRIPTION} -> Meal plan assignment for Sodexo catering service
   {CATEGORY} -> Sodexo
   ```

3. Set role permissions in the `column_config` INSERT:

   ```json
   {
     "hr_admin": { "view": true, "edit": true },
     "sodexo": { "view": true, "edit": true },
     "omc": { "view": false, "edit": false },
     "payroll": { "view": false, "edit": false },
     "toplux": { "view": false, "edit": false }
   }
   ```

4. Apply migration locally:

   ```bash
   npx supabase migration up --local
   ```

5. Test locally, then deploy to production:
   ```bash
   git add migrations/20251106120000_add_sodexo_meal_plan.sql
   git commit -m "feat: Add sodexo_meal_plan custom column"
   git push
   ```

### Step 3: Deploy to Production

The migration will be automatically applied when deploying via Vercel + Supabase integration.

## Type Mapping

| UI Type   | PostgreSQL Type | Example Values        |
| --------- | --------------- | --------------------- |
| `text`    | `TEXT`          | "Premium", "Standard" |
| `number`  | `NUMERIC(20,2)` | 1234.56, 42           |
| `date`    | `DATE`          | '2025-11-06'          |
| `boolean` | `BOOLEAN`       | true, false           |

## Column Naming Convention

**Format**: `{party}_{descriptive_name}`

### Good Examples:

- `sodexo_meal_plan`
- `sodexo_accommodation_status`
- `omc_training_completed`
- `omc_certification_date`
- `payroll_bonus_amount`
- `payroll_tax_code`
- `toplux_vehicle_assigned`
- `toplux_license_expiry_date`

### Bad Examples:

- ❌ `Meal Plan` (spaces)
- ❌ `Hotel Required?` (special characters)
- ❌ `RoomNumber` (not snake_case)
- ❌ `select` (SQL reserved word)

## Validation Rules

- **Lowercase only**
- **Snake_case** (underscores, no spaces)
- **No SQL reserved words**
- **No special characters** except underscore
- **Max 63 characters** (PostgreSQL limit)
- **Must start with a letter**

## Deleting a Custom Column

### Step 1: HR Admin Deletes Column (UI)

1. Navigate to **Admin → Column Settings**
2. Find the custom column
3. Click **"Delete"**
4. Confirm deletion

**Important**: The column definition is removed from `column_config`, but the actual database column remains. A deployment is required to drop the column.

### Step 2: Developer Creates Migration

1. Copy the drop template:

   ```bash
   cp migrations/_TEMPLATE_drop_custom_column.sql migrations/20251106130000_drop_old_column.sql
   ```

2. Replace `{COLUMN_NAME}` with the column to drop

3. Apply migration locally and deploy

**WARNING**: Dropping a column permanently deletes all data in that column!

## Renaming a Custom Column

Column renaming requires a database migration:

```sql
ALTER TABLE employees RENAME COLUMN old_name TO new_name;

UPDATE column_config
SET column_name = 'new_name'
WHERE column_name = 'old_name' AND is_masterdata = false;
```

## Querying Custom Columns

### From Application Code:

```typescript
// Get columns user has permission to view
const visibleColumns = await getVisibleColumnsForRole(userRole);
const columnNames = visibleColumns.map((c) => c.column_name).join(', ');

const { data } = await supabase
  .from('employees')
  .select(`id, first_name, surname, ${columnNames}`)
  .eq('id', employeeId)
  .single();
```

### From SQL:

```sql
SELECT
  first_name,
  surname,
  sodexo_meal_plan,
  omc_training_completed
FROM employees
WHERE sodexo_meal_plan IS NOT NULL;
```

## Migration Template Reference

See:

- `migrations/_TEMPLATE_add_custom_column.sql`
- `migrations/_TEMPLATE_drop_custom_column.sql`

## Troubleshooting

### "Column already exists" Error

The column might already exist from a previous migration. Check:

```sql
\d employees  -- List columns
```

Solution: Use `ADD COLUMN IF NOT EXISTS` in migration.

### "Column not visible in UI"

1. Check `column_config` table:

   ```sql
   SELECT * FROM column_config WHERE column_name = 'your_column';
   ```

2. Verify role permissions allow viewing

3. Refresh application cache

### "Invalid column name" Validation Error

Column name must be `snake_case` with only letters, numbers, and underscores. Use the validation in the UI or run:

```typescript
import { toSnakeCase } from '@/lib/validation/column-validation';
const dbName = toSnakeCase('Meal Plan'); // -> "meal_plan"
```

## Rollback Procedure

### Emergency Rollback (If Story 9.3 Needs to be Reverted)

**WARNING**: This procedure reverts custom columns from real table columns back to JSONB architecture. Only use in emergency situations if Story 9.3 deployment causes critical production issues.

#### Prerequisites

- Access to Supabase SQL Editor or `psql`
- Backup of current database state
- List of all custom columns currently in production

#### Step 1: Backup Custom Column Data

```sql
-- Export all custom column data before rollback
COPY (
  SELECT
    id,
    first_name,
    surname,
    -- Add all custom column names here
    sodexo_meal_plan,
    omc_training_completed
    -- ... (list all custom columns)
  FROM employees
) TO '/tmp/custom_columns_backup.csv' WITH CSV HEADER;
```

#### Step 2: Restore JSONB Column

```sql
-- migrations/ROLLBACK_restore_jsonb_custom_columns.sql
BEGIN;

-- Re-add custom_data JSONB column
ALTER TABLE employees ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for JSONB queries
CREATE INDEX idx_employees_custom_data_gin ON employees USING GIN (custom_data);

-- Migrate data from real columns back to JSONB
-- Example for sodexo_meal_plan:
UPDATE employees
SET custom_data = jsonb_set(
  COALESCE(custom_data, '{}'::jsonb),
  '{sodexo_meal_plan}',
  to_jsonb(sodexo_meal_plan),
  true
)
WHERE sodexo_meal_plan IS NOT NULL;

-- Repeat for each custom column...

-- Drop real custom columns
ALTER TABLE employees DROP COLUMN IF EXISTS sodexo_meal_plan;
ALTER TABLE employees DROP COLUMN IF EXISTS omc_training_completed;
-- ... (drop all custom columns)

-- Restore custom column definitions in column_config
-- (Re-run migration: 20251102000004_seed_comprehensive_column_config.sql
--  or manually restore from backup)

COMMIT;
```

#### Step 3: Update Application Code

1. **Revert Repository Changes**:

   ```bash
   git revert <commit-hash-of-story-9.3>
   ```

2. **Restore CustomDataRepository** to JSONB queries:
   - Restore `src/lib/server/repositories/custom-data-repository.ts` to use JSONB operators
   - Restore API endpoints to use JSONB merge logic

3. **Deploy Rollback**:
   ```bash
   git push origin main
   # Supabase will automatically apply rollback migration
   # Vercel will deploy reverted application code
   ```

#### Step 4: Verify Rollback

```sql
-- Check JSONB column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name = 'custom_data';

-- Verify data migrated correctly
SELECT id, first_name, custom_data
FROM employees
LIMIT 5;

-- Check custom column definitions restored
SELECT COUNT(*) FROM column_config WHERE is_masterdata = false;
```

#### Step 5: Communicate to Stakeholders

- **HR Admin**: Custom columns are back to JSONB architecture
- **External Parties**: Custom data is preserved, no data loss
- **Dev Team**: Document rollback reason for retrospective

### Rollback Risks

⚠️ **Data Loss Risk**: If custom columns were added after Story 9.3 deployment, those column definitions and data will be lost during rollback  
⚠️ **Migration Complexity**: Manual data migration from real columns → JSONB is error-prone  
⚠️ **Downtime**: Rollback requires database migration and application redeployment (~5-10 minutes)

### Alternative: Forward Fix

Instead of full rollback, consider forward fixes:

- **Bug in migration**: Create new migration to fix specific issue
- **Missing column**: Add column via new migration
- **Data corruption**: Restore from backup, keep real column architecture

## Related Documentation

- [Architecture: Source Tree](architecture/source-tree.md)
- [PRD: Custom Columns Feature](prd.md)
- [Story 9.3: Refactor to Real Columns](stories/9.3.refactor-custom-columns-to-real-table-columns.md)
