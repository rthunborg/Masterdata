# Story 20.3 Context

## Column Type Mapping

### System Column Types

Based on the existing database schema, columns have different `data_type` values:

| Data Type | Example Columns | Filter Type | Operator |
|-----------|----------------|-------------|----------|
| `text` | first_name, surname, email | Text search | contains |
| `varchar` | ssn, mobile, rank | Text search | contains |
| `boolean` | hotel_required, one, talmundo | Boolean radio | equals |
| `uuid` (dates) | omc_date, stena_date, pe3_date | Date picker + list | in / between |
| `uuid` (other) | id, created_by | Text search | equals |
| `integer` | room_number_shared | Number range | between |
| `timestamptz` | created_at, updated_at | Skip (system fields) | - |

### Why Different Controls?

**Text Search:**
- Most flexible for partial matching
- Users often don't know exact value
- Example: Search "john" in first_name finds "John", "Johnny", etc.

**Boolean Radios:**
- Only 3 states: Yes, No, Either
- Clear visual representation
- No ambiguity

**Date Picker + Checkboxes:**
- Dates are stored as UUID references to `important_dates` table
- Users might know specific date ("January 15th OMC") OR range ("Any OMC in Q1")
- Checkboxes show actual configured dates with context (category)
- Combines precision (specific dates) with flexibility (ranges)

## Debouncing Strategy

### Why Debounce?

Without debouncing, every keystroke triggers:
1. State update
2. Filter calculation
3. Table re-render
4. Potential URL update

For "John Doe":
- "J" → filter → render
- "Jo" → filter → render
- "Joh" → filter → render
- "John" → filter → render
- "John " → filter → render
- "John D" → filter → render
- ...

That's 8 filter operations for one search! With debouncing, we wait 300ms after last keystroke, resulting in 1 operation.

### Implementation

```typescript
// Utility (already exists in codebase)
import { debounce } from "@/lib/utils/animation-helpers";

// Usage in TextFilter
const debouncedOnChange = useMemo(
  () => debounce(onChange, 300),
  [onChange]
);

// Cleanup on unmount
useEffect(() => {
  return () => {
    debouncedOnChange.cancel();
  };
}, [debouncedOnChange]);
```

### Local vs Parent State

```typescript
// Local state for immediate UI feedback
const [localValue, setLocalValue] = useState(value);

// Update local immediately
const handleChange = (e) => {
  setLocalValue(e.target.value);      // Instant
  debouncedOnChange(e.target.value);  // After 300ms
};
```

This gives user instant visual feedback while preventing excessive calculations.

## Date Column Complexity

### Why Dates Are Special

In this system, date columns (`omc_date`, `stena_date`, `pe3_date`) are:
1. **UUID references** to `important_dates` table
2. **Not raw dates** - they're IDs pointing to date records
3. **Have metadata** - each date has a category and other info

### Important Dates Structure

```typescript
interface ImportantDate {
  id: string;                    // UUID
  date_value: string;            // ISO date string
  category: 'OMC' | 'STENA' | 'PE3';
  capacity: number;
  booked: number;
  available: number;
  is_active: boolean;
}
```

### Filtering Logic

**By Specific Dates (Checkboxes):**
```typescript
// Filter: omc_date IN ['uuid1', 'uuid2', 'uuid3']
employees.filter(emp => selectedDateIds.includes(emp.omc_date))
```

**By Date Range:**
```typescript
// Need to resolve UUID → actual date value first
employees.filter(emp => {
  const dateRecord = importantDates.find(d => d.id === emp.omc_date);
  if (!dateRecord) return false;

  const date = new Date(dateRecord.date_value);
  return date >= dateRange.from && date <= dateRange.to;
})
```

**Combined (OR logic):**
```typescript
employees.filter(emp => {
  // Match if in specific dates list
  const matchesSpecific = selectedDateIds.includes(emp.omc_date);

  // OR match if in date range
  const dateRecord = importantDates.find(d => d.id === emp.omc_date);
  const matchesRange = dateRecord &&
    new Date(dateRecord.date_value) >= dateRange.from &&
    new Date(dateRecord.date_value) <= dateRange.to;

  return matchesSpecific || matchesRange;
})
```

### Fetching Available Dates

