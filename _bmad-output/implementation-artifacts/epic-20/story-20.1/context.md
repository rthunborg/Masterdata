# Story 20.1 Context

## Background

This story removes the legacy crew ready dropdown filter to make way for the new advanced filtering system in Epic 20. The crew ready dropdown was implemented in Epic 13 (Story 13.5) to allow quick filtering of employees based on their "crew ready" status.

## Why Remove It?

1. **Consolidation:** The new advanced filter system (Epic 20) will provide a comprehensive way to filter by any column, including crew ready criteria
2. **Simplification:** Having both a quick filter dropdown AND an advanced filter panel would be confusing
3. **User Request:** Users want to filter on ANY column, not just crew ready status
4. **Clean Slate:** Easier to build new system without maintaining old filter logic

## What Is Crew Ready?

An employee is considered "crew ready" when they meet ALL these criteria:
- `stena_date` is set
- `omc_date` is set
- `pe3_date` is set
- `isps` is true
- `crewing_done` is false (not already marked as done)

This logic is defined in `src/lib/services/crewing-validation.ts` and will remain for export purposes.

## What We're Keeping vs Removing

### KEEPING ✅
- **Checkbox Filters** (archived/terminated/repayment) - These show special employee states not visible by default
- **Crew Ready Export** - The "Export & Mark Crew Ready" button and its functionality
- **Crew Ready Validation** - The logic to determine if an employee is crew ready
- **Crew Ready Status Tints** - Green background color for crew ready employees (Story 13.11)
- **Export API Endpoint** - `/api/employees/export-crew-ready`

### REMOVING ❌
- **Crew Status Dropdown** - The Select component with "Alla anställda / Crew Ready / Inte Crew Ready"
- **Auto-Selection Logic** - When user selects "Crew Ready" filter, automatically check all crew ready employees
- **Filter Reset Logic** - When terminated filter is enabled, reset crew status filter to "all"
- **Related Tests** - Tests specifically for the dropdown filter UI and auto-selection

## Impact on Existing Features

### No Impact
- Employee table rendering
- Employee selection (checkboxes)
- Export crew ready functionality
- Crew ready status calculations
- Crew ready visual indicators (green tints)
- Column visibility
- Search functionality
- Checkbox filters

### Impacted (Intentionally)
- Crew ready dropdown UI removed
- Auto-selection when activating crew ready filter removed
- Quick filtering by crew ready status removed (will be replaced by advanced filters)

## Related Epic 13 Stories

- **Story 13.5:** Crew Ready Filter Auto-Selection - Being removed
- **Story 13.7:** Export Crew Ready - **Keeping** - Export functionality remains
- **Story 13.11:** Employee Status Tints - **Keeping** - Visual indicators remain

## Migration Path for Users

**Before (Current):**
1. User clicks dropdown
2. Selects "Crew Ready"
3. Table filters to show only crew ready employees
4. Employees auto-selected
5. User clicks "Export & Mark Crew Ready"

**After (Epic 20):**
1. User clicks new "Filter" button
2. Opens filter panel
3. Expands relevant columns (stena_date, omc_date, pe3_date, isps, crewing_done)
4. Sets filter criteria to match crew ready requirements
5. Can save this as "Crew Ready" filter for reuse
6. Manually selects employees
7. Clicks "Export & Mark Crew Ready"

**OR** (if we create a preset):
1. User clicks new "Filter" button
2. Selects "Crew Ready" from saved filters dropdown
3. Filter automatically applied
4. Manually selects employees
5. Clicks "Export & Mark Crew Ready"

## Test Coverage

### Tests Being Removed/Skipped
- `tests/unit/epic-13/story-13.5/crew-ready-auto-selection.test.ts`
- `tests/integration/epic-13/story-13.5/crew-ready-auto-selection.test.tsx`
- `tests/e2e/epic-13/story-13.5/crew-ready-auto-selection.spec.ts`
- `tests/unit/epic-17/story-17.5/filter-dropdown-conditional-rendering.test.tsx` (partially)

### Tests Remaining
- All export crew ready tests (Story 13.7)
- All crew ready status tint tests (Story 13.11)
- All crew ready validation tests
- All checkbox filter tests

## Code References

### Main Component
- `src/components/dashboard/employee-table.tsx` (lines 2213-2230)

### State Management
```typescript
const [crewStatusFilter, setCrewStatusFilter] = useState<"all" | "ready" | "not-ready">("all");
```

### Auto-Selection Logic
```typescript
// Story 13.5: Auto-select employees when Crew Ready filter is activated
React.useEffect(() => {
  if (crewStatusFilter === "ready") {
    // Auto-select crew ready employees
  }
}, [crewStatusFilter]);
```

### Filter Reset Logic
```typescript
// Story 13.5: Reset Crew Ready filter when Terminated filter is enabled
React.useEffect(() => {
  if (includeTerminated) {
    setCrewStatusFilter("all");
  }
}, [includeTerminated]);
```

## Next Steps

After this story is complete:
1. **Story 20.2** - Build new filter panel UI
2. **Story 20.3** - Add filter controls for different column types
3. **Story 20.4** - Implement filter engine with client-side filtering
4. **Story 20.6** - Add ability to save "Crew Ready" filter as preset
