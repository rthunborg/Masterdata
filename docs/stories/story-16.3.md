# Story 16.3: Frontend Change Tracking Hook

**Story:** As a developer, I want a React hook that manages change detection state and fetches changes on dashboard load, so that components can access change information for displaying notifications and highlights.

**Status:** pending  
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
- **Then** it captures the current `user.last_active_at` as `changesBaseline`
- **And** stores it in component state or sessionStorage
- **And** uses this baseline for the initial fetch

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

  // Fetch changes on mount
  useEffect(() => {
    if (!user?.last_active_at) {
      setIsLoading(false);
      return;
    }

    const baseline = user.last_active_at;
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

- Store `changesBaseline` in component state (not persisted across page refreshes)
- On page refresh, capture new baseline and re-fetch
- Consider storing in sessionStorage if needed for cross-page persistence

### Error Handling

- Handle network errors gracefully
- Show error state but don't block dashboard rendering
- Log errors for debugging
- Consider retry logic for transient failures

---

## Tasks

- [ ] Create hook file: `src/lib/hooks/use-employee-changes.ts`
- [ ] Define TypeScript interfaces for change data
- [ ] Implement hook with state management
- [ ] Implement baseline capture logic
- [ ] Implement fetch function with API call
- [ ] Implement `isColumnChanged` helper with memoization
- [ ] Implement `refreshChanges` function
- [ ] Add error handling
- [ ] Add loading state management
- [ ] Test hook in isolation
- [ ] Test hook integration with dashboard
- [ ] Test error scenarios
- [ ] Test performance (memoization, re-renders)
- [ ] Add JSDoc comments

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

