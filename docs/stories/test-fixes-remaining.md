# Story: Fix Remaining Test Suite Failures

**Status:** Draft  
**Priority:** Medium  
**Estimate:** 8-13 hours  
**Epic:** Technical Debt - Test Quality  
**Created:** 2025-11-05

---

## Summary

Fix remaining 157 failing tests across unit and integration test suites. Most failures are due to Swedish translation mismatches where tests expect English text but the application renders Swedish. Additional failures include API mocking issues and integration test setup problems.

## Context

Recent internationalization (i18n) implementation switched the application to Swedish (`sv`) locale, but test assertions still expect English text. Initial fixes have been completed for 19 tests across repository, landing page, dashboard, user management, login, and role selector test files.

### Current Test Status

- **Total Tests:** 830
- **Passing:** 666 (80.2%)
- **Failing:** 157 (18.9%)
- **Skipped:** 7 (0.8%)
- **Test Files Passing:** 48/69 (69.6%)

### Recently Fixed (Completed)

- ✅ Repository tests (20 tests) - Supabase mock chaining
- ✅ Landing page tests (3 tests)
- ✅ Dashboard tests (1 test)
- ✅ User management table tests (11 tests)
- ✅ Login page tests (5 tests)
- ✅ Role selector test (1 test)

---

## Problem Statement

Test suite has 157 failing tests preventing reliable CI/CD pipeline and regression detection. Failures break into three categories:

1. **Translation Mismatches (≈130 tests):** Tests query for English text/labels but app renders Swedish
2. **Integration Test Issues (≈20 tests):** API mocking problems, URL parsing errors, setup issues
3. **Validation Text Mismatches (≈7 tests):** Form validation messages in Swedish but tests expect English

---

## Acceptance Criteria

### Must Have

- [ ] All unit component tests pass (employee table, modals, important dates)
- [ ] Translation-related failures resolved using Swedish text from `messages/sv.json`
- [ ] Integration tests with API mocking issues fixed
- [ ] Test suite passes with 0 failures on main branch
- [ ] Test execution time remains under 60 seconds

### Should Have

- [ ] Document translation testing pattern for future reference
- [ ] Add test utilities for common Swedish text patterns
- [ ] Update test README with i18n testing guidelines

### Could Have

- [ ] Extract common test translation constants
- [ ] Create test data factories for Swedish locale
- [ ] Add visual regression tests for translated UI

---

## Failing Test Breakdown

### Category 1: Modal Component Tests (≈41 tests)

#### `add-column-modal.test.tsx` (11 failures)

**Issue:** All form labels, buttons, validation messages in Swedish  
**Key Translations Needed:**

- "Kolumnnamn" (Column Name)
- "Kolumntyp" (Column Type)
- "Skapa kolumn" (Create Column)
- "Avbryt" (Cancel)
- "Skapar..." (Creating...)
- "Text", "Nummer", "Datum", "Boolesk" (type options)

**Example Fix:**

```typescript
// Before
expect(screen.getByLabelText(/column name/i)).toBeInTheDocument();
// After
expect(screen.getByLabelText(/Kolumnnamn/i)).toBeInTheDocument();
```

#### `add-employee-modal.test.tsx` (6 failures)

**Key Translations:** Employee form fields from `messages/sv.json` forms section

#### `add-user-modal.test.tsx` (15 failures)

**Key Translations:** User admin form fields, role options

#### `add-important-date-modal.test.tsx` (10 failures)

**Key Translations:** Important dates form fields, date validation

### Category 2: Employee Table Tests (≈27 tests)

#### `employee-table.test.tsx` (27 failures)

**Issue:** Search placeholders, column headers, action buttons all in Swedish  
**Affected Areas:**

- Search functionality tests
- Sort column tests
- Filter tests
- Action button tests

**Key Translations:**

- "Sök anställda..." (Search employees)
- "Förnamn" (First Name)
- "Efternamn" (Surname)
- Column headers from masterdata schema

### Category 3: Important Dates Tests (≈4 tests)

#### `important-dates-table.test.tsx` (4 failures)

**Key Translations:** Date display formats, action buttons, delete confirmations

### Category 4: Settings Tests (≈2 tests)

