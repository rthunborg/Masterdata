# Story 20.4 Context

## Filter Logic Architecture

### Why Pure Functions?

The filter engine uses pure functions for several reasons:

1. **Testability:** Easy to test - no side effects, no mocks needed
2. **Performance:** Easy to memoize - same inputs always produce same outputs
3. **Predictability:** No hidden state or dependencies
4. **Reusability:** Can be used in different contexts (web worker, server-side, etc.)

```typescript
// Pure function - always returns same output for same inputs
function applyFilters(employees, filters, dates) {
  return employees.filter(/* ... */);
}

// NOT pure - depends on external state
function applyFilters(employees) {
  const filters = getCurrentFilters(); // External dependency
  return employees.filter(/* ... */);
}
```

### AND vs OR Logic

**Between Columns (AND):**
Employee must match ALL active filters to be included.

Example: Filter by "first_name contains 'John'" AND "hotel_required = true"
- Result: Only employees named John who need hotel

```typescript
// AND logic between filters
filters.every(filter => matchesFilter(employee, filter))
```

**Within Column (OR):**
For date columns with range + specific dates, employee matches if EITHER condition is true.

Example: "omc_date between Jan-Mar" OR "omc_date = May 15"
- Result: Employees with OMC date in Q1 OR specifically on May 15

```typescript
// OR logic within date filter
matchesSpecific || matchesRange
```

### Filter Precedence

No precedence needed - all filters are equal. They all apply simultaneously.

## URL State Management

### Why URL Synchronization?

1. **Shareability:** Users can share exact filtered view via link
2. **Bookmarkability:** Save frequently-used filters as browser bookmarks
3. **Browser History:** Back button works to undo filter changes
4. **Refresh Resilience:** Filter state survives page refresh

### URL Format

```
https://example.com/dashboard?filters=eyJjb2x1bW5JZCI6ImZpcnN0X25hbWUiLCAidHlwZSI6InRleHQiLCAidGV4dFZhbHVlIjoiam9obiJ9

Decoded:
?filters=base64({
  "columnId": "first_name",
  "type": "text",
  "textValue": "john"
})
```

### Why Base64 Encoding?

**Alternatives Considered:**

| Approach | Pros | Cons |
|----------|------|------|
| JSON | Human-readable | Not URL-safe, requires encoding |
| Query params | Simple | Limited to flat key-value, verbose for complex filters |
| Base64 JSON | URL-safe, compact, handles complexity | Not human-readable |
| Compressed JSON | Smallest size | Complexity, slower decode |

**Decision:** Base64 JSON
- URL-safe by default
- Handles nested objects (date ranges, arrays)
- Simple encode/decode (native `btoa`/`atob`)
- Readable after decode (for debugging)

### Shallow Routing

```typescript
router.push(`?${params.toString()}`, { shallow: true });
```

**shallow: true** prevents:
- Page reload
- API refetch
- Component remount
- Scroll reset

Only updates URL without re-running page initialization.

### Debouncing URL Updates

Why debounce by 500ms?

```typescript
// Without debounce - typing "john" creates 4 history entries
"j" → update URL → history entry
"jo" → update URL → history entry
"joh" → update URL → history entry
"john" → update URL → history entry

// With debounce - only 1 history entry
"j" → wait...
"jo" → wait...
"joh" → wait...
"john" → wait 500ms → update URL → 1 history entry
```

Prevents polluting browser history with intermediate filter states.

## Performance Optimization

### Memoization Strategy

**useMemo for Filtered List:**
```typescript
const filteredEmployees = useMemo(() => {
  return applyFilters(employees, activeFilters, importantDates);
}, [employees, activeFilters, importantDates]);
```

Only recalculates when inputs actually change.

**Dependency Array Considerations:**
- `employees` - Changes when data fetched or updated
- `activeFilters` - Changes when user modifies filters
- `importantDates` - Changes when dates fetched (usually once)

### Benchmark Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Filter 100 employees (1 filter) | <10ms | Simple text filter |
| Filter 100 employees (5 filters) | <50ms | Complex multi-filter |
| URL encode/decode | <5ms | Native base64 ops |
| Apply filter + update URL | <100ms | Total user-perceived latency |

### Optimization Techniques

**Early Returns:**
```typescript
if (filters.length === 0) return employees;  // No work needed
```

**Field Access Optimization:**
```typescript
// Cache field value instead of repeated lookups
const fieldValue = employee[filter.columnId];
```

**String Comparison Optimization:**
```typescript
// Convert once, compare many
const valueStr = String(value).toLowerCase();
const searchStr = searchText.toLowerCase();
return valueStr.includes(searchStr);
```

## State Management Patterns

### Local vs Global State

**Local State (Component):**
- FilterPanel open/closed
- Expanded column ID
- Individual filter input values (before debounce)

**Global State (Hook):**
- Active filters array
- Filtered employee list
- Filter count

**URL State:**
- Active filters (serialized)

### State Flow Diagram

```
User Input (TextFilter)
  ↓
Local State (debounced)
  ↓
useEmployeeFilters Hook
  ↓
activeFilters State
  ↓ (memoized calculation)
filteredEmployees
  ↓
Employee Table Render
  ↓ (debounced)
URL Update
```

### Avoiding Infinite Loops

**Problem:**
URL change → Read URL → Update state → Sync to URL → URL change → ...

