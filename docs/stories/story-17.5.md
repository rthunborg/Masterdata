# Story 17.5: Search Filter Improvements for External Users

**Story:** As an external party user, I want to use the search filter functionality, but I don't need the premade filters dropdown, so that I have a cleaner interface focused on search.

**Status:** Done  
**Epic:** Epic 17: External User UX Improvements

---

## Acceptance Criteria

### Criterion 1: Remove Premade Filters Dropdown
- **Given** an external user is on the dashboard
- **When** they view the filter area
- **Then** the dropdown with premade filters ("Alla anställda", "Crew Ready", "Inte Crew Ready") is not shown
- **And** the dropdown is completely hidden (not just disabled)

### Criterion 2: Search Functionality Preserved
- **Given** an external user is on the dashboard
- **When** they view the filter area
- **Then** the search input field is still visible and functional
- **And** search works as before (filters employees by search term)
- **And** search functionality is not affected by removing the dropdown

### Criterion 3: HR Admin Unaffected
- **Given** an HR Admin user is on the dashboard
- **When** they view the filter area
- **Then** the premade filters dropdown is still visible and functional
- **And** all existing filter functionality remains unchanged

### Criterion 4: Role-Based Conditional Rendering
- **Given** the employee table component
- **When** it renders filters
- **Then** it conditionally shows/hides the dropdown based on user role
- **And** the conditional logic is clear and maintainable

---

## Technical Notes

### Component Location

The premade filters dropdown is in `src/components/dashboard/employee-table.tsx`:
- Around line 1744-1768: Crew Ready filter Select component
- Contains: "Alla anställda", "Crew Ready", "Inte Crew Ready"

### Conditional Rendering

Wrap the filter dropdown in a role check:

```tsx
{/* Story 8.5: Crew-Ready Filter - HR Admin only */}
{isHRAdmin && (
  <Select
    value={crewReadyFilter}
    onValueChange={(value) => setCrewReadyFilter(value as 'all' | 'ready' | 'not-ready')}
  >
    <SelectTrigger className="w-[180px]" aria-label="Crew Status" data-testid="crew-status-filter">
      <SelectValue placeholder="Crew Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Alla anställda</SelectItem>
      <SelectItem value="ready">Crew Ready</SelectItem>
      <SelectItem value="not-ready">Inte Crew Ready</SelectItem>
    </SelectContent>
  </Select>
)}
```

### Search Input

Ensure search input remains visible for all users:
- Search input should not be wrapped in role check
- Search functionality should work for all users

### Testing Considerations

- Verify dropdown is hidden for external users
- Verify dropdown is visible for HR Admin
- Verify search still works for external users
- Verify no layout issues when dropdown is hidden

---

## Tasks

- [x] Add role check to hide premade filters dropdown for external users
- [x] Verify search input remains visible and functional
- [x] Test with external user role
- [x] Test with HR Admin role (verify dropdown still shows)
- [x] Test search functionality for external users
- [x] Verify no layout/UI issues when dropdown is hidden

---

## Prerequisites

- Employee table component must exist
- Search functionality must exist
- User role system must be in place

---

## Testing Requirements

### Unit Tests
- Test conditional rendering based on user role
- Test search input is always visible

### Integration Tests
- Test dropdown hidden for external users
- Test dropdown visible for HR Admin
- Test search works for external users

### E2E Tests
- Test external user sees search but not dropdown
- Test HR Admin sees both search and dropdown
- Test search functionality works correctly

### Manual Testing
- Login as external user (sodexo, omc, etc.)
- Verify premade filters dropdown is not visible
- Verify search input is visible and works
- Login as HR Admin
- Verify dropdown is still visible
- Verify all filter functionality works

---

## Notes

- This is a simple UI cleanup - no functionality changes
- Ensure layout doesn't break when dropdown is removed
- Consider if other filters should also be hidden (e.g., archived, terminated filters)

---

## Dev Agent Record

### Completion Notes

**Implementation Summary:**
- Wrapped Crew Ready filter dropdown with `isHRAdmin` conditional check in `employee-table.tsx` (lines 1793-1819)
- Search input remains visible and functional for all users (not wrapped in role check)
- All acceptance criteria satisfied:
  - AC1: Dropdown hidden for external users (sodexo, omc, payroll, toplux)
  - AC2: Search input visible and functional for all users
  - AC3: HR Admin still sees dropdown and all functionality preserved
  - AC4: Clear conditional rendering using `isHRAdmin` check

**Testing:**
- Created comprehensive unit tests: `tests/unit/epic-17/story-17.5/filter-dropdown-conditional-rendering.test.tsx`
- All 7 tests passing, covering all acceptance criteria
- Full regression suite passed: 2306 tests passing
- No regressions introduced

**Files Modified:**
- `src/components/dashboard/employee-table.tsx` - Added conditional rendering wrapper

**Files Created:**
- `tests/unit/epic-17/story-17.5/filter-dropdown-conditional-rendering.test.tsx` - Unit tests

### Debug Log

- Implementation straightforward: wrapped existing Select component with `isHRAdmin &&` check
- Verified search input placement (lines 1757-1791) - already outside any role checks
- No layout issues observed - dropdown removal doesn't affect flex layout
- All existing functionality preserved for HR Admin users

---

## File List

**Modified:**
- `src/components/dashboard/employee-table.tsx`

**Created:**
- `tests/unit/epic-17/story-17.5/filter-dropdown-conditional-rendering.test.tsx`

