# Story 20.7 Context

## Why This Story Matters

### User's Primary Use Case

From user interviews:
> "I need to export all employees who have a specific OMC date assigned to them"

The workflow:
1. Filter employees by criteria
2. Review filtered list
3. Export to CSV
4. Share with external system (payroll, hotel booking, etc.)

**Critical:** Export MUST match what user sees. Otherwise they lose trust in the system.

### Trust & Data Integrity

**Bad Experience:**
```
User: *Filters to 12 employees*
User: "Perfect, these are the ones I need"
User: *Clicks Export*
System: *Exports all 87 employees*
User: "Wait, this has people I didn't want..."
User: *Loses confidence in system*
```

**Good Experience:**
```
User: *Filters to 12 employees*
User: *Clicks Export*
System: "Exporting 12 employees based on your filters"
User: *Confirms*
System: *Exports exactly those 12*
User: "Perfect! This is what I needed."
```

## Export Architecture Patterns

### Option 1: Client-Side Filtering + ID List

**Flow:**
```
Client filters employees → Get filtered IDs → Send IDs to API → API fetches those IDs → Generate CSV
```

**Pros:**
- Simple API (just format provided IDs)
- No duplicate filter logic
- Client has already done the work

**Cons:**
- Large ID lists in request body (not a problem for 100 employees)
- API must validate user has access to those IDs

### Option 2: Server-Side Filtering

**Flow:**
```
Client computes filters → Send filters to API → API applies filters → Generate CSV
```

**Pros:**
- Smaller request payload (just filter criteria)
- Single source of truth for filter logic

**Cons:**
- Duplicate filter logic (client + server)
- Complexity: Server must support all filter types
- Synchronization issues if filter logic diverges

### Option 3: Hybrid

**Flow:**
```
Client filters → Send both IDs and filters → Server validates → Generate CSV
```

**Pros:**
- Validation that client/server agree
- Audit trail of what was filtered

**Cons:**
- Most complex
- Overhead of sending both

### Decision: Option 1

**Rationale:**
- Client-side filtering architecture (Story 20.4)
- Simplicity - API is "dumb" formatter
- 100 employee IDs = ~3.6KB payload (tiny)
- Consistent with existing architecture

## Export API Contract

### Request Format

```typescript
POST /api/employees/export

{
  "employeeIds": ["uuid-1", "uuid-2", ...],  // Optional: If provided, export only these
  "format": "csv",  // Future: support xlsx, json, etc.
  "filterMetadata": {  // Optional: For CSV header comment
    "appliedFilters": [
      { "column": "first_name", "value": "john" },
      { "column": "omc_date", "value": "2024-01-15" }
    ],
    "filteredCount": 12,
    "totalCount": 87,
    "exportedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Response Format

```
200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="employees-20240115-103000.csv"

# Exported: 12 of 87 employees
# Filters: First Name contains "john", OMC Date = 2024-01-15
# Exported at: 2024-01-15 10:30:00
Name,Email,OMC Date
John Doe,john@example.com,2024-01-15
Johnny Smith,johnny@example.com,2024-01-15
...
```

## CSV Metadata Header

### Why Add Filter Metadata?

**Problem:** User exports filtered data, shares CSV with colleague.
Colleague: "Where did this list come from? What criteria was used?"

**Solution:** Include filter metadata as CSV comments

```csv
# Filtered Export
# Exported by: user@example.com
# Exported at: 2024-01-15 10:30:00 UTC
# Filters Applied:
#   - First Name contains: "john"
#   - OMC Date: 2024-01-15
#   - Hotel Required: Yes
# Result: 12 of 87 employees
#
Name,Email,Phone
John Doe,john@example.com,555-1234
...
```

**Benefits:**
- Self-documenting export
- Audit trail
- Reproducibility (user knows what filters to apply again)

**Implementation:**
```typescript
function generateCSVHeader(metadata: FilterMetadata): string {
  const lines = [
    '# Filtered Export',
    `# Exported by: ${metadata.userName}`,
    `# Exported at: ${metadata.exportedAt}`,
    '# Filters Applied:'
  ];

  metadata.appliedFilters.forEach(filter => {
    lines.push(`#   - ${filter.column}: ${filter.value}`);
  });

  lines.push(`# Result: ${metadata.filteredCount} of ${metadata.totalCount} employees`);
  lines.push('#');  // Blank comment line before data

  return lines.join('\n') + '\n';
}
```

## Confirmation Dialog Design

### When to Show?

**Always show when:**
- Filters are active AND
- User hasn't dismissed "Don't ask again"

**Never show when:**
- No filters active (exporting all)
- User has dismissed permanently
- Exporting via API (programmatic export)

### Content Strategy

**Bad confirmation:**
```
⚠️ Are you sure?
[ Cancel ] [ OK ]
```

Problems:
- No context
- Doesn't explain consequence
- Generic messaging

**Good confirmation:**
```
📊 Export Filtered Employees