#### `column-settings-table.test.tsx` (2 failures)

**Issue:** Permission toggle labels, column names

### Category 5: Integration Tests (≈70 tests)

#### API Integration Issues (≈30 tests)

**Files:**

- `api/employees.test.ts` (6 failures)
- `api/admin-users.test.ts` (3 failures)
- `api/columns.test.ts` (1 failure)

**Issues:**

- API response format mismatches
- HTTP status code expectations
- Request validation failures

#### Component Integration Tests (≈40 tests)

**Files:**

- `comprehensive-column-config.test.ts` (8 failures)
- `custom-columns.test.ts` (21 failures)
- `column-creation.test.tsx` (5 failures)
- `employee-table-columns.test.tsx` (6 failures)
- `employee-table-permissions.test.tsx` (8 failures)
- `external-party-dashboard.test.tsx` (8 failures)
- `realtime-sync.test.tsx` (4 failures)
- `add-employee-modal-unsaved.test.tsx` (7 failures)
- `story-7.4-column-ux.test.ts` (5 failures)

**Common Issues:**

- URL parsing errors: `TypeError: Failed to parse URL from /api/important-dates/available-pe3`
- Mock setup problems for nested API calls
- Component state not syncing in test environment

---

## Implementation Approach

### Phase 1: Modal Component Tests (Priority 1)

**Estimate:** 4-5 hours

1. **add-column-modal.test.tsx**
   - Update all form field queries to Swedish
   - Fix validation message expectations
   - Update button text expectations

2. **add-employee-modal.test.tsx**
   - Reference `messages/sv.json` forms section
   - Update field labels: "Förnamn", "Efternamn", "Personnummer", etc.

3. **add-user-modal.test.tsx**
   - Update role options: "HR Admin", "Sodexo", "ÖMC"
   - Fix form validation messages

4. **add-important-date-modal.test.tsx**
   - Update date field labels
   - Fix date format validation messages

### Phase 2: Table Component Tests (Priority 1)

**Estimate:** 3-4 hours

1. **employee-table.test.tsx**
   - Create translation helper for common table terms
   - Update search placeholder expectations
   - Fix column header queries
   - Update action button text

2. **important-dates-table.test.tsx**
   - Fix date display format expectations
   - Update action button text

3. **column-settings-table.test.tsx**
   - Update permission labels
   - Fix toggle button text

### Phase 3: Integration Tests (Priority 2)

**Estimate:** 4-6 hours

1. **API URL Parsing Issues**
   - Fix relative URL mocking in `msw` handlers
   - Add proper base URL to API route mocks
   - Update `vitest.config.ts` if needed

2. **Component Integration Tests**
   - Review and fix mock setup for nested API calls
   - Add proper cleanup between tests
   - Fix state synchronization issues

3. **API Response Tests**
   - Update response format expectations
   - Fix status code assertions
   - Update validation error format expectations

---

## Testing Strategy

### For Each Test File:

1. Run test file in isolation
2. Identify failing assertion
3. Check `messages/sv.json` for correct Swedish translation
4. Update test assertion
5. Verify test passes
6. Move to next failure

### Translation Reference Pattern:

```typescript
// Always reference messages/sv.json structure:
// messages/sv.json:
// {
//   "dashboard": {
//     "addEmployee": "Lägg till anställd"
//   }
// }

// Test should use:
expect(screen.getByText(/Lägg till anställd/i)).toBeInTheDocument();
```

### Common Translation Mappings:

| English          | Swedish (from sv.json) |
| ---------------- | ---------------------- |
| Add Employee     | Lägg till anställd     |
| Import Employees | Importera anställda    |
| Column Name      | Kolumnnamn             |
| Column Type      | Kolumntyp              |
| Create Column    | Skapa kolumn           |
| Cancel           | Avbryt                 |
| Save             | Spara                  |
| Delete           | Radera                 |
| Edit             | Redigera               |
| Search           | Sök                    |
| First Name       | Förnamn                |
| Surname          | Efternamn              |
| Email            | E-post                 |
| Password         | Lösenord               |
| Active           | Aktiv                  |
| Inactive         | Inaktiv                |
| Activate         | Aktivera               |
| Deactivate       | Inaktivera             |