---

## Code Review

**Reviewer:** Dev Agent  
**Date:** 2025-01-XX  
**Status:** ✅ **APPROVED** (with minor recommendations)

### Summary

The implementation correctly addresses all acceptance criteria with a clean, maintainable solution. The conditional rendering approach is appropriate and follows existing codebase patterns. All tests pass successfully.

### ✅ Strengths

1. **Correct Implementation**
   - Conditional rendering correctly uses `isHRAdmin` check (line 219: `const isHRAdmin = user?.role === "hr_admin"`)
   - Dropdown is properly wrapped with `{isHRAdmin && (` on line 1795
   - Search input correctly remains outside role check (lines 1757-1791)
   - Implementation matches technical notes exactly

2. **Code Quality**
   - Follows existing codebase patterns (consistent with other `isHRAdmin` checks throughout the file)
   - Clear, readable conditional rendering
   - Proper use of existing role check variable (no duplication)
   - Good code comments referencing story numbers

3. **Test Coverage**
   - Comprehensive unit tests covering all 4 acceptance criteria
   - Tests for all external user roles (sodexo, omc, payroll, toplux)
   - Tests for HR Admin role preservation
   - Tests for conditional rendering logic
   - All 7 tests passing ✅

4. **Accessibility**
   - Existing `aria-label="Crew Status"` preserved on SelectTrigger
   - `data-testid="crew-status-filter"` maintained for testing
   - No accessibility regressions introduced

5. **Layout & UX**
   - Conditional padding adjustment on line 1754: `!isHRAdmin && "pt-4"` - good attention to layout details
   - Flex layout handles dropdown removal gracefully
   - No visual regressions expected

### ✅ Test Cleanup Completed

1. **Test Warnings - RESOLVED**
   - ✅ Added mocks for `mutationQueueService` to prevent IndexedDB errors
   - ✅ Added mocks for `useImportantDates` and `useUIStore` hooks
   - ✅ Wrapped all render calls with `act()` to fix React warnings
   - ✅ All tests now pass cleanly without warnings or errors

2. **Code Consistency**
   - The conditional rendering pattern is consistent with other `isHRAdmin` checks in the file (lines 712, 1152, 1497, 1650, 1849)
   - Good alignment with existing patterns

3. **Documentation**
   - Story comments are clear and reference both Story 8.5 and Story 17.5
   - Implementation notes in story file are accurate

### 🔍 Code Review Checklist

- ✅ **Acceptance Criteria:** All 4 criteria met
- ✅ **Implementation:** Correct and matches technical notes
- ✅ **Code Quality:** Clean, maintainable, follows patterns
- ✅ **Tests:** Comprehensive coverage, all passing
- ✅ **Accessibility:** No regressions
- ✅ **Performance:** No performance concerns (simple conditional render)
- ✅ **Security:** Role check properly implemented
- ✅ **Edge Cases:** Handled (null user via optional chaining)
- ✅ **Linting:** No linting errors
- ✅ **Regression:** No breaking changes

### 📋 Review Notes

**Implementation Location:**
```1793:1821:src/components/dashboard/employee-table.tsx
{/* Story 8.5: Crew-Ready Filter - HR Admin only */}
{/* Story 17.5: Hide premade filters dropdown for external users */}
{isHRAdmin && (
  <Select
    value={crewReadyFilter}
    onValueChange={(value) => setCrewReadyFilter(value as 'all' | 'ready' | 'not-ready')}
  >
    <SelectTrigger className="w-[180px]" aria-label="Crew Status" data-testid="crew-status-filter">
      <SelectValue placeholder="Crew Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Alla anställda</SelectItem>
      <SelectItem value="ready">Crew Ready</SelectItem>
      <SelectItem value="not-ready">Inte Crew Ready</SelectItem>
    </SelectContent>
  </Select>
)}
```

**Role Check Implementation:**
```219:219:src/components/dashboard/employee-table.tsx
const isHRAdmin = user?.role === "hr_admin";
```

**Search Input (Correctly Outside Role Check):**
```1757:1791:src/components/dashboard/employee-table.tsx
<div className="relative flex-1 max-w-sm w-full">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder={tDashboard("searchPlaceholder")}
    value={globalFilter ?? ""}
    onChange={(e) => setGlobalFilter(e.target.value)}
    className="pl-9 pr-9"
  />
  {globalFilter && (
    <button
      onClick={() => setGlobalFilter("")}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label="Clear search"
    >
      <X className="h-4 w-4" />
    </button>
  )}
</div>
```

### ✅ Approval

**Status:** **APPROVED FOR MERGE**

The implementation is solid, well-tested, and ready for production. All test warnings and errors have been resolved. Tests run cleanly without any console noise.

---

## Change Log

- **2025-01-XX**: Story 17.5 implementation complete
  - Added conditional rendering for Crew Ready filter dropdown (HR Admin only)
  - Created comprehensive unit tests
  - All acceptance criteria satisfied
  - All tests passing (2306/2306)
- **2025-01-XX**: Code review completed
  - Review status: ✅ APPROVED
  - All acceptance criteria verified
  - Implementation quality: Excellent
- **2025-01-XX**: Test cleanup completed
  - Fixed IndexedDB errors by mocking mutation queue service
  - Fixed React `act()` warnings by wrapping async renders
  - Added missing mocks for `useImportantDates` and `useUIStore` hooks
  - All tests passing cleanly without warnings or errors