**Solution:**
Only sync to URL when user changes filters, not when reading from URL.

```typescript
// Initial load - read from URL, DON'T write back
const [activeFilters] = useState(() => {
  return readFromURL();  // No sync here
});

// User change - write to URL
const setFilters = (filters) => {
  setActiveFilters(filters);
  syncToURL(filters);  // Sync here
};
```

### React 18 Concurrent Mode Considerations

With React 18's concurrent rendering:
- Use `useTransition` for non-urgent filter updates
- Keep text input updates immediate (high priority)
- Defer expensive calculations (lower priority)

```typescript
const [isPending, startTransition] = useTransition();

const handleFilterChange = (filter) => {
  // Immediate: Update input value
  setLocalValue(filter.textValue);

  // Deferred: Calculate filtered list
  startTransition(() => {
    applyFilter(filter);
  });
};
```

## Error Handling & Edge Cases

### Corrupted URL Filters

```typescript
try {
  const filters = deserializeFilters(encoded);
  return filters;
} catch (error) {
  console.error('Invalid filter URL:', error);
  // Show toast notification
  toast.error('Invalid filter URL. Starting with empty filters.');
  return [];
}
```

### Missing Important Dates

If `important_dates` API fails:
```typescript
const { data: importantDates = [], error } = useQuery(...);

if (error) {
  // Graceful degradation: Allow text/boolean filters
  // Disable date filters
  return filteredEmployees.filter(/* without date filters */);
}
```

### Null/Undefined Employee Fields

```typescript
function matchesTextFilter(value, searchText) {
  if (value === null || value === undefined) return false;
  // Only match if field has a value
}
```

### Invalid Date Ranges

```typescript
if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
  // Swap them
  const temp = dateRange.from;
  dateRange.from = dateRange.to;
  dateRange.to = temp;
}
```

## Selection Integration

### Current Selection Logic

The existing `employee-table.tsx` has:
```typescript
const allVisibleIds = filteredEmployees.map(e => e.id);

const handleSelectAll = () => {
  if (allSelected) {
    // Deselect all visible
    setSelected(selected.filter(id => !allVisibleIds.includes(id)));
  } else {
    // Select all visible
    setSelected([...selected, ...allVisibleIds]);
  }
};
```

### Integration Point

```typescript
// Replace this:
const filteredEmployees = /* existing filter logic */;

// With this:
const { filteredEmployees } = useEmployeeFilters(employees);
```

### Selection Count Display

**Before:**
"3 of 87 employees selected"

**After (with filters):**
"3 of 23 employees selected (23 of 87 shown)"

Or simplified:
"3 of 23 selected"

## Testing Strategy

### Unit Test Philosophy

Test filter logic in isolation from React:
```typescript
// Pure function tests - no React needed
it('filters by text', () => {
  const employees = [
    { id: '1', first_name: 'John' },
    { id: '2', first_name: 'Jane' }
  ];

  const filters = [
    { columnId: 'first_name', type: 'text', textValue: 'john' }
  ];

  const result = applyFilters(employees, filters, []);

  expect(result).toEqual([{ id: '1', first_name: 'John' }]);
});
```

### Integration Test Philosophy

Test state management with React:
```typescript
it('applies filter and updates URL', async () => {
  const { result } = renderHook(() => useEmployeeFilters(employees));

  act(() => {
    result.current.applyFilter({
      columnId: 'first_name',
      type: 'text',
      textValue: 'john'
    });
  });

  await waitFor(() => {
    expect(window.location.search).toContain('filters=');
  });
});
```

### E2E Test Philosophy

Test complete user flow:
```typescript
test('user can filter and share via URL', async ({ page }) => {
  // User action: Apply filter
  await page.fill('input[name="first_name"]', 'John');

  // System behavior: Table updates
  await expect(page.locator('table tbody tr')).toHaveCount(5);

  // System behavior: URL updates
  await expect(page).toHaveURL(/filters=/);

  // User action: Share URL
  const url = page.url();

  // New user: Opens shared URL
  const newPage = await browser.newPage();
  await newPage.goto(url);

  // System behavior: Filter applied automatically
  await expect(newPage.locator('table tbody tr')).toHaveCount(5);
});
```

## Future Enhancements

### Filter History

Track filter history for quick switching:
```typescript
const [filterHistory, setFilterHistory] = useState<FilterState[][]>([]);

const applyFilter = (filter) => {
  setFilterHistory([...filterHistory, activeFilters]);
  setActiveFilters(/* new filters */);
};

const undo = () => {
  const previous = filterHistory[filterHistory.length - 1];
  setActiveFilters(previous);
  setFilterHistory(filterHistory.slice(0, -1));
};
```

### Filter Templates

Pre-configured filter combinations:
```typescript
const templates = {
  'New Hires': [
    { columnId: 'created_at', type: 'date', dateRange: { from: lastMonth, to: today } }
  ],
  'Needs Onboarding': [
    { columnId: 'one', type: 'boolean', boolValue: false },
    { columnId: 'talmundo', type: 'boolean', boolValue: false }
  ]
};
```

### Filter Analytics

Track which filters are used most:
```typescript
const logFilterUsage = (filter: FilterState) => {
  // Send to analytics
  analytics.track('filter_applied', {
    column: filter.columnId,
    type: filter.type
  });
};
```

These are out of scope for Epic 20 but could be valuable later.
