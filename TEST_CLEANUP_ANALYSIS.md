# Test Cleanup Analysis - Story 8.15

**Generated:** 2025-11-10  
**Test Framework:** Vitest 4.0.3  
**Status:** Analysis Complete

---

## Summary

- **Total Failing Tests:** 236
- **Affected Test Files:** 34
- **Build Errors:** 1 (TypeScript compilation failure)
- **Lint Errors:** 5 critical errors, 18 warnings
- **Type Errors:** 102 TypeScript compilation errors
- **Runtime Errors:** 16 unhandled rejections during test execution

---

## Critical Issues Overview

### 1. Build-Blocking Type Error
**File:** `src/app/api/employees/import/route.ts:175`  
**Error:** Missing required properties `repayment_needed_omc` and `repayment_needed_pe3` in EmployeeFormData  
**Priority:** CRITICAL (blocks production build)  
**Impact:** Build command fails completely

### 2. Missing Type Properties Pattern
**Count:** 102 type errors across integration tests  
**Root Cause:** Type definitions updated in recent stories (8.13, 8.14) but test mock data not updated  
**Priority:** HIGH (blocks TypeScript compilation)

### 3. Invalid Enum Values
**Count:** Multiple test files using invalid gender/rank values  
**Root Cause:** Story 8.1 changed gender/rank to strict enums, tests not updated  
**Priority:** HIGH (test data incompatible with schema)

### 4. Component Test Failures
**Count:** 236 failing component/integration tests  
**Root Cause:** Multiple issues - missing mocks, act() warnings, invalid URL parsing  
**Priority:** HIGH (test coverage broken)

