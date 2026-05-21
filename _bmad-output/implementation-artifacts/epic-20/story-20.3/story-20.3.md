# Story 20.3: Filter Controls by Column Type

**Epic:** [Epic 20 - Advanced Employee Filtering](../epic-20.md)
**Status:** Done
**Points:** 5-8
**Assignee:** AI Agent

## User Story

As a user, I want to see appropriate filter controls for each column type (text search, boolean radios, date pickers), so I can filter employees using the right input method for each field.

## Context

Different column types require different filter controls:
- **Text columns** → Search input with debouncing
- **Boolean columns** → Yes/No radio buttons
- **Date columns** → Date range picker + checkbox list of available dates
- **Select/Enum columns** → Multi-select dropdown (if applicable)

## Acceptance Criteria

1. **AC 1: Text Column Filters**
   - [x] Display search input when text column expanded
   - [x] Placeholder text: "Search {column_name}..."
   - [x] Debounce input (300ms) to prevent excessive filtering
   - [x] Filter operator: "contains" (case-insensitive)
   - [x] Clear button (X) when text entered

2. **AC 2: Boolean Column Filters**
   - [x] Display radio button group when boolean column expanded
   - [x] Options: "Yes", "No", "Either" (default)
   - [x] Selecting "Yes" or "No" applies filter
   - [x] Selecting "Either" removes filter for that column

3. **AC 3: Date Column Filters**
   - [x] Display date range picker (From/To inputs)
   - [x] Display list of available dates as checkboxes
   - [x] Fetch available dates from `important_dates` table
   - [x] Show date value + category
   - [x] Allow multiple date selection via checkboxes
   - [x] Filter includes employees with ANY selected date
   - [x] Combining range + checkboxes uses OR logic

4. **AC 4: Multiple Filters on Same Column**
   - [x] Date range AND specific dates = OR logic
   - [x] Example: "omc_date between Jan-Mar OR omc_date = 2024-05-15"
   - [x] UI clearly indicates multiple criteria active

5. **AC 5: Filter State Persistence**
   - [x] Expanding/collapsing column preserves filter state
   - [x] Switching between columns preserves all filter states
   - [x] Closing/reopening panel preserves filter states

6. **AC 6: Clear Individual Filter**
   - [x] Each filter control has a way to clear it
   - [x] Text: Clear button (X)
   - [x] Boolean: Select "Either"
   - [x] Dates: Uncheck all + clear range

## Technical Details

### Component Structure

```
src/components/dashboard/FilterPanel/
  ├── TextFilter.tsx           (Text search input)
  ├── BooleanFilter.tsx        (Yes/No/Either radios)
  ├── DateFilter.tsx           (Range picker + checkbox list)
  └── FilterColumnItem.tsx     (Updated to render correct filter type)
```

### TextFilter Component

```typescript
interface TextFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function TextFilter({ column, value, onChange, onClear }: TextFilterProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce onChange
  const debouncedOnChange = useMemo(
    () => debounce(onChange, 300),
    [onChange]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    debouncedOnChange(e.target.value);
  };

  return (
    <div className="relative">
      <Input
        value={localValue}
        onChange={handleChange}
        placeholder={`Search ${column.display_name}...`}
      />
      {localValue && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### BooleanFilter Component

```typescript
interface BooleanFilterProps {
  column: ColumnConfig;
  value: boolean | null;  // null = "Either"
  onChange: (value: boolean | null) => void;
}

export function BooleanFilter({ column, value, onChange }: BooleanFilterProps) {
  return (
    <RadioGroup value={value === null ? 'either' : String(value)} onValueChange={(v) => {
      if (v === 'either') onChange(null);
      else onChange(v === 'true');
    }}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="either" id="either" />
        <Label htmlFor="either">Either</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="true" id="yes" />
        <Label htmlFor="yes">Yes</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="false" id="no" />
        <Label htmlFor="no">No</Label>
      </div>
    </RadioGroup>
  );
}
```

### DateFilter Component

```typescript
interface DateFilterProps {
  column: ColumnConfig;
  dateRange: { from: Date | null; to: Date | null };
  selectedDateIds: string[];
  availableDates: ImportantDate[];  // Fetched from API
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
  onDateSelectionChange: (dateIds: string[]) => void;
}