You are about to export 12 of 87 employees based on your active filters:
  • First Name contains "john"
  • OMC Date: 2024-01-15

☐ Don't ask me again

[ Cancel ] [ Export 12 Employees ]
```

Benefits:
- Shows exactly what will be exported
- Lists active filters for review
- Clear action button with count
- Option to dismiss future confirmations

### "Don't Ask Again" Behavior

**Storage: localStorage**
```typescript
const EXPORT_CONFIRMATION_KEY = 'export-confirmation-dismissed';

// Save preference
localStorage.setItem(EXPORT_CONFIRMATION_KEY, 'true');

// Check preference
const shouldShowConfirmation =
  activeFilters.length > 0 &&
  !localStorage.getItem(EXPORT_CONFIRMATION_KEY);
```

**Why localStorage not user preferences in database?**
- Per-browser preference (user might want confirmation on work computer but not personal)
- Faster (no API call)
- Simpler implementation
- Falls back to showing if storage cleared

**Reset option:**
Add in settings panel:
```tsx
<Label>
  <Checkbox
    checked={!localStorage.getItem(EXPORT_CONFIRMATION_KEY)}
    onChange={(checked) => {
      if (checked) {
        localStorage.removeItem(EXPORT_CONFIRMATION_KEY);
      } else {
        localStorage.setItem(EXPORT_CONFIRMATION_KEY, 'true');
      }
    }}
  />
  Show confirmation when exporting filtered data
</Label>
```

## Export Button Label Strategy

### Dynamic Labeling

**State Machine:**

```
No filters, no selection:
  "Export All Employees"

Filters active, no selection:
  "Export Filtered (12)"

No filters, selection active:
  "Export Selected (3)"

Filters active, selection active:
  "Export Selected (3)"  // Selection takes precedence
```

**Implementation:**
```typescript
const getExportButtonLabel = (
  filteredCount: number,
  totalCount: number,
  selectedCount: number,
  hasActiveFilters: boolean
): string => {
  // Selection takes precedence
  if (selectedCount > 0) {
    return `Export Selected (${selectedCount})`;
  }

  // Filtered state
  if (hasActiveFilters) {
    return `Export Filtered (${filteredCount})`;
  }

  // Default
  return `Export All Employees (${totalCount})`;
};
```

### Icon Choice

**Options:**
- `Download` - Most common for export
- `FileDown` - Alternative download icon
- `FileSpreadsheet` - Indicates CSV format
- `Share` - Ambiguous (could mean many things)

**Decision:** `Download` icon
- Universal export/download symbol
- Familiar to users
- Clear action

```tsx
<Button onClick={handleExport}>
  <Download className="mr-2 h-4 w-4" />
  {exportButtonLabel}
</Button>
```

## Integration with Crew Ready Export

### Special Case: Crew Ready Export

Current system has "Export & Mark Crew Ready" button that:
1. Exports selected employees
2. Marks them as `crewing_done = true`

**With filters:**
1. User filters to crew-ready employees
2. Selects subset
3. Clicks "Export & Mark Crew Ready"
4. **Should only affect selected employees, not all filtered**

**Important:** Selection is more specific than filter

```typescript
const handleCrewReadyExport = async () => {
  const employeeIds = selectedEmployeeIds.size > 0
    ? Array.from(selectedEmployeeIds)  // Use selection
    : filteredEmployees  // Fallback to filtered
        .filter(e => isCrewReady(e))  // Apply crew ready criteria
        .map(e => e.id);

  await exportCrewReady(employeeIds);
};
```

### Backwards Compatibility

Existing tests for Crew Ready export:
- `tests/integration/export-crew-ready.test.ts`
- `tests/e2e/epic-13/story-13.7/export-workflow.spec.ts`

**Must verify:**
- Tests still pass
- Crew ready logic unchanged
- Only integration point affected (what IDs are passed)

## Security Considerations

### Access Control Validation

**Problem:** Client sends employee IDs to export. What if malicious user sends IDs they don't have access to?

```typescript
// BAD: Trust client completely
const employees = await employeeRepository.findByIds(employeeIds);
```

**Solution:** Re-apply RLS and permission checks

```typescript
// GOOD: Fetch with user's permissions
const supabase = await createClient();  // Has user's auth token