---

## Technical Notes

### Translation File Reference

All Swedish translations are in: `/messages/sv.json`

Structure:

```json
{
  "common": { ... },
  "dashboard": { ... },
  "forms": { ... },
  "modals": { ... },
  "admin": { ... },
  "importantDates": { ... }
}
```

### Test Utilities Location

- i18n test wrapper: `/tests/utils/i18n-test-wrapper.tsx`
- Common test setup: `/tests/setup.ts`

### Mock Issues

Some integration tests have issues with:

- Relative URL parsing in `msw` handlers
- Need absolute URLs or proper base URL configuration
- Example error: `TypeError: Failed to parse URL from /api/important-dates/available-pe3`

**Solution:** Update MSW handlers to use absolute URLs or configure base URL in test environment

---

## Dependencies

- No new dependencies required
- Existing `messages/sv.json` contains all needed translations
- Test utilities already support i18n

---

## Risks & Mitigation

**Risk:** Translation keys might change in future  
**Mitigation:** Use regex patterns `/text/i` for flexibility, document translation key dependencies

**Risk:** Integration test fixes may require significant mock refactoring  
**Mitigation:** Prioritize unit tests first, tackle integration tests as separate sub-tasks

**Risk:** Some tests may have legitimate functionality issues beyond translations  
**Mitigation:** Document any discovered bugs separately, don't just update tests to pass

---

## Success Metrics

- [ ] Test suite passes: 830/830 tests (100%)
- [ ] Test files passing: 69/69 (100%)
- [ ] CI/CD pipeline green
- [ ] Test execution time < 60 seconds
- [ ] No skipped tests (or documented reason for skips)

---

## Dev Notes

### Quick Start for Developer

1. **Run failing tests to see current state:**

   ```bash
   pnpm test
   ```

2. **Run specific test file:**

   ```bash
   pnpm test tests/unit/components/add-column-modal.test.tsx
   ```

3. **Find translation in sv.json:**

   ```bash
   # Search for English term
   grep -i "column name" messages/sv.json
   # Result: "columnName": "Kolumnnamn"
   ```

4. **Update test:**

   ```typescript
   // Find line like:
   expect(screen.getByLabelText(/column name/i));

   // Replace with:
   expect(screen.getByLabelText(/Kolumnnamn/i));
   ```

5. **Verify fix:**
   ```bash
   pnpm test tests/unit/components/add-column-modal.test.tsx
   ```

### Example Completed Fix

See commit history for examples:

- `tests/unit/pages/landing-page.test.tsx` - All Swedish text updated
- `tests/unit/components/login-page.test.tsx` - Form field labels
- `tests/unit/components/user-management-table.test.tsx` - Button text and dialogs

---

## Subtasks

- [ ] Phase 1.1: Fix add-column-modal.test.tsx (11 tests)
- [ ] Phase 1.2: Fix add-employee-modal.test.tsx (6 tests)
- [ ] Phase 1.3: Fix add-user-modal.test.tsx (15 tests)
- [ ] Phase 1.4: Fix add-important-date-modal.test.tsx (10 tests)
- [ ] Phase 2.1: Fix employee-table.test.tsx (27 tests)
- [ ] Phase 2.2: Fix important-dates-table.test.tsx (4 tests)
- [ ] Phase 2.3: Fix column-settings-table.test.tsx (2 tests)
- [ ] Phase 3.1: Fix API integration tests (10 tests)
- [ ] Phase 3.2: Fix component integration tests (40 tests)
- [ ] Phase 3.3: Fix remaining integration tests (30 tests)
- [ ] Final: Verify all tests pass and CI/CD is green

---

## Related Stories/Tickets

- Epic 8.0: Internationalization Implementation
- Story 8.1: Swedish Translation Implementation (Completed)
- Story 8.2: i18n Test Infrastructure (Completed)

---

## Definition of Done

- [ ] All 157 failing tests now pass
- [ ] Test suite shows 830/830 passing
- [ ] CI/CD pipeline passes
- [ ] Code reviewed and approved
- [ ] Translation testing pattern documented
- [ ] No new warnings or errors in test output
- [ ] Test execution time verified (< 60s)