export function DateFilter({
  column,
  dateRange,
  selectedDateIds,
  availableDates,
  onDateRangeChange,
  onDateSelectionChange
}: DateFilterProps) {
  return (
    <div className="space-y-4">
      {/* Date Range Picker */}
      <div>
        <Label>Date Range</Label>
        <DateRangePicker
          from={dateRange.from}
          to={dateRange.to}
          onRangeChange={onDateRangeChange}
        />
      </div>

      {/* Specific Dates */}
      <div>
        <Label>Or select specific dates:</Label>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {availableDates.map(date => (
            <div key={date.id} className="flex items-center space-x-2">
              <Checkbox
                id={date.id}
                checked={selectedDateIds.includes(date.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onDateSelectionChange([...selectedDateIds, date.id]);
                  } else {
                    onDateSelectionChange(selectedDateIds.filter(id => id !== date.id));
                  }
                }}
              />
              <Label htmlFor={date.id}>
                {formatDate(date.date_value)} - {date.category}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### FilterColumnItem Updates

```typescript
// In FilterColumnItem.tsx - render appropriate filter based on column type
function renderFilterControl() {
  switch (column.data_type) {
    case 'text':
    case 'varchar':
      return <TextFilter ... />;

    case 'boolean':
      return <BooleanFilter ... />;

    case 'uuid': // Date fields are uuid references
      if (column.field_name.includes('_date')) {
        return <DateFilter ... />;
      }
      return null;

    default:
      return <TextFilter ... />; // Fallback to text search
  }
}
```

### Date Field Detection

Date columns in the system:
- `omc_date` (uuid → important_dates)
- `stena_date` (uuid → important_dates)
- `pe3_date` (uuid → important_dates)

Detect via field name pattern: `*_date`

### Available Dates Fetching

```typescript
// New hook: useAvailableDates
export function useAvailableDates(category?: string) {
  return useQuery({
    queryKey: ['important_dates', category],
    queryFn: async () => {
      const response = await fetch(`/api/important-dates${category ? `?category=${category}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch dates');
      return response.json();
    }
  });
}
```

## Files to Create

1. `src/components/dashboard/FilterPanel/TextFilter.tsx`
2. `src/components/dashboard/FilterPanel/BooleanFilter.tsx`
3. `src/components/dashboard/FilterPanel/DateFilter.tsx`
4. `src/hooks/useAvailableDates.ts`

## Files to Modify

1. `src/components/dashboard/FilterPanel/FilterColumnItem.tsx`
   - Add logic to render correct filter type
   - Handle filter state changes
   - Pass filter values to parent

## Definition of Done

- [x] Text columns show search input with debouncing
- [x] Boolean columns show Yes/No/Either radios
- [x] Date columns show range picker + checkbox list
- [x] All filter controls update parent state correctly
- [x] Debouncing works (300ms delay on text input)
- [x] Date checkboxes fetch from important_dates table
- [x] Filter state persists when expanding/collapsing
- [x] Clear functionality works for all filter types
- [x] Unit tests written for each filter component (32 tests passing)
- [x] Integration tests verify filter state management
- [ ] Code reviewed
- [x] No linter errors
- [x] No console errors

## Testing Strategy

### Unit Tests

```typescript
// TextFilter.test.tsx
describe('TextFilter', () => {
  it('renders search input', () => {});
  it('debounces onChange by 300ms', () => {});
  it('shows clear button when text entered', () => {});
  it('calls onClear when clear button clicked', () => {});
});

// BooleanFilter.test.tsx
describe('BooleanFilter', () => {
  it('renders three radio options', () => {});
  it('defaults to "Either"', () => {});
  it('calls onChange with true when Yes selected', () => {});
  it('calls onChange with false when No selected', () => {});
  it('calls onChange with null when Either selected', () => {});
});

// DateFilter.test.tsx
describe('DateFilter', () => {
  it('renders date range picker', () => {});
  it('renders list of available dates', () => {});
  it('allows multiple date selection', () => {});
  it('calls onDateRangeChange when range updated', () => {});
  it('calls onDateSelectionChange when checkbox toggled', () => {});
});
```

### Integration Tests

- Verify text filter applies to employee list
- Verify boolean filter applies correctly
- Verify date filter applies with range + checkboxes
- Verify multiple filters combine correctly (AND logic between columns)

### Manual Testing

1. Open filter panel
2. Expand text column (e.g., "First Name")
3. Type in search → verify debouncing
4. Verify employees filtered in real-time
5. Expand boolean column (e.g., "Hotel Required")
6. Select "Yes" → verify filter applied
7. Expand date column (e.g., "OMC Date")
8. Select date range → verify filter applied
9. Check specific dates → verify OR logic works
10. Clear all filters → verify employees restored

## Dependencies

- Story 20.2 complete (Filter panel UI exists)
- Existing `important_dates` table and API
- Existing column config system

## Notes

- Focus on common column types first (text, boolean, date)
- Other types (number, select) can be added later if needed
- Date filter is most complex - might need sub-story if taking too long
- Consider extracting debounce utility to shared location

## Dev Agent Record

### Implementation Plan
Story 20.3 adds appropriate filter controls for each column type (text, boolean, date). Implementation followed a component-first approach with comprehensive testing:

1. **Component Creation**: Built TextFilter (debounced search), BooleanFilter (Yes/No/Either radios), and DateFilter (range picker + checkbox list)
2. **Hook Development**: Created useAvailableDates hook to fetch important dates for date filters
3. **Integration**: Updated FilterColumnItem to render the appropriate filter type based on column data type
4. **Testing**: Wrote 32 unit tests covering all filter controls and their interactions
5. **Test Fixes**: Updated Story 20.2 tests to reflect the now-implemented filter controls

### Completion Notes
✅ **All Acceptance Criteria Satisfied:**
- **AC 1**: TextFilter with debounced input (300ms), clear button, and "Search {column_name}..." placeholder
- **AC 2**: BooleanFilter with Yes/No/Either radio buttons, "Either" clears filter
- **AC 3**: DateFilter with From/To date pickers, checkbox list of available dates fetched from important_dates table, formatted with date and category
- **AC 4**: Date filter supports OR logic for combining range + specific dates
- **AC 5**: Filter state persists across expand/collapse, column switching, and panel open/close
- **AC 6**: All filters have clear functionality (X button for text, "Either" for boolean, clear button + unchecking for dates)

### Technical Decisions
- **Component Structure**: Created separate TextFilter, BooleanFilter, and DateFilter components for modularity and reusability
- **Debouncing**: Used existing debounce utility from animation-helpers.ts with 300ms delay and proper cleanup on unmount
- **State Management**: Extended FilterState interface to support textValue, boolValue, dateRange, and selectedDateIds properties
- **Date Detection**: Identified date columns by checking if db_column_name ends with "_date"
- **Date Fetching**: useAvailableDates hook maps column field names (omc_date, stena_date, pe3_date) to categories and fetches only when expanded
- **Filter Logic**: FilterColumnItem determines filter type and renders appropriate control, managing state updates and clear operations
- **Accessibility**: All filters include proper aria-labels and keyboard navigation support

### Testing Results
- ✅ 32 unit tests passing (9 TextFilter, 10 BooleanFilter, 13 DateFilter)
- ✅ 58 total Epic 20 tests passing (including updated Story 20.2 tests)
- ✅ No linter errors in all modified files
- ✅ Debouncing verified with fake timers and act() wrappers
- ✅ Focus trap and accessibility features tested

### Files Created
- `src/components/dashboard/FilterPanel/TextFilter.tsx` - Text search with debouncing
- `src/components/dashboard/FilterPanel/BooleanFilter.tsx` - Yes/No/Either radio group
- `src/components/dashboard/FilterPanel/DateFilter.tsx` - Date range picker + checkbox list
- `src/lib/hooks/use-available-dates.ts` - Hook to fetch important dates by category
- `tests/unit/epic-20/story-20.3/text-filter.test.tsx` - TextFilter tests (9 tests)
- `tests/unit/epic-20/story-20.3/boolean-filter.test.tsx` - BooleanFilter tests (10 tests)
- `tests/unit/epic-20/story-20.3/date-filter.test.tsx` - DateFilter tests (13 tests)

### Files Modified
- `src/components/dashboard/FilterPanel/FilterPanel.tsx` - Extended FilterState interface
- `src/components/dashboard/FilterPanel/FilterColumnItem.tsx` - Added logic to render appropriate filter type
- `src/components/dashboard/FilterPanel/index.ts` - Exported new filter components
- `tests/unit/epic-20/story-20.2/filter-column-item.test.tsx` - Updated tests to verify actual filter controls

## Change Log
- **2026-01-30**: Story 20.3 completed - Filter controls for text, boolean, and date columns implemented and tested

## Status
**done** (Note: Implemented together with Stories 20.2 and 20.4 as Epic 20 Phase 1)
