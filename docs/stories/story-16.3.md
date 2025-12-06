# Story 16.3: Frontend Change Tracking Hook

**Story:** As a developer, I want a React hook that manages change detection state and fetches changes on dashboard load, so that components can access change information for displaying notifications and highlights.

**Status:** Done  
**Epic:** Epic 16: Employee Data Change Notifications

---

## Acceptance Criteria

### Criterion 1: Hook Creation
- **Given** a React component needs change information
- **When** it uses the `useEmployeeChanges()` hook
- **Then** the hook provides:
  - `changedEmployees`: Array of employee change objects
  - `totalCount`: Number of employees with changes
  - `isLoading`: Boolean indicating fetch status
  - `error`: Error object if fetch failed
  - `changesBaseline`: The timestamp used for comparison
- **And** the hook automatically fetches changes on mount

### Criterion 2: Baseline Capture
- **Given** the dashboard loads
- **When** the hook initializes
- **Then** it captures the current `user.last_active_at` as `changesBaseline` once per session
- **And** stores it in component state or sessionStorage
- **And** uses this baseline for the initial fetch
- **And** if `user.last_active_at` is null (first-time user), it returns empty results (no changes to highlight)
- **And** the same baseline is used across all tabs in the same session (not per-tab)

### Criterion 3: Change Fetching
- **Given** the hook is mounted
- **When** it fetches changes
- **Then** it calls `GET /api/employees/changes-since-last-active`
- **And** passes the `changesBaseline` timestamp
- **And** handles loading and error states
- **And** stores the response in hook state

### Criterion 4: Refresh Capability
- **Given** the hook has fetched changes
- **When** `refreshChanges()` is called (e.g., on page refresh)
- **Then** it updates `changesBaseline` to current `user.last_active_at`
- **And** re-fetches changes with new baseline
- **And** updates the change state

### Criterion 5: Change Lookup Helper
- **Given** an employee ID and column name
- **When** `isColumnChanged(employeeId, columnName)` is called
- **Then** it returns `true` if that column changed for that employee
- **And** returns `false` if no change detected
- **And** handles cases where employee/column not in changes

### Criterion 6: State Management
- **Given** the hook manages change state
- **When** changes are fetched
- **Then** state is stored in a way that persists during the session
- **And** state is accessible to child components (via context or prop drilling)
- **And** state updates trigger re-renders appropriately

### Criterion 7: Performance Optimization
- **Given** the hook fetches changes
- **When** it runs
- **Then** it doesn't cause unnecessary re-renders
- **And** it uses appropriate memoization for lookup functions
- **And** it doesn't block dashboard rendering

---

## Technical Notes

### Hook Structure

```typescript
export function useEmployeeChanges() {
  const { user } = useAuth();
  const [changesBaseline, setChangesBaseline] = useState<string | null>(null);
  const [changedEmployees, setChangedEmployees] = useState<ChangedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch changes on mount - baseline captured once per session
  useEffect(() => {
    // First-time users: no changes to show (this is their first view)
    if (!user?.last_active_at) {
      setIsLoading(false);
      setChangedEmployees([]);
      return;
    }

    // Check sessionStorage for existing baseline (same session, multiple tabs)
    const sessionBaseline = sessionStorage.getItem('employee-changes-baseline');
    const baseline = sessionBaseline || user.last_active_at;
    
    if (!sessionBaseline) {
      sessionStorage.setItem('employee-changes-baseline', baseline);
    }
    
    setChangesBaseline(baseline);
    fetchChanges(baseline);
  }, [user?.last_active_at]);

  const fetchChanges = async (baseline: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/employees/changes-since-last-active?baseline=${baseline}`);
      const data = await response.json();
      setChangedEmployees(data.changedEmployees);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch changes'));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshChanges = () => {
    if (user?.last_active_at) {
      const newBaseline = user.last_active_at;
      setChangesBaseline(newBaseline);
      fetchChanges(newBaseline);
    }
  };

  const isColumnChanged = useCallback((employeeId: string, columnName: string): boolean => {
    const employee = changedEmployees.find(e => e.employeeId === employeeId);
    return employee?.changedColumns.includes(columnName) ?? false;
  }, [changedEmployees]);

  return {
    changedEmployees,
    totalCount: changedEmployees.length,
    isLoading,
    error,
    changesBaseline,
    refreshChanges,
    isColumnChanged
  };
}
```

### Type Definitions

```typescript
interface ChangedEmployee {
  employeeId: string;
  changedColumns: string[];  // db_column_names
  lastChangeAt: string;
}

