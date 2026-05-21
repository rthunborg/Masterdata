# Story 20.5: Filter Visual Indicators

**Epic:** [Epic 20 - Advanced Employee Filtering](../epic-20.md)
**Status:** Done
**Points:** 2-3
**Assignee:** Amelia (Dev)

## User Story

As a user, I want clear visual indicators when filters are active, so I always know if I'm viewing filtered data and can easily clear filters.

## Context

Users need immediate visual feedback about filter state:
- Badge on filter button showing active filter count
- "Clear Filter" button that appears when filters active
- Filtered count display ("Showing X of Y employees")
- Visual highlight on FilterButton when active

## Acceptance Criteria

1. **AC 1: Filter Button Badge**
   - [ ] When no filters active: Button shows "Filter" with filter icon
   - [ ] When filters active: Button shows badge with count (e.g., "Filter (3)")
   - [ ] Badge styled to stand out (primary color, slight pulse animation)
   - [ ] Count updates immediately when filters change

2. **AC 2: Clear Filter Button**
   - [ ] Button appears next to Filter button when filters active
   - [ ] Label: "Rensa filter" (Swedish for "Clear filter")
   - [ ] Icon: X or refresh icon
   - [ ] Clicking clears all active filters
   - [ ] Button hidden when no filters active

3. **AC 3: Filtered Count Display**
   - [ ] Show "Showing X of Y employees" above table
   - [ ] X = filtered count, Y = total count
   - [ ] Update in real-time as filters change
   - [ ] Hide when no filters active (show total only)

4. **AC 4: Active Filter List (Optional in Panel)**
   - [ ] Show list of active filters at top of filter panel
   - [ ] Each filter shows: Column name + value/criteria
   - [ ] X button next to each to remove individual filter
   - [ ] Example: "First Name: john [X]"

5. **AC 5: Visual Feedback on Apply**
   - [ ] Brief loading state when filter calculating (>50ms)
   - [ ] Smooth transition when employee list updates
   - [ ] No jarring flashes or jumps

6. **AC 6: Empty State When No Matches**
   - [ ] Show friendly message when filters return no results
   - [ ] Message: "No employees match your filters. Try adjusting your criteria."
   - [ ] Provide quick "Clear filters" action
   - [ ] Show active filters so user knows what to adjust

## Technical Details

### FilterButton Component Updates

```typescript
interface FilterButtonProps {
  onClick: () => void;
  isActive: boolean;
  filterCount: number;
}

export function FilterButton({ onClick, isActive, filterCount }: FilterButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={isActive ? "default" : "outline"}
      className={cn(
        "relative",
        isActive && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <Filter className="mr-2 h-4 w-4" />
      Filter
      {filterCount > 0 && (
        <Badge
          className="ml-2 animate-pulse"
          variant="secondary"
        >
          {filterCount}
        </Badge>
      )}
    </Button>
  );
}
```

### Clear Filter Button

```typescript
export function ClearFilterButton({
  onClick,
  show
}: {
  onClick: () => void;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className="text-muted-foreground hover:text-foreground"
    >
      <X className="mr-2 h-4 w-4" />
      Rensa filter
    </Button>
  );
}
```

### Filtered Count Display

```typescript
export function FilteredCountDisplay({
  filteredCount,
  totalCount,
  show
}: {
  filteredCount: number;
  totalCount: number;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <p className="text-sm text-muted-foreground">
      Showing <span className="font-medium">{filteredCount}</span> of {totalCount} employees
    </p>
  );
}
```

### Active Filters List (in Panel)

```typescript
export function ActiveFiltersList({
  filters,
  columnConfigs,
  onRemove
}: {
  filters: FilterState[];
  columnConfigs: ColumnConfig[];
  onRemove: (columnId: string) => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="border-b pb-4 mb-4">
      <h3 className="text-sm font-medium mb-2">Active Filters:</h3>
      <div className="space-y-2">
        {filters.map(filter => {
          const column = columnConfigs.find(c => c.id === filter.columnId);
          if (!column) return null;

          return (
            <div
              key={filter.columnId}
              className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
            >
              <span className="text-sm">
                <strong>{column.display_name}:</strong> {formatFilterValue(filter)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(filter.columnId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatFilterValue(filter: FilterState): string {
  switch (filter.type) {
    case 'text':
      return `"${filter.textValue}"`;
    case 'boolean':
      return filter.boolValue ? 'Yes' : 'No';
    case 'date':
      // Format date range or specific dates
      return '...'; // Implement formatting
    default:
      return '';
  }
}
```

### Empty State

```typescript
export function EmptyFilterState({
  activeFilters,
  onClearFilters
}: {
  activeFilters: FilterState[];
  onClearFilters: () => void;
}) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No employees found</h3>
      <p className="text-muted-foreground mb-4">
        No employees match your current filter criteria.
      </p>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Active filters:</p>
        <ul className="text-sm">
          {activeFilters.map(filter => (
            <li key={filter.columnId}>• {/* Format filter */}</li>
          ))}
        </ul>
      </div>
      <Button onClick={onClearFilters} className="mt-4">
        Clear all filters
      </Button>
    </div>
  );
}
```

### Loading State

```typescript
const [isFiltering, setIsFiltering] = useState(false);

// Debounced filtering with loading state
const applyFilterWithLoading = async (filter: FilterState) => {
  setIsFiltering(true);

  // Use setTimeout to allow loading state to render
  setTimeout(() => {
    applyFilter(filter);
    setIsFiltering(false);
  }, 0);
};

// Show loading overlay only if filtering takes >50ms
{isFiltering && (
  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
)}
```

## Files to Create

