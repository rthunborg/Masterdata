# Export Date Resolution Fix

## Problem
When exporting employees (normal export or while impersonating), date fields (`stena_date`, `omc_date`, `pe3_date`) were showing UUIDs instead of the actual dates or date ranges in the Excel/CSV file.

### Example of the Problem
**Before Fix:**
```csv
First Name,Surname,Stena Date,ÖMC Date,PE3 Date
John,Doe,a1b2c3d4-e5f6-7890-abcd-ef1234567890,b2c3d4e5-f6g7-8901-bcde-fg2345678901,c3d4e5f6-g7h8-9012-cdef-gh3456789012
```

**After Fix:**
```csv
First Name,Surname,Stena Date,ÖMC Date,PE3 Date
John,Doe,10-03,15-03 - 16-03,20-03 14:30
```

## Root Cause
In the database, the `employees` table stores date fields as UUID references to the `important_dates` table:
- `stena_date` → UUID reference to `important_dates.id`
- `omc_date` → UUID reference to `important_dates.id`
- `pe3_date` → UUID reference to `important_dates.id`
- `repayment_needed_omc` → UUID reference to `important_dates.id`
- `repayment_needed_pe3` → UUID reference to `important_dates.id`

The export code was directly converting these UUID values to strings without resolving them to actual dates.

## Solution
Updated both export routes to:
1. Fetch all `important_dates` from the database
2. Use the existing `resolveImportantDateId()` utility function to convert UUIDs to formatted date strings
3. Handle date formatting based on category:
   - **Stena Dates**: Single date (e.g., "10-03")
   - **ÖMC Dates**: Two-day range (e.g., "15-03 - 16-03")
   - **PE3 Dates**: Date with time (e.g., "20-03 14:30")

## Files Modified

### 1. `src/app/api/employees/export/route.ts`
**Changes:**
- Added import for `ImportantDate` type and `resolveImportantDateId` function
- Added query to fetch all active important dates
- Updated CSV data preparation to resolve date UUIDs for date fields
- Date fields that are resolved: `stena_date`, `omc_date`, `pe3_date`, `repayment_needed_omc`, `repayment_needed_pe3`

### 2. `src/app/api/employees/export-crew-ready/route.ts`
**Changes:**
- Added imports for `ImportantDate`, `createAPIClient`, and `resolveImportantDateId`
- Added query to fetch all active important dates
- Prepared infrastructure for future date field exports (crew-ready export doesn't currently export date fields)

### 3. `tests/unit/api/export-date-resolution.test.ts` (New)
**Purpose:**
- Test suite to verify date UUIDs are properly resolved in exports
- Covers both successful resolution and deleted date scenarios
- Ensures UUIDs never appear in exported files

## How It Works

### Date Resolution Flow
1. **Database Structure:**
   ```
   employees.stena_date (UUID) → important_dates.id (UUID)
   important_dates.date_value (ISO date string)
   important_dates.category (determines formatting)
   important_dates.time_value (for PE3 dates)
   ```

2. **Export Process:**
   - Fetch employees with date UUIDs
   - Fetch all important_dates
   - For each date field in export:
     - Check if field is a date field (stena_date, omc_date, etc.)
     - If yes, call `resolveImportantDateId(uuid, allDates)`
     - Function returns formatted date string based on category
     - Use formatted string in export instead of UUID

3. **Date Formatting:**
   The `resolveImportantDateId` function uses `formatDateForDisplay()` which applies Swedish formatting:
   - Stena Dates: "DD-MM" (e.g., "10-03")
   - ÖMC Dates: "DD-MM - DD-MM" (e.g., "15-03 - 16-03") - two consecutive days
   - PE3 Dates: "DD-MM HH:MM" (e.g., "20-03 14:30")
   - Jan 1 exceptions: Shows description text (e.g., "Har certifikat")

### Edge Cases Handled
- **Deleted dates**: Shows "Date Deleted" instead of UUID
- **Null dates**: Shows empty string
- **No dates loaded yet**: Shows empty string (avoids premature "Date Deleted" message)

## Testing

### Manual Testing Steps
1. Create/assign employees with various date types
2. Navigate to employee table
3. Select employees with dates
4. Click export and select date fields
5. Choose CSV or Excel format
6. Download and open file
7. Verify dates show as formatted strings, not UUIDs

### Expected Results
- **Stena Date**: Should show "DD-MM" format (e.g., "10-03")
- **ÖMC Date**: Should show "DD-MM - DD-MM" range (e.g., "15-03 - 16-03")
- **PE3 Date**: Should show "DD-MM HH:MM" (e.g., "20-03 14:30")
- **Deleted dates**: Should show "Date Deleted"
- **Null dates**: Should show empty cell

### Automated Tests
Run the new test suite:
```bash
pnpm test tests/unit/api/export-date-resolution.test.ts
```

## Impersonation Export
The fix applies to both normal exports and exports while impersonating:
- HR Admin can export as themselves (sees all date fields)
- HR Admin can impersonate external_party role (sees date fields if permissions allow)
- Date resolution works the same for both scenarios

## Performance Considerations
- **Query Overhead**: One additional query to fetch `important_dates` per export
- **Impact**: Minimal - important_dates table is typically small (< 1000 rows)
- **Optimization**: Query filters for `is_active = true` to reduce data
- **Caching**: Consider caching important_dates if export performance becomes an issue

## Related Utilities

### `resolveImportantDateId()`
Located in: `src/lib/utils/important-date-resolver.ts`
- Resolves UUID to formatted date string
- Handles deleted dates gracefully
- Uses category-based formatting

### `formatDateForDisplay()`
Located in: `src/lib/utils/format.ts`
- Formats dates in Swedish format
- Handles ÖMC two-day ranges
- Handles PE3 time values

### `getEmployeeFieldValue()`
Located in: `src/lib/utils/column-mapping.ts`
- General utility for getting employee field values
- Already handles date resolution for table display
- Export code now follows same pattern

## Future Enhancements

### Potential Improvements
1. **Cache important_dates**: Store in memory/Redis for frequent exports
2. **Batch export optimization**: If exporting thousands of employees, consider optimizing queries
3. **Custom date formatting**: Allow users to choose date format (Swedish, ISO, etc.)
4. **Include week numbers**: Optionally show week numbers with dates (e.g., "v.10 10-03")

### Related Features
- **Import validation**: When importing, validate date references exist
- **Audit trail**: Track which dates are most commonly exported
- **Date picker UI**: Improve date selection UX in export dialog

## Rollback Plan
If issues arise, the fix can be easily reverted:
1. The changes are isolated to two export route files
2. Revert commits for `src/app/api/employees/export/route.ts` and `src/app/api/employees/export-crew-ready/route.ts`
3. No database schema changes were made
4. No breaking changes to existing functionality

## Documentation Updates
- Updated this fix documentation
- Test suite documents expected behavior
- Code comments explain date resolution logic

## Related Stories/Issues
- Story 19.3: Swedish date formatting for Important Dates
- Story 19.8: Jan 1 exception dates handling
- Story 8.9: ÖMC two-day date format
- Story 8.10: PE3 date time selection

## Questions?
If you encounter issues or have questions about this fix:
1. Check console logs for any errors during export
2. Verify `important_dates` table has expected data
3. Test with different date categories
4. Review test suite for expected behavior examples