interface UseEmployeeChangesReturn {
  changedEmployees: ChangedEmployee[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  changesBaseline: string | null;
  refreshChanges: () => void;
  isColumnChanged: (employeeId: string, columnName: string) => boolean;
}
```

### Integration Points

- **useAuth hook:** Get current user and `last_active_at`
- **Dashboard page:** Use hook to provide change data to child components
- **Employee table:** Use `isColumnChanged` to determine highlighting
- **Banner component:** Use `totalCount` and `changesBaseline` for display

### State Persistence

- Store `changesBaseline` in sessionStorage to ensure it's consistent across all tabs in the same session
- Baseline is captured once per session (first dashboard load)
- On page refresh within the same session, reuse the same baseline (don't re-capture)
- On new login (new session), capture new baseline
- First-time users (null `last_active_at`): Return empty results - no changes to highlight since this is their first view

### Error Handling

- Handle network errors gracefully
- Show error state but don't block dashboard rendering
- Log errors for debugging
- Consider retry logic for transient failures

---

## Tasks

- [x] Create hook file: `src/lib/hooks/use-employee-changes.ts`
- [x] Define TypeScript interfaces for change data
- [x] Implement hook with state management
- [x] Implement baseline capture logic
- [x] Implement fetch function with API call
- [x] Implement `isColumnChanged` helper with memoization
- [x] Implement `refreshChanges` function
- [x] Add error handling
- [x] Add loading state management
- [x] Test hook in isolation
- [x] Test hook integration with API
- [x] Test error scenarios
- [x] Test performance (memoization, re-renders)
- [x] Add JSDoc comments

---

## Prerequisites

- Story 16.2: API Endpoint for Change Detection (API must exist)
- Story 1.3: Authentication System (useAuth hook must exist)
- React hooks and state management patterns established

---

## Testing Requirements

### Unit Tests
- Test hook initialization
- Test baseline capture
- Test fetch function
- Test `isColumnChanged` helper
- Test `refreshChanges` function
- Test error handling
- Test loading states

### Integration Tests
- Test hook with mock API responses
- Test hook with real API (in test environment)
- Test hook integration with dashboard component
- Test state updates trigger re-renders

### Manual Testing
- Use hook in dashboard component
- Verify changes are fetched on load
- Verify `isColumnChanged` returns correct values
- Verify refresh functionality works
- Verify error states display correctly

---

## Dev Agent Record

### Completion Notes

**Implementation Summary:**
- Created `useEmployeeChanges` hook with full state management
- Implemented baseline capture using sessionStorage for cross-tab consistency
- Added automatic fetch on mount with proper loading/error states
- Implemented `isColumnChanged` helper with memoization for performance
- Added `refreshChanges` function to update baseline and re-fetch
- Comprehensive error handling for network and API errors
- Full TypeScript type safety with exported interfaces

**Key Features:**
- Baseline captured once per session (first dashboard load)
- Shared baseline across all tabs via sessionStorage
- First-time users (null `last_active_at`) return empty results immediately
- Memoized lookup functions prevent unnecessary re-renders
- Graceful error handling that doesn't block rendering

**Testing:**
- 20 unit tests covering all acceptance criteria
- 12 integration tests for API interaction and real-world scenarios
- All tests passing (100% pass rate)
- Tests organized in `tests/unit/epic-16/story-16.3/` and `tests/integration/epic-16/story-16.3/`

### File List

**Created:**
- `src/lib/hooks/use-employee-changes.ts` - Main hook implementation
- `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts` - Unit tests (20 tests)
- `tests/integration/epic-16/story-16.3/use-employee-changes.test.ts` - Integration tests (12 tests)

**Modified:**
- `docs/stories/story-16.3.md` - Updated tasks, status, and added Dev Agent Record

## Change Log

| Date       | Description                                    | Author    |
| ---------- | ---------------------------------------------- | --------- |
| 2025-12-05 | Created useEmployeeChanges hook with full implementation | Dev Agent |
| 2025-12-05 | Added comprehensive unit tests (20 tests)     | Dev Agent |
| 2025-12-05 | Added integration tests (12 tests)             | Dev Agent |
| 2025-12-05 | Senior Developer Review notes appended        | AI Review |

---

## Senior Developer Review (AI)

**Reviewer:** Raz  
**Date:** 2025-12-05  
**Outcome:** Approve

### Summary

The `useEmployeeChanges` hook implementation is **complete and production-ready**. All 7 acceptance criteria are fully implemented with comprehensive test coverage (32 tests total, 100% pass rate). Code quality is excellent with proper TypeScript typing, error handling, and performance optimizations. The implementation follows React best practices and aligns with the epic's technical architecture.

**Key Strengths:**
- Complete AC coverage with evidence in code
- Comprehensive test suite (20 unit + 12 integration tests)
- Proper memoization and performance optimizations
- Robust error handling that doesn't block rendering
- Clean TypeScript interfaces and JSDoc documentation

**Minor Observations:**
- Some React testing warnings about `act()` wrapping (non-blocking, test quality improvement)
- Hook not yet integrated into dashboard (expected - integration in stories 16.4/16.5)

### Key Findings

**HIGH Severity:** None

**MEDIUM Severity:** None

**LOW Severity:**
- Test warnings about React `act()` wrapping in some tests (non-functional, test quality improvement)

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Hook Creation - Provides all required properties and auto-fetches on mount | ✅ IMPLEMENTED | `src/lib/hooks/use-employee-changes.ts:57-154` - Hook exports all required properties (changedEmployees, totalCount, isLoading, error, changesBaseline, refreshChanges, isColumnChanged). Auto-fetch implemented in `useEffect` at line 99-119. Verified by unit tests: `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:73-135` |
| AC2 | Baseline Capture - Captures once per session, stores in sessionStorage, handles first-time users | ✅ IMPLEMENTED | `src/lib/hooks/use-employee-changes.ts:99-119` - Baseline capture logic with sessionStorage at lines 109-115. First-time user handling at lines 101-106. Cross-tab consistency via sessionStorage. Verified by unit tests: `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:137-255` |
| AC3 | Change Fetching - Calls correct API endpoint with baseline parameter, handles loading/error states | ✅ IMPLEMENTED | `src/lib/hooks/use-employee-changes.ts:67-93` - `fetchChanges` function calls `/api/employees/changes-since-last-active` with baseline parameter (line 72-73). Loading state managed (lines 68, 91). Error handling (lines 76-88). Verified by unit tests: `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:257-354` |
| AC4 | Refresh Capability - Updates baseline and re-fetches changes | ✅ IMPLEMENTED | `src/lib/hooks/use-employee-changes.ts:125-132` - `refreshChanges` function updates baseline to current `user.last_active_at` and re-fetches. Also updates sessionStorage (line 129). Verified by unit tests: `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:356-445` |
| AC5 | Change Lookup Helper - `isColumnChanged` returns correct boolean values | ✅ IMPLEMENTED | `src/lib/hooks/use-employee-changes.ts:138-144` - `isColumnChanged` function with memoization. Handles all edge cases (employee not found, column not in changes). Verified by unit tests: `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:447-550` |
| AC6 | State Management - State persists during session, accessible to components | ✅ IMPLEMENTED | `src/lib/hooks/use-employee-changes.ts:59-62` - State managed via React `useState`. State accessible via hook return value. Verified by unit tests: `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:552-584` |
| AC7 | Performance Optimization - No unnecessary re-renders, memoization used | ✅ IMPLEMENTED | `src/lib/hooks/use-employee-changes.ts:67,125,138` - `fetchChanges`, `refreshChanges`, and `isColumnChanged` all use `useCallback` for memoization. Verified by unit tests: `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:586-610` |

**Summary:** 7 of 7 acceptance criteria fully implemented (100% coverage)

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Create hook file: `src/lib/hooks/use-employee-changes.ts` | ✅ Complete | ✅ VERIFIED COMPLETE | File exists: `src/lib/hooks/use-employee-changes.ts` (157 lines) |
| Define TypeScript interfaces for change data | ✅ Complete | ✅ VERIFIED COMPLETE | Interfaces defined: `ChangedEmployee` (lines 16-20), `UseEmployeeChangesReturn` (lines 34-42), `ChangesResponse` (lines 25-29) |
| Implement hook with state management | ✅ Complete | ✅ VERIFIED COMPLETE | State management implemented with `useState` hooks (lines 59-62) |
| Implement baseline capture logic | ✅ Complete | ✅ VERIFIED COMPLETE | Baseline capture in `useEffect` (lines 99-119) with sessionStorage integration |
| Implement fetch function with API call | ✅ Complete | ✅ VERIFIED COMPLETE | `fetchChanges` function (lines 67-93) calls API endpoint correctly |
| Implement `isColumnChanged` helper with memoization | ✅ Complete | ✅ VERIFIED COMPLETE | `isColumnChanged` implemented with `useCallback` (lines 138-144) |
| Implement `refreshChanges` function | ✅ Complete | ✅ VERIFIED COMPLETE | `refreshChanges` function (lines 125-132) updates baseline and re-fetches |
| Add error handling | ✅ Complete | ✅ VERIFIED COMPLETE | Error handling in `fetchChanges` (lines 76-88) with proper error state management |
| Add loading state management | ✅ Complete | ✅ VERIFIED COMPLETE | Loading state managed in `fetchChanges` (lines 68, 91) and initial state (line 61) |
| Test hook in isolation | ✅ Complete | ✅ VERIFIED COMPLETE | 20 unit tests in `tests/unit/epic-16/story-16.3/use-employee-changes.test.ts` - all passing |
| Test hook integration with API | ✅ Complete | ✅ VERIFIED COMPLETE | 12 integration tests in `tests/integration/epic-16/story-16.3/use-employee-changes.test.ts` - all passing |
| Test error scenarios | ✅ Complete | ✅ VERIFIED COMPLETE | Error handling tests in unit tests (lines 612-662) and integration tests (lines 127-161) |
| Test performance (memoization, re-renders) | ✅ Complete | ✅ VERIFIED COMPLETE | Performance tests in unit tests (lines 586-610) and integration tests (lines 357-443) |
| Add JSDoc comments | ✅ Complete | ✅ VERIFIED COMPLETE | JSDoc comments present: file header (lines 1-8), function docs (lines 46-56, 64-66, 95-98, 121-124, 134-137) |

**Summary:** 13 of 13 completed tasks verified (100% verification rate, 0 false completions, 0 questionable)

### Test Coverage and Gaps

**Unit Tests:** 20 tests covering all acceptance criteria
- ✅ AC1: Hook creation and auto-fetch (2 tests)
- ✅ AC2: Baseline capture (4 tests)
- ✅ AC3: Change fetching (3 tests)
- ✅ AC4: Refresh capability (2 tests)
- ✅ AC5: Change lookup helper (4 tests)
- ✅ AC6: State management (1 test)
- ✅ AC7: Performance optimization (1 test)
- ✅ Error handling (3 tests)

**Integration Tests:** 12 tests for real-world scenarios
- ✅ API integration (4 tests)
- ✅ Real-world scenarios (4 tests)
- ✅ Session management (2 tests)
- ✅ Performance and memoization (2 tests)

**Test Quality:**
- All 32 tests passing (100% pass rate)
- Tests organized per epic/story structure as required
- Minor warnings about React `act()` wrapping in some tests (non-functional, test quality improvement)

**Coverage Gaps:** None identified - comprehensive coverage of all acceptance criteria

### Architectural Alignment

**Tech Stack:** Next.js 16.0.7, React 19.2.0, TypeScript 5.9.3, Vitest 4.0.15

**Architecture Compliance:**
- ✅ Follows React hooks patterns and best practices
- ✅ Proper separation of concerns (hook handles state, API, and business logic)
- ✅ TypeScript interfaces exported for reuse (matches epic requirements)
- ✅ Error handling doesn't block rendering (matches epic NFRs)
- ✅ Performance optimizations via memoization (matches epic NFRs)
- ✅ SessionStorage usage aligns with epic technical architecture

**Integration Points:**
- ✅ Uses `useAuth` hook as specified in prerequisites
- ✅ Ready for integration in stories 16.4 (Banner) and 16.5 (Field Highlighting)
- ✅ Hook interface matches expected usage patterns

### Security Notes

**Security Review:**
- ✅ API endpoint uses URL encoding for baseline parameter (`encodeURIComponent`)
- ✅ No sensitive data stored in sessionStorage (only timestamp)
- ✅ Error messages don't expose internal implementation details
- ✅ Proper error handling prevents information leakage
- ✅ No XSS vulnerabilities identified (React handles escaping)
- ✅ No authentication bypass (relies on `useAuth` hook)

**Recommendations:** None - security practices are sound

### Best-Practices and References

**React Best Practices:**
- ✅ Proper use of `useCallback` for memoization
- ✅ Correct dependency arrays in hooks
- ✅ Error boundaries handled gracefully
- ✅ Loading states prevent UI blocking

**TypeScript Best Practices:**
- ✅ Exported interfaces for type safety
- ✅ Proper null handling with optional chaining
- ✅ Type guards for error handling

**Testing Best Practices:**
- ✅ Comprehensive unit and integration test coverage
- ✅ Tests organized by acceptance criteria
- ✅ Mock implementations for external dependencies

**References:**
- React Hooks: https://react.dev/reference/react
- TypeScript Best Practices: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Vitest Testing: https://vitest.dev/

### Action Items

**Code Changes Required:**
- [ ] [Low] Wrap React state updates in `act()` in unit tests to eliminate warnings [file: tests/unit/epic-16/story-16.3/use-employee-changes.test.ts:74-135, 356-445] - This is a test quality improvement, not a functional issue

**Advisory Notes:**
- Note: Hook is ready for integration in stories 16.4 and 16.5. No changes needed to hook implementation.
- Note: Consider adding retry logic for transient network failures in future enhancement (out of scope for this story).

---

**Review Complete:** Story 16.3 is approved and ready for integration in subsequent stories.

