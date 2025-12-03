# Story 16.1: Create Employee Column Changes Audit Table

**Story:** As a system architect, I want to create a database table and trigger to track column-level changes to masterdata fields, so that we can detect which fields changed for which employees without storing duplicate data.

**Status:** pending  
**Epic:** Epic 16: Employee Data Change Notifications

---

## Acceptance Criteria

### Criterion 1: Audit Table Creation
- **Given** the database schema
- **When** the migration runs
- **Then** a new table `employee_column_changes` is created with columns:
  - `id` (UUID, primary key)
  - `employee_id` (UUID, foreign key to `employees.id`)
  - `column_name` (TEXT) - the `db_column_name` from `column_config` (e.g., 'first_name', 'email')
  - `changed_at` (TIMESTAMPTZ) - timestamp when change occurred
  - `changed_by` (UUID, nullable, foreign key to `users.id`) - who made the change (optional for GDPR)
- **And** appropriate indexes are created for query performance

### Criterion 2: Database Indexes
- **Given** the `employee_column_changes` table
- **When** indexes are created
- **Then** the following indexes exist:
  - Index on `changed_at` (for time-based queries)
  - Composite index on `(employee_id, column_name, changed_at)` (for employee-specific queries)
  - Index on `column_name` (for column-based filtering)

### Criterion 3: Update Trigger on Employees Table
- **Given** an UPDATE operation on the `employees` table
- **When** any masterdata column value changes
- **Then** a trigger function compares OLD vs NEW values for all masterdata columns
- **And** for each changed column, a row is inserted into `employee_column_changes`
- **And** `changed_at` is set to current timestamp
- **And** `changed_by` is set to the current user (if available from session context)
- **And** only masterdata columns are tracked (custom columns excluded)

### Criterion 4: Masterdata Column Detection
- **Given** the trigger function
- **When** it determines which columns to check
- **Then** it queries `column_config` table for all columns where `is_masterdata = true`
- **And** it compares OLD vs NEW values only for those masterdata columns
- **And** it uses the `db_column_name` from `column_config` to match against `employees` table columns

### Criterion 5: Change Detection Logic
- **Given** an employee record is updated
- **When** the trigger compares OLD vs NEW values
- **Then** it correctly detects changes including:
  - Text field changes (e.g., 'John' → 'Jon')
  - Null to value changes (e.g., null → 'john@example.com')
  - Value to null changes (e.g., 'john@example.com' → null)
  - Number changes (e.g., 5 → 7)
  - Date changes (e.g., '2025-01-01' → '2025-01-15')
  - Boolean changes (e.g., false → true)
- **And** it ignores unchanged columns (no audit row inserted)

### Criterion 6: Performance Considerations
- **Given** the trigger function
- **When** an employee is updated with multiple column changes
- **Then** the trigger executes efficiently (<50ms overhead per update)
- **And** bulk updates (e.g., CSV import) don't cause excessive trigger overhead
- **And** the trigger doesn't block the UPDATE operation

### Criterion 7: Data Integrity
- **Given** the audit table
- **When** an employee is deleted (if soft delete) or archived
- **Then** audit records are preserved (no cascade delete)
- **And** queries can still reference historical changes

---

## Technical Notes

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS public.employee_column_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,  -- db_column_name from column_config (e.g., 'first_name', 'email')
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- Optional for GDPR
  CONSTRAINT unique_change_per_column UNIQUE(employee_id, column_name, changed_at)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_employee_column_changes_changed_at 
  ON public.employee_column_changes(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_column_changes_employee_column 
  ON public.employee_column_changes(employee_id, column_name, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_column_changes_column_name 
  ON public.employee_column_changes(column_name);
```

### Trigger Function

The trigger function should:
1. Get list of masterdata columns from `column_config WHERE is_masterdata = true`
2. For each masterdata column, compare OLD vs NEW value
3. If values differ (including null handling), insert into `employee_column_changes`
4. Use `current_setting('app.user_id', true)` or similar to get `changed_by` from session context

**Note:** If session context for `changed_by` is not available, make it nullable and skip it for MVP.

### Masterdata Column List

The trigger needs to know which columns are masterdata. Options:
1. **Hardcode list** - Simple but requires maintenance when new masterdata columns added
2. **Query column_config** - Dynamic but adds query overhead to trigger
3. **Hybrid** - Cache masterdata column list, refresh on column_config changes

For MVP, recommend option 1 (hardcode) with clear documentation that it must be updated when new masterdata columns are added.

### Change Detection Edge Cases

- **Null handling:** `NULL = NULL` is false in SQL, so need explicit null checks
- **Type coercion:** Ensure proper type comparison (text vs number, date formats)
- **Whitespace:** Consider if 'John ' vs 'John' should be considered a change
- **Boolean:** Ensure proper boolean comparison (false vs null)

---

## Tasks

- [ ] Create migration file: `migrations/YYYYMMDDHHMMSS_create_employee_column_changes.sql`
- [ ] Define `employee_column_changes` table schema
- [ ] Create indexes for query performance
- [ ] Create trigger function `track_employee_column_changes()`
- [ ] Implement masterdata column detection logic
- [ ] Implement OLD vs NEW comparison logic
- [ ] Create trigger `employee_column_changes_trigger` on `employees` table
- [ ] Test trigger with single column change
- [ ] Test trigger with multiple column changes
- [ ] Test trigger with no changes (should not insert rows)
- [ ] Test trigger performance with bulk updates
- [ ] Document masterdata column list maintenance requirement
- [ ] Verify cascade delete behavior (if employees are hard-deleted)

---

## Prerequisites

- Story 3.1: Column Configuration Data Model (column_config table must exist)
- Story 2.3: Edit Employee Masterdata Fields (employees table with updated_at trigger)
- Database migration system in place

---

## Testing Requirements

### Unit Tests
- Test trigger function with various change scenarios
- Test null handling in comparisons
- Test type coercion edge cases

### Integration Tests
- Test trigger fires on employee UPDATE
- Test multiple column changes create multiple audit rows
- Test unchanged columns don't create audit rows
- Test performance with bulk updates

### Manual Testing
- Update employee with single field change, verify audit row created
- Update employee with multiple field changes, verify multiple audit rows
- Update employee with no actual changes, verify no audit rows
- Verify indexes improve query performance

