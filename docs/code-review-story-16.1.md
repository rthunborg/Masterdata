# Code Review: Story 16.1 - Create Employee Column Changes Audit Table

**Review Date:** 2025-12-05  
**Reviewer:** Dev Agent  
**Status:** Ready for Review → **Issues Found**

---

## Summary

The implementation is **functionally correct** and meets most acceptance criteria. However, there are several **important issues** that should be addressed before production deployment:

1. ⚠️ **CRITICAL**: Unique constraint may cause silent failures on rapid updates
2. ⚠️ **HIGH**: Type coercion issues with boolean/number fields
3. ⚠️ **MEDIUM**: `changed_by` will always be NULL (session context not set)
4. ⚠️ **MEDIUM**: Missing `talmundo` field in masterdata columns list
5. ⚠️ **LOW**: Test coverage is documentation-only (no actual trigger testing)

---

## Detailed Review

### ✅ Strengths

1. **Schema Design**: Table structure is well-designed with appropriate indexes
2. **Null Handling**: Uses `IS DISTINCT FROM` correctly for null comparisons
3. **Documentation**: Good inline comments and migration documentation
4. **Error Handling**: Graceful handling of session context unavailability
5. **Index Strategy**: Appropriate indexes for query performance (AC2 met)

### ⚠️ Issues Found

#### 1. CRITICAL: Unique Constraint Race Condition

**Location:** `migrations/20251205155128_create_employee_column_changes.sql:13`

**Issue:**
```sql
CONSTRAINT unique_change_per_column UNIQUE(employee_id, column_name, changed_at)
```

If multiple changes to the same column happen within the same millisecond (e.g., bulk updates, rapid API calls), the unique constraint will cause conflicts. While `ON CONFLICT DO NOTHING` handles this gracefully, it means some changes may be silently ignored.

**Impact:** Low probability but high impact - could miss change notifications in edge cases.

**Recommendation:**
- **Option A (Recommended)**: Remove `changed_at` from unique constraint, use `(employee_id, column_name)` only. This allows multiple changes per column per employee, which is actually more accurate.
- **Option B**: Keep constraint but add microsecond precision or use sequence-based approach.
- **Option C**: Keep as-is but document the limitation clearly.

**AC Compliance:** AC7 says "audit records are preserved" - current implementation preserves them but may miss some in edge cases.

---

#### 2. HIGH: Type Coercion Issues

**Location:** `migrations/20251205155128_create_employee_column_changes.sql:72-73`

**Issue:**
```sql
old_val := old_json->>col_name;  -- Extracts as TEXT
new_val := new_json->>col_name;  -- Extracts as TEXT
```

The JSONB `->>` operator always returns TEXT. This causes issues with:
- **Boolean fields** (`one`, `isps`, `photo`, etc.): `false` becomes `'false'` (string), `true` becomes `'true'` (string)
- **Number fields** (`loneiva`): `5` becomes `'5'` (string)
- **Date fields**: UUIDs become strings (acceptable), but DATE fields become ISO strings

**Example Problem:**
- Employee has `one = false` (boolean)
- Update sets `one = true` (boolean)
- Trigger compares `'false'` (TEXT) vs `'true'` (TEXT) ✅ Works
- BUT: If comparing `false` vs `false`, both become `'false'` vs `'false'` ✅ Works
- **However**: If a boolean field is NULL, it becomes `NULL` (text) vs `'false'` - this should work with `IS DISTINCT FROM`

**Impact:** May work correctly for most cases, but type coercion is fragile and could cause issues with edge cases.

**Recommendation:**
- **Option A (Recommended)**: Cast values to appropriate types before comparison:
  ```sql
  -- For boolean columns
  IF col_name IN ('one', 'isps', 'photo', ...) THEN
    old_val := (old_json->col_name)::text;
    new_val := (new_json->col_name)::text;
  -- For number columns
  ELSIF col_name = 'loneiva' THEN
    old_val := COALESCE((old_json->col_name)::text, '');
    new_val := COALESCE((new_json->col_name)::text, '');
  ELSE
    old_val := old_json->>col_name;
    new_val := new_json->>col_name;
  END IF;
  ```
- **Option B**: Document that all values are compared as text (current approach) and ensure all comparisons use `IS DISTINCT FROM`.

**AC Compliance:** AC5 requires correct detection of boolean changes - current implementation should work but is fragile.

---

#### 3. MEDIUM: Missing `talmundo` Field

**Location:** `migrations/20251205155128_create_employee_column_changes.sql:39-48`

**Issue:** The masterdata columns list is missing `talmundo`, which is a masterdata field according to the TypeScript interface (`src/lib/types/employee.ts:45`).

**Current List (27 columns):**
- Missing: `talmundo`

**Impact:** Changes to `talmundo` field will not be tracked.