### 5. Lint Errors Blocking CI
**Count:** 5 critical errors (require() style imports forbidden)  
**Priority:** MEDIUM (fails lint check but doesn't block runtime)

---

## Test Failure Categories

### Category 1: Type Definition Mismatches (102 errors)

#### Subcategory 1A: Missing Employee Properties (Story 8.13/8.14)
**Affected Files:**
- `tests/integration/api/employees-import.test.ts` (21 errors)
- `tests/integration/date-capacity-concurrency.test.ts` (2 errors)
- `tests/integration/talmundo-conditional-edit.test.ts` (1 error)

**Error Pattern:**
```typescript
Type 'X' is missing the following properties from type 'Employee': 
repayment_needed_omc, repayment_needed_pe3
```

**Root Cause:** Story 8.13 added `repayment_needed_omc` and `repayment_needed_pe3` fields to Employee type, but test mock data not updated.

**Fix Strategy:**
```typescript
// Add to all Employee mock objects:
repayment_needed_omc: null,
repayment_needed_pe3: null,
```

---

#### Subcategory 1B: Missing ColumnConfig Properties (Story 7.4+)
**Affected Files:**
- `tests/integration/api/admin-columns.test.ts` (4 errors)
- `tests/integration/api/category-colors.test.ts` (3 errors)
- `tests/integration/api/columns.test.ts` (7 errors)
- `tests/integration/components/employee-table-columns.test.tsx` (12 errors)
- `tests/integration/components/employee-table-permissions.test.tsx` (3 errors)
- `tests/integration/story-7.4-column-ux.test.ts` (4 errors)

**Error Pattern:**
```typescript
Type 'X' is missing the following properties from type 'ColumnConfig': 
db_column_name, category_color, display_order, is_visible, updated_at
```

**Root Cause:** ColumnConfig type was enhanced with additional required fields in recent stories.

**Fix Strategy:**
```typescript
// Add to all ColumnConfig mock objects:
db_column_name: 'test_column',
category_color: '#FFFFFF',
display_order: 0,
is_visible: true,
updated_at: new Date().toISOString()
```

---

#### Subcategory 1C: Invalid Gender/Rank Enum Values (Story 8.1)
**Affected Files:**
- `tests/integration/api/employees.test.ts` (9 errors)
- `tests/integration/api/employees-import-relaxed-validation.test.ts` (4 errors)
- `tests/integration/api/employees-import.test.ts` (6 errors)
- `tests/integration/components/employee-table-columns.test.tsx` (2 errors)
- `tests/integration/components/employee-table-permissions.test.tsx` (4 errors)
- `tests/integration/realtime-sync.test.tsx` (4 errors)

**Error Pattern:**
```typescript
Type '"Male"' is not assignable to type '"Man" | "Woman" | null'
Type '"CAPTAIN"' is not assignable to type '"SEV" | "CHEF"'
Type '"Manager"' is not assignable to type '"SEV" | "CHEF"'
```

**Root Cause:** Story 8.1 changed gender to "Man"/"Woman" and rank to "SEV"/"CHEF" enums. Tests still using old values.

**Fix Strategy:**
```typescript
// Replace invalid values:
gender: 'Male' → gender: 'Man'
gender: 'Female' → gender: 'Woman'
rank: 'CAPTAIN' → rank: 'SEV'
rank: 'Manager' → rank: 'SEV'
rank: 'Senior' → rank: 'SEV'
rank: 'Developer' → rank: 'SEV'
rank: null → rank: 'SEV' (or 'CHEF')
```

---

#### Subcategory 1D: Missing ImportantDate Properties (Story 8.7+)
**Affected Files:**
- `tests/integration/api/important-dates.test.ts` (5 errors)
- `tests/integration/date-capacity-concurrency.test.ts` (1 error)

**Error Pattern:**
```typescript
Type 'X' is missing the following properties from type 'ImportantDate': 
time_value, deadline_submit, deadline_cancel, max_spots, remaining_spots, assigned_employees
```

**Root Cause:** Stories 8.7 and 8.10 added capacity management and deadline fields to ImportantDate type.

**Fix Strategy:**
```typescript
// Add to all ImportantDate mock objects:
time_value: null,
deadline_submit: null,
deadline_cancel: null,
max_spots: 99,
remaining_spots: 99,
assigned_employees: []
```

---

#### Subcategory 1E: loneiva Type Changed to number (Story 8.5)
**Affected Files:**
- `tests/integration/crewing-done-conditional.test.ts` (8 errors)
- `tests/integration/export-crew-ready.test.ts` (7 errors)

**Error Pattern:**
```typescript
Type 'boolean' is not assignable to type 'number'
```

**Root Cause:** Story 8.5 changed `loneiva` from boolean to number (0-7 range).

**Fix Strategy:**
```typescript
// Replace:
loneiva: true → loneiva: 1 (or appropriate number 0-7)
loneiva: false → loneiva: 0
```

---

#### Subcategory 1F: Missing SessionUser Properties
**Affected Files:**
- `tests/integration/components/employee-table-columns.test.tsx` (6 errors)
- `tests/integration/components/employee-table-permissions.test.tsx` (4 errors)
- `tests/integration/edit-column.test.ts` (1 error)

**Error Pattern:**
```typescript
Property 'last_active_at' is missing in type 'X' but required in type 'SessionUser'
```

**Fix Strategy:**
```typescript
// Add to all SessionUser mock objects:
last_active_at: new Date().toISOString()
```

---

#### Subcategory 1G: Termination API Response Type Mismatch (Story 8.14)
**Affected Files:**
- `tests/integration/api/employees.test.ts` (2 errors)

**Error Pattern:**
```typescript
Type 'Employee' is not assignable to parameter of type 
'{ employee: Employee; clearedDates: string[]; releasedSpots: number; }'
```

**Root Cause:** Story 8.14 changed termination API to return `{ employee, clearedDates, releasedSpots }` but tests expect just `Employee`.

**Fix Strategy:**
```typescript
// Update test expectations:
const result = await terminate(id);
expect(result).toMatchObject({
  employee: expect.objectContaining({ id }),
  clearedDates: expect.any(Array),
  releasedSpots: expect.any(Number)
});
```

---

#### Subcategory 1H: Missing Hook Return Properties
**Affected Files:**
- `tests/integration/components/employee-table-columns.test.tsx` (3 errors)
- `tests/integration/components/employee-table-permissions.test.tsx` (1 error)

**Error Pattern:**
```typescript
Property 'refetch' is missing in type 'X' but required in type 
'{ columns: ColumnConfig[]; isLoading: boolean; error: Error | null; refetch: () => void; }'
```

**Fix Strategy:**
```typescript
// Add refetch function to mock hook returns:
refetch: vi.fn()
```

---

#### Subcategory 1I: Invalid Component Props
**Affected Files:**
- `tests/integration/realtime-sync.test.tsx` (11 errors)

**Error Pattern:**
```typescript
Property 'isRealtimeConnected' does not exist on type 'IntrinsicAttributes & EmployeeTableProps'
```

**Root Cause:** Test passing prop that doesn't exist on EmployeeTable component.

**Fix Strategy:**
```typescript
// Remove isRealtimeConnected prop from test renders
// OR add it to EmployeeTableProps if it should exist
```

---

### Category 2: Component Test Failures (236 tests)

#### Subcategory 2A: URL Parsing Errors in Hooks
**Affected Files:**
- `tests/unit/components/add-employee-modal.test.tsx`

**Error:**
```
TypeError: Failed to parse URL from /api/important-dates/available-pe3
ERR_INVALID_URL
```

**Root Cause:** `use-available-pe3-dates` hook fetching relative URL in test environment without proper base URL.

**Priority:** HIGH

**Fix Strategy:**
```typescript
// Mock the fetch calls in test setup:
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ([])
});

// OR mock the entire hook:
vi.mock('@/lib/hooks/use-available-pe3-dates', () => ({
  useAvailablePE3Dates: () => ({
    dates: [],
    isLoading: false,
    error: null
  })
}));
```

---

#### Subcategory 2B: React act() Warnings
**Affected Files:** Multiple component tests

**Error:**
```
An update to [Component] inside a test was not wrapped in act(...)
```

**Root Cause:** Async state updates in components not properly awaited in tests.

**Priority:** MEDIUM

**Fix Strategy:**
```typescript
import { act, waitFor } from '@testing-library/react';

// Wrap state-triggering actions:
await act(async () => {
  fireEvent.click(button);
});

// OR use waitFor for async updates:
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

---

#### Subcategory 2C: window is not defined Errors
**Affected Files:**
- `tests/unit/pages/dashboard.test.tsx`

**Error:**
```
ReferenceError: window is not defined
```

**Root Cause:** Test environment (jsdom) not properly configured or component accessing window during SSR phase.

**Priority:** MEDIUM

**Fix Strategy:**
```typescript
// Add to vitest.config.ts:
environment: 'jsdom',

// OR guard window access in components:
if (typeof window !== 'undefined') {
  // window code
}
```

---

#### Subcategory 2D: Component Rendering Failures
**Affected Files:**
- `tests/unit/components/column-settings-table.test.tsx` (4/5 failed)
- `tests/unit/components/permission-toggle.test.tsx` (6/6 failed)
- `tests/unit/components/delete-column-modal.test.tsx` (6/7 failed)

**Common Issues:**
- Missing context providers (AuthContext, etc.)
- Props not matching component signatures
- Mock functions not properly configured

**Priority:** HIGH

**Fix Strategy:**
1. Create test utility wrapper with all required providers
2. Review component prop signatures
3. Ensure all mocks return expected data shapes

---

#### Subcategory 2E: Missing Dialog Description Warnings
**Affected Files:**
- `tests/unit/components/add-column-modal.test.tsx`
- `tests/integration/column-creation.test.tsx`

**Warning:**
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
```

**Root Cause:** Accessibility issue in Dialog components.

**Priority:** LOW (warning, not failure)

**Fix Strategy:**
```typescript
// Add DialogDescription to modals:
<DialogContent>
  <DialogTitle>Title</DialogTitle>
  <DialogDescription>Description text</DialogDescription>
  {/* content */}
</DialogContent>
```

---

### Category 3: Build Errors (1 critical error)

#### Error BUILD-001: Missing EmployeeFormData Properties
**File:** `src/app/api/employees/import/route.ts:175`

**Full Error:**
```
Type error: Type '{ first_name: string; surname: string; ssn: string; email: string | null; 
mobile: string | null; rank: "SEV" | "CHEF"; gender: "Man" | "Woman" | null; ... }' 
is missing the following properties from type 'EmployeeFormData': 
repayment_needed_omc, repayment_needed_pe3
```

**Root Cause:** Story 8.13 added repayment fields to EmployeeFormData type definition, but employee import route not updated.

**Priority:** CRITICAL (blocks build)

**Fix:**
```typescript
// File: src/app/api/employees/import/route.ts
// Line 175, add missing properties:

const employeeData: EmployeeFormData = {
  first_name: validated.first_name,
  surname: validated.surname,
  ssn: normalizeSSN(validated.ssn),
  email: validated.email || null,
  mobile: validated.mobile || null,
  rank: validated.rank,
  gender: validated.gender,
  town_district: validated.town_district,
  hire_date: validated.hire_date,
  // ... existing fields ...
  
  // ADD THESE TWO LINES:
  repayment_needed_omc: null,
  repayment_needed_pe3: null,
  
  // ... rest of fields ...
};
```

---

#### Error BUILD-002: ImportantDate time_value Type Mismatch
**File:** `src/app/api/important-dates/route.ts:68`

**Error:**
```
Type 'string | null | undefined' is not assignable to type 'string | null'
Type 'undefined' is not assignable to type 'string | null'
```

**Priority:** CRITICAL (blocks build)

**Fix:**
```typescript
// File: src/app/api/important-dates/route.ts
// Line 68, ensure time_value is never undefined:

time_value: data.time_value ?? null,  // Convert undefined to null
```

---

### Category 4: Lint Errors (5 critical, 18 warnings)

#### Lint Error Group A: Forbidden require() Imports
**Files:**
- `apply-policy-now.js` (2 errors)
- `check-policy.js` (2 errors)

**Error:**
```
A `require()` style import is forbidden @typescript-eslint/no-require-imports
```

**Priority:** MEDIUM

**Fix:**
```javascript
// Replace:
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// With:
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
```

---

#### Lint Error Group B: React Compiler Memoization Warning
**File:** `src/components/dashboard/assigned-employees-modal.tsx:48`

**Error:**
```
Compilation Skipped: Existing memoization could not be preserved
react-hooks/preserve-manual-memoization
```

**Priority:** HIGH (React Compiler optimization issue)

**Fix:**
```typescript
// Current (line 48):
const filteredEmployees = React.useMemo(() => {
  if (!date?.assigned_employees) return [];
  // ...
}, [date?.assigned_employees, searchQuery]);

// Fix: Use full date object:
const filteredEmployees = React.useMemo(() => {
  if (!date?.assigned_employees) return [];
  // ...
}, [date, searchQuery]);  // Changed dependency
```

---

#### Lint Warnings: Unused Variables (18 warnings)
**Files:** Multiple

**Priority:** LOW

**Fix Strategy:**
1. Remove unused imports/variables
2. Prefix with underscore if intentionally unused: `_data`
3. Use `// eslint-disable-next-line @typescript-eslint/no-unused-vars` if needed for future use

---

### Category 5: Runtime Errors (16 unhandled rejections)

#### Runtime Error: Async State Updates After Unmount
**File:** `tests/unit/pages/dashboard.test.tsx`

**Error:**
```
ReferenceError: window is not defined
at resolveUpdatePriority
```

**Root Cause:** Hook continuing to execute after test completes (cleanup not properly done).

**Priority:** MEDIUM

**Fix:**
```typescript
// Add cleanup in test:
afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
  cleanup();
});

// Ensure hooks are properly mocked to not make real API calls
```

---

## Fix Summary by Priority

### CRITICAL (Must Fix First)
1. **BUILD-001:** Add `repayment_needed_omc` and `repayment_needed_pe3` to employee import route
2. **BUILD-002:** Fix `time_value` type in important dates route

### HIGH (Fix Next)
3. Update all test mock data with missing Employee properties (repayment fields)
4. Update all test mock data with missing ColumnConfig properties
5. Fix gender/rank enum values in all tests
6. Update all ImportantDate mocks with capacity/deadline fields
7. Fix loneiva type (boolean → number) in tests
8. Fix component test URL parsing errors (mock fetch/hooks)
9. Fix termination API response type expectations

### MEDIUM
10. Add `last_active_at` to SessionUser mocks
11. Add `refetch` to hook mock returns
12. Convert require() to import in utility scripts
13. Fix React Compiler memoization warning
14. Fix React act() warnings in component tests
15. Fix window undefined errors in dashboard tests

### LOW
16. Remove/fix unused variable lint warnings
17. Add DialogDescription for accessibility warnings
18. Remove invalid component props (isRealtimeConnected)

---

## Test Execution Statistics

**Before Fix:**
- Test Files: 34 failed | 55 passed | 3 skipped (92 total)
- Tests: 236 failed | 984 passed | 16 skipped (1,236 total)
- Errors: 16 unhandled rejections
- Duration: 60.02s

**Expected After Fix:**
- Test Files: 0 failed | 89 passed | 3 skipped
- Tests: 0 failed | 1,220 passed | 16 skipped
- Errors: 0
- Duration: <60s

---

## Affected Stories Reference

The test failures stem from changes made in recent stories:

- **Story 8.1:** Gender & Rank Enum Restrictions (gender/rank type changes)
- **Story 8.5:** Lönenivå (Salary Level) Field (loneiva boolean → number)
- **Story 8.7:** Important Dates Capacity Management (max_spots, remaining_spots, assigned_employees)
- **Story 8.10:** PE3 Time Selection & Deadline Fields (time_value, deadline_submit, deadline_cancel)
- **Story 8.13:** Terminated Employee Repayment Tracking (repayment_needed_omc, repayment_needed_pe3)
- **Story 8.14:** Termination Date Clear Logic (API response type changed)
- **Story 7.4+:** Column UX enhancements (ColumnConfig properties added)

---

## Next Steps

1. ✅ **Phase 1 Complete:** Analysis and categorization done
2. ⏳ **Phase 2:** Fix build-blocking type errors (CRITICAL priority)
3. ⏳ **Phase 3:** Fix HIGH priority test data mismatches
4. ⏳ **Phase 4:** Fix MEDIUM priority issues
5. ⏳ **Phase 5:** Clean up LOW priority warnings
6. ⏳ **Phase 6:** Validate all tests pass 3x consecutively

---

**Analysis Generated:** 2025-11-10 16:35:00  
**Story:** 8.15 Test Cleanup and Error Resolution  
**Developer:** James (AI Agent)
