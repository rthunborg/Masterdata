# Story 17.4: Export Functionality for External Users

**Story:** As an external party user, I want to export employees with field selection, but only for fields I have view access to, so that I can export data relevant to my role.

**Status:** Approved  
**Epic:** Epic 17: External User UX Improvements

---

## Acceptance Criteria

### Criterion 1: Export Button Visibility
- **Given** an external user is on the dashboard
- **When** they view the employee table
- **Then** the export button is visible (currently only shown for HR Admin)
- **And** the button is enabled when employees are selected
- **And** the button text is in Swedish: "Exportera markerade anställda"

### Criterion 2: Permission-Based Field Filtering
- **Given** an external user clicks the export button
- **When** the export dialog opens
- **Then** only fields the user has view permission for are shown in the field selection
- **And** fields without view permission are not listed
- **And** the field list is filtered based on `column_config.role_permissions[userRole].view`

### Criterion 3: Export API Permission Check
- **Given** an external user selects fields and exports
- **When** the export API is called
- **Then** the API verifies the user has view permission for all selected fields
- **And** fields without permission are excluded from export
- **And** an error is returned if user tries to export fields they can't view

### Criterion 4: Export Functionality
- **Given** an external user has selected employees and fields
- **When** they click export
- **Then** a CSV file is generated with only the selected fields
- **And** only data for fields the user has view access to is included
- **And** the export completes successfully

### Criterion 5: Field Selection UI
- **Given** an external user opens the export dialog
- **When** they view the field selection
- **Then** fields are organized by category (if applicable)
- **And** only viewable fields are shown
- **And** the UI clearly indicates which fields are available
- **And** the selection interface is user-friendly

### Criterion 6: Error Handling
- **Given** an external user attempts to export
- **When** an error occurs (e.g., no fields selected, permission denied)
- **Then** an appropriate error message is displayed in Swedish
- **And** the error is clear and actionable

---

## Technical Notes

### Export Button Visibility

In `src/components/dashboard/employee-table.tsx`:
- Currently: Line 1771 shows `{isHRAdmin && (...)}` - export button only for HR Admin
- Change to: Show for all users, but filter fields based on permissions

```tsx
{/* Story 17.4: Export Button for External Users */}
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportClick}
      disabled={selectedEmployeeIds.size === 0}
      className="whitespace-nowrap"
    >
      {tDashboard("exportSelected") || "Exportera markerade anställda"}
      {selectedEmployeeIds.size > 0 && ` (${selectedEmployeeIds.size})`}
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>
      {selectedEmployeeIds.size === 0
        ? tDashboard("noEmployeesSelected") || "Inga anställda valda"
        : tDashboard("exportSelectedEmployees") || `Exportera ${selectedEmployeeIds.size} markerade anställda`}
    </p>
  </TooltipContent>
</Tooltip>
```

### Permission-Based Field Filtering

In export dialog component:
- Filter columns based on user role and view permissions
- Use `column_config.role_permissions[userRole].view === 'true'`
- Only show columns where user has view access

```typescript
const visibleColumnsForExport = columns.filter((col) => {
  if (col.is_masterdata) {
    // Check masterdata column permissions
    return col.role_permissions?.[userRole]?.view === 'true';
  } else {
    // Custom columns: user can export their own columns
    return col.created_by === userId || col.role_permissions?.[userRole]?.view === 'true';
  }
});
```

### API Endpoint Update

Update `src/app/api/employees/export/route.ts`:
- Remove HR Admin requirement: `await requireHRAdminAPI();`
- Add permission check for selected fields
- Filter export data based on user permissions

```typescript
// Verify user has view permission for all selected fields
const userRole = user.role;
for (const field of fields) {
  const column = await getColumnByDbName(field);
  if (!column || column.role_permissions?.[userRole]?.view !== 'true') {
    return NextResponse.json(
      { error: { message: 'You do not have permission to export this field' } },
      { status: 403 }
    );
  }
}
```

### Export Service Update

Update export logic to:
- Filter fields based on permissions before generating CSV
- Only include data for fields user has view access to
- Handle permission errors gracefully

### Field Selection Dialog

Update export dialog to:
- Show only viewable fields
- Organize by category if applicable
- Display field names in Swedish (if translations exist)
- Allow multi-select with checkboxes

---

## Tasks

- [ ] Remove HR Admin check from export button visibility
- [ ] Update export dialog to filter fields by permissions
- [ ] Update export API to remove HR Admin requirement
- [ ] Add permission verification in export API
- [ ] Update export service to filter data by permissions
- [ ] Test export with external user role
- [ ] Test permission filtering works correctly
- [ ] Test error handling for permission denied
- [ ] Add Swedish translations for export UI
- [ ] Test export with different external user roles (sodexo, omc, etc.)

---

## Prerequisites

- Story 13.6: General Export Button with Field Selection (export functionality must exist)
- Column permission system must be in place
- User role system must be in place

---

## Testing Requirements

### Unit Tests
- Test field filtering based on permissions
- Test export API permission checks
- Test field selection filtering logic

### Integration Tests
- Test export button visible for external users
- Test export dialog shows only viewable fields
- Test export API accepts external user requests
- Test export data only includes permitted fields
- Test permission denied error handling

### E2E Tests
- Test complete export flow: select employees → click export → select fields → export → verify CSV
- Test export with limited field permissions
- Test export error when trying to export restricted field

### Manual Testing
- Login as external user (sodexo, omc, etc.)
- Verify export button is visible
- Click export button
- Verify only viewable fields are shown
- Select employees and fields
- Export and verify CSV contains only permitted fields
- Test with different external user roles
- Test error messages are clear

---

## Notes

- Ensure export respects all permission rules (view, edit, etc.)
- Consider performance if user has many viewable fields
- CSV file should be properly formatted and readable
- Consider adding field labels/headers in Swedish if applicable