1. `src/components/dashboard/ClearFilterButton.tsx`
2. `src/components/dashboard/FilteredCountDisplay.tsx`
3. `src/components/dashboard/FilterPanel/ActiveFiltersList.tsx`
4. `src/components/dashboard/EmptyFilterState.tsx`

## Files to Modify

1. `src/components/dashboard/FilterPanel/FilterButton.tsx`
   - Add badge display
   - Add active state styling

2. `src/components/dashboard/employee-table.tsx`
   - Add ClearFilterButton next to FilterButton
   - Add FilteredCountDisplay above table
   - Add EmptyFilterState when no results

3. `src/components/dashboard/FilterPanel/FilterPanel.tsx`
   - Add ActiveFiltersList at top

## Definition of Done

- [x] Filter button shows badge when filters active
- [x] Badge count updates in real-time
- [x] Clear filter button appears/disappears correctly
- [x] Clicking clear button removes all filters
- [x] Filtered count displays correctly
- [x] Empty state shows when no matches
- [x] Loading state shows for slow filters (>50ms)
- [x] All transitions smooth (no flashing)
- [x] Accessibility: Screen reader announcements work
- [x] Unit tests written and passing
- [x] Visual regression tests pass
- [x] Code reviewed
- [x] No linter errors

## Testing Strategy

### Unit Tests

```typescript
describe('FilterButton', () => {
  it('shows no badge when filterCount is 0', () => {});
  it('shows badge with count when filters active', () => {});
  it('has primary variant when active', () => {});
  it('has outline variant when inactive', () => {});
});

describe('ClearFilterButton', () => {
  it('renders when show is true', () => {});
  it('does not render when show is false', () => {});
  it('calls onClick when clicked', () => {});
});

describe('EmptyFilterState', () => {
  it('displays message when no employees match', () => {});
  it('lists active filters', () => {});
  it('calls onClearFilters when button clicked', () => {});
});
```

### Integration Tests

- Apply filter → verify badge appears
- Apply multiple filters → verify count increases
- Clear filters → verify UI resets
- Filter to empty result → verify empty state shows

### Visual Regression Tests

- Capture FilterButton with badge
- Capture ClearFilterButton
- Capture empty state
- Capture filtered count display

## Dependencies

- Story 20.4 complete (filter engine working)
- Existing UI component library (shadcn/ui)

## Notes

- Keep animations subtle - don't distract from main content
- Ensure color contrast meets WCAG AA standards
- Test with screen reader for accessibility
- Consider adding confetti animation when user finds exactly 1 employee (Easter egg)

---

## Dev Agent Record - Code Review Fixes (2026-01-30)

### Issues Found and Fixed by Code Review

**Critical Issues Fixed:**
1. **AC 5 - Loading State Missing** ✅ FIXED
   - Added `isFiltering` state to `useEmployeeFilters` hook
   - Implemented 50ms threshold before showing loading indicator (prevents flashing for fast operations)
   - Added loading overlay with spinner and "Filtering..." message to employee table
   - **Files:** `src/hooks/useEmployeeFilters.ts`, `src/components/dashboard/employee-table.tsx`

**Medium Issues Fixed:**
2. **AC 1 - Badge Pulse Animation Missing** ✅ FIXED
   - Added `animate-pulse` class to filter count badge
   - **File:** `src/components/dashboard/FilterPanel/FilterButton.tsx`

3. **AC 5 - ARIA Live Announcements Missing** ✅ FIXED
   - Added ARIA live region with `role="status"` and `aria-live="polite"`
   - Announces filter changes: "X filters active. Showing Y of Z employees."
   - Screen reader accessible, visually hidden with `sr-only` class
   - **File:** `src/components/dashboard/employee-table.tsx`

4. **Documentation Accuracy** ✅ VERIFIED
   - Verified `ActiveFiltersList` export exists in `index.ts`
   - Note: `FilterPanel/` directory shown as untracked in git because it was created in Story 20.2, not Story 20.5

**Low Priority Issues (Also Fixed):**
5. **Badge Overflow Protection** ✅ FIXED
   - Badge now displays "9+" for 10 or more filters
   - Prevents layout issues with very high filter counts
   - **File:** `src/components/dashboard/FilterPanel/FilterButton.tsx`

6. **Date Filter Formatting Enhancement** ✅ FIXED
   - Empty state and active filters list now show actual date names instead of just count
   - Format: Single date name, or "Date1, Date2" for 2 dates, or "Date1, Date2 +N more" for 3+
   - Falls back to count if date lookups fail
   - **Files:** `src/components/dashboard/EmptyFilterState.tsx`, `src/components/dashboard/FilterPanel/ActiveFiltersList.tsx`, `src/components/dashboard/FilterPanel/FilterPanel.tsx`

### Files Modified in Code Review
1. `src/components/dashboard/FilterPanel/FilterButton.tsx` - Added pulse animation + 9+ overflow
2. `src/hooks/useEmployeeFilters.ts` - Added loading state with 50ms threshold
3. `src/components/dashboard/employee-table.tsx` - Added ARIA live region, loading overlay, importantDates props
4. `src/components/dashboard/EmptyFilterState.tsx` - Added importantDates prop, improved date formatting
5. `src/components/dashboard/FilterPanel/ActiveFiltersList.tsx` - Added importantDates prop, improved date formatting
6. `src/components/dashboard/FilterPanel/FilterPanel.tsx` - Added importantDates prop passthrough

### Tests Added
- Badge overflow: 2 new tests for 9+ display logic
- Date formatting: 2 new tests for actual date names and truncation
- **Total tests:** 34 passing (up from 30)

### Review Status
- **Original Status:** Ready for Review
- **Final Status:** Done
- **Issues Fixed:** 6 (1 Critical, 3 Medium, 2 Low)
- **Issues Deferred:** 0
- **Tests:** 34/34 passing ✅
- **Linter:** 0 errors ✅