const { data: employees, error } = await supabase
  .from('employees')
  .select('*')
  .in('id', employeeIds);  // RLS automatically filters out unauthorized IDs

// If user requested 10 IDs but only gets 5 back, they didn't have access to the other 5
```

**Supabase RLS ensures:**
- User can only export employees they can read
- External parties see only non-archived
- HR Admin sees all

### Rate Limiting

**Problem:** Malicious user repeatedly exports to scrape data

**Solution:** Rate limit export endpoint

```typescript
// In API route
const rateLimiter = new RateLimiter({
  max: 10,  // 10 exports
  window: '1m'  // per minute
});

export async function POST(request: NextRequest) {
  const user = await requireAuthAPI(request);

  if (!rateLimiter.check(user.id)) {
    return NextResponse.json(
      { error: 'Too many export requests. Please wait.' },
      { status: 429 }
    );
  }

  // ... proceed with export
}
```

## Testing Strategy

### Test Matrix

| Scenario | Filters | Selection | Expected Export |
|----------|---------|-----------|-----------------|
| 1 | None | None | All employees |
| 2 | Active | None | Filtered employees |
| 3 | None | Active | Selected employees |
| 4 | Active | Active | Selected (intersection of filter & selection) |
| 5 | Active | All filtered selected | All filtered employees |

### Edge Cases

**Empty Filter Result:**
```typescript
// User filters to criteria that matches no employees
filteredEmployees.length === 0

// Export button should be disabled
<Button disabled={filteredEmployees.length === 0}>
  Export Filtered (0)
</Button>
```

**Large Export:**
```typescript
// If filtering returns 1000+ employees (future growth)
if (filteredEmployees.length > 500) {
  // Show warning
  alert('Large export. This may take a moment...');
}
```

**Export During Filter Calculation:**
```typescript
// User clicks export while filter is still calculating
if (isFiltering) {
  // Disable export button or queue request
  return;
}
```

### Performance Testing

**Benchmark:** Export 100 employees should complete in <5 seconds

**Test:**
```typescript
const start = Date.now();

await handleExport(employeeIds);

const duration = Date.now() - start;
expect(duration).toBeLessThan(5000);
```

## User Documentation

### Help Text

Add tooltip to export button:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button onClick={handleExport}>
      <Download /> {exportButtonLabel}
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    {hasActiveFilters
      ? 'Export only the employees shown in the filtered table'
      : 'Export all employees visible in the table'}
  </TooltipContent>
</Tooltip>
```

### In-App Guidance

First time user exports with filters:
```tsx
{isFirstFilteredExport && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertTitle>Exporting Filtered Data</AlertTitle>
    <AlertDescription>
      Your export will only include the {filteredCount} employees
      shown in the table based on your active filters.
    </AlertDescription>
  </Alert>
)}
```

## Future Enhancements

### Export History

Track export history for audit:
```sql
CREATE TABLE export_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  employee_ids UUID[],
  filter_criteria JSONB,
  exported_count INT,
  exported_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Scheduled Exports

Allow users to schedule recurring exports:
```typescript
interface ScheduledExport {
  id: string;
  userId: string;
  name: string;
  filters: FilterState[];
  frequency: 'daily' | 'weekly' | 'monthly';
  emailTo: string[];
}
```

### Export Templates

Pre-configured export formats for different use cases:
```typescript
const exportTemplates = {
  'Payroll': {
    columns: ['first_name', 'surname', 'ssn', 'salary'],
    format: 'xlsx'
  },
  'Hotel Booking': {
    columns: ['first_name', 'surname', 'omc_date', 'hotel_required'],
    format: 'csv'
  }
};
```

These are out of scope for Epic 20 but valuable for future iterations.