**Recommendation:**
Add `talmundo` to the masterdata_columns array:
```sql
masterdata_columns TEXT[] := ARRAY[
  'stena_date', 'omc_date', 'pe3_date',
  'first_name', 'surname', 'ssn',
  'email', 'mobile', 'rank', 'gender', 'town_district',
  'hire_date', 'termination_date', 'termination_reason',
  'comments',
  'one', 'talmundo', 'isps', 'photo', 'origo', 'loneiva',  -- Added talmundo
  'mail_lon', 'bankuppgifter', 'li', 'passport',
  'kvitto_c17_18', 'c17', 'crewing_done'
];
```

**AC Compliance:** AC3 requires tracking all masterdata columns - missing one field.

---

#### 4. MEDIUM: `changed_by` Always NULL

**Location:** `migrations/20251205155128_create_employee_column_changes.sql:59`

**Issue:**
```sql
user_id_val := NULLIF(current_setting('app.user_id', true), '')::UUID;
```

The `app.user_id` session variable is **never set** in the codebase. Searching migrations and code shows no place where this variable is set. This means `changed_by` will always be NULL.

**Impact:** 
- Cannot track who made changes (GDPR compliance concern)
- AC3 says "changed_by is set to the current user (if available)" - technically met (it's NULL when unavailable), but the variable is never available.

**Recommendation:**
- **Option A**: Set `app.user_id` in API routes before employee updates:
  ```typescript
  // In employee update API route
  await supabase.rpc('exec_sql', {
    sql: `SET LOCAL app.user_id = '${userId}'`
  });
  ```
- **Option B**: Document that `changed_by` is not implemented in MVP and will be added in future enhancement.
- **Option C**: Use a different approach (e.g., pass user_id as a parameter to a stored procedure).

**AC Compliance:** AC3 partially met - variable is checked but never set, so always NULL.

---

#### 5. LOW: Test Coverage Limitations

**Location:** `tests/integration/constraints/employee-column-changes-trigger.test.ts`

**Issue:** Tests are mock-based and don't actually test the database trigger. They document expected behavior but don't verify the trigger works correctly.

**Impact:** No confidence that the trigger actually works in the database.

**Recommendation:**
- Add integration tests that:
  1. Apply the migration
  2. Update an employee record
  3. Query `employee_column_changes` table
  4. Verify audit records were created
- Or document that trigger testing requires manual testing or database-level testing.

**AC Compliance:** Testing requirements mention integration tests - current tests are documentation-only.

---

#### 6. MINOR: AC4 Discrepancy

**Location:** Story AC4 vs Implementation

**Issue:** AC4 says "it queries `column_config` table for all columns where `is_masterdata = true`", but the implementation uses a hardcoded list.

**Impact:** None - story notes explicitly recommend hardcoded list for MVP.

**Recommendation:** Update AC4 to reflect MVP approach, or add a comment in the story that this is acceptable for MVP.

---

## Recommendations Summary

### Must Fix (Before Production)
1. ✅ Add `talmundo` to masterdata columns list
2. ⚠️ Review unique constraint strategy (Option A recommended)
3. ⚠️ Document or fix `changed_by` implementation

### Should Fix (Before Next Story)
4. ⚠️ Add real integration tests for trigger
5. ⚠️ Document type coercion approach or fix it

### Nice to Have
6. Consider adding RLS policies for `employee_column_changes` table
7. Consider adding retention policy documentation

---

## AC Compliance Checklist

| AC | Status | Notes |
|----|--------|-------|
| AC1: Audit Table Creation | ✅ PASS | All columns present, indexes created |
| AC2: Database Indexes | ✅ PASS | All required indexes present |
| AC3: Update Trigger | ⚠️ PARTIAL | Trigger works, but `changed_by` always NULL |
| AC4: Masterdata Column Detection | ⚠️ PARTIAL | Uses hardcoded list (acceptable per story notes, but AC says "queries column_config") |
| AC5: Change Detection Logic | ⚠️ WORKS | Should work but type coercion is fragile |
| AC6: Performance | ✅ PASS | Trigger should be efficient (<50ms) |
| AC7: Data Integrity | ⚠️ PARTIAL | Cascade delete works, but unique constraint may cause silent failures |

---

## Code Quality

- **SQL Syntax**: ✅ Correct
- **Error Handling**: ✅ Good (graceful degradation)
- **Documentation**: ✅ Good (comments and migration notes)
- **Performance**: ✅ Good (indexes, efficient trigger)
- **Maintainability**: ⚠️ Medium (hardcoded list requires manual updates)

---

## Final Verdict

**Status:** ⚠️ **APPROVE WITH FIXES REQUIRED**

The implementation is solid but has some important issues that should be addressed:
1. Missing `talmundo` field (must fix)
2. Unique constraint strategy (should review)
3. `changed_by` not implemented (should document or fix)
4. Type coercion approach (should document or improve)

**Recommendation:** Fix issues #1 and #3 before merging. Issues #2, #4, and #5 can be addressed in follow-up work.

---

## Review Artifacts

- Migration file: `migrations/20251205155128_create_employee_column_changes.sql`
- Test file: `tests/integration/constraints/employee-column-changes-trigger.test.ts`
- Story: `docs/stories/story-16.1.md`