```typescript
// Hook to fetch dates for a specific column
export function useAvailableDates(column: ColumnConfig) {
  // Determine category from field name
  const category = column.field_name === 'omc_date' ? 'OMC'
                 : column.field_name === 'stena_date' ? 'STENA'
                 : column.field_name === 'pe3_date' ? 'PE3'
                 : null;

  return useQuery({
    queryKey: ['important_dates', category],
    queryFn: async () => {
      const url = `/api/important-dates${category ? `?category=${category}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch dates');
      return response.json();
    },
    enabled: !!category  // Only fetch if we know the category
  });
}
```

### UI Considerations

**Checkbox List:**
- Show date value in readable format: "January 15, 2024"
- Show category: "OMC"
- Show capacity info (optional): "12/20 spots filled"
- Max height with scroll (if many dates)
- Search within dates (if >20 dates)

**Date Range Picker:**
- Use shadcn/ui Calendar component
- Allow "From" without "To" (open-ended)
- Allow "To" without "From" (all dates before)
- Clear button for range

## Filter State Structure

### FilterState Type

```typescript
interface FilterState {
  columnId: string;           // Column config ID
  type: 'text' | 'boolean' | 'date';

  // Text filter
  textValue?: string;

  // Boolean filter
  boolValue?: boolean | null;  // null = "Either"

  // Date filter
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  selectedDateIds?: string[];  // UUIDs of important_dates
}
```

### Example States

**Text filter active:**
```json
{
  "columnId": "col_first_name_123",
  "type": "text",
  "textValue": "john"
}
```

**Boolean filter active:**
```json
{
  "columnId": "col_hotel_required_456",
  "type": "boolean",
  "boolValue": true
}
```

**Date filter active (range only):**
```json
{
  "columnId": "col_omc_date_789",
  "type": "date",
  "dateRange": {
    "from": "2024-01-01T00:00:00.000Z",
    "to": "2024-03-31T23:59:59.999Z"
  }
}
```

**Date filter active (specific dates only):**
```json
{
  "columnId": "col_omc_date_789",
  "type": "date",
  "selectedDateIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Date filter active (both range and specific):**
```json
{
  "columnId": "col_omc_date_789",
  "type": "date",
  "dateRange": {
    "from": "2024-01-01T00:00:00.000Z",
    "to": "2024-03-31T23:59:59.999Z"
  },
  "selectedDateIds": ["uuid-special-date"]
}
```

## Component Communication

### Parent → Child (FilterColumnItem → Filter Controls)

```typescript
<FilterColumnItem
  column={column}
  isExpanded={expandedColumnId === column.id}
  onToggle={() => setExpandedColumnId(column.id)}
  activeFilter={filters.find(f => f.columnId === column.id)}
  onFilterChange={(filter) => {
    if (filter === null) {
      // Remove filter
      setFilters(filters.filter(f => f.columnId !== column.id));
    } else {
      // Add or update filter
      setFilters(filters.map(f =>
        f.columnId === column.id ? filter : f
      ).concat(filter));
    }
  }}
/>
```

### Child → Parent (Filter Controls → FilterColumnItem)

```typescript
// TextFilter
<TextFilter
  column={column}
  value={activeFilter?.textValue || ''}
  onChange={(value) => {
    onFilterChange({
      columnId: column.id,
      type: 'text',
      textValue: value
    });
  }}
  onClear={() => onFilterChange(null)}
/>

// BooleanFilter
<BooleanFilter
  column={column}
  value={activeFilter?.boolValue ?? null}
  onChange={(value) => {
    if (value === null) {
      onFilterChange(null);  // "Either" selected
    } else {
      onFilterChange({
        columnId: column.id,
        type: 'boolean',
        boolValue: value
      });
    }
  }}
/>

// DateFilter
<DateFilter
  column={column}
  dateRange={activeFilter?.dateRange || { from: null, to: null }}
  selectedDateIds={activeFilter?.selectedDateIds || []}
  onDateRangeChange={(range) => {
    onFilterChange({
      ...activeFilter,
      columnId: column.id,
      type: 'date',
      dateRange: range
    });
  }}
  onDateSelectionChange={(ids) => {
    onFilterChange({
      ...activeFilter,
      columnId: column.id,
      type: 'date',
      selectedDateIds: ids
    });
  }}
/>
```

## Performance Optimization

### Memoization

```typescript
// In FilterColumnItem
const filterControl = useMemo(() => {
  return renderFilterControl();
}, [column.id, column.data_type, activeFilter]);
```

### Lazy Loading Dates

Only fetch available dates when date column is expanded:

```typescript
const { data: availableDates } = useAvailableDates(column, {
  enabled: isExpanded && column.field_name.includes('_date')
});
```

### Virtual Scrolling for Many Checkboxes

If there are 50+ important dates:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={200}
  itemCount={availableDates.length}
  itemSize={35}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <Checkbox ... />
      <Label>{availableDates[index].date_value}</Label>
    </div>
  )}
</FixedSizeList>
```

## Accessibility

### Keyboard Navigation

- Tab through filter controls
- Space to toggle checkboxes
- Enter to select radio buttons
- Arrow keys to navigate date picker

### Screen Reader Support

```jsx
<div role="group" aria-labelledby={`filter-${column.id}`}>
  <h3 id={`filter-${column.id}`}>{column.display_name} Filter</h3>
  {/* Filter controls */}
</div>
```

### ARIA Live Regions

Announce filter changes:

```jsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {activeFilter ? `Filtering by ${column.display_name}` : ''}
</div>
```

## Error Handling

### Failed Date Fetch

```typescript
const { data, error, isLoading } = useAvailableDates(column);

if (error) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        Failed to load available dates. Please try again.
      </AlertDescription>
    </Alert>
  );
}
```

### Invalid Date Range

```typescript
if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
  return (
    <p className="text-sm text-red-500">
      "From" date must be before "To" date
    </p>
  );
}
```
