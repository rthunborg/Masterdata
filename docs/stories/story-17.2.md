# Story 17.2: Delete Functionality for Custom Columns

**Story:** As an external party user, I want to delete my own custom columns, so that I can remove columns I no longer need.

**Status:** Done
**Epic:** Epic 17: External User UX Improvements

---

## Acceptance Criteria

### Criterion 1: Delete Button Display
- **Given** an external user has custom columns
- **When** they open the "Manage Custom Columns" modal
- **Then** each custom column shows both an Edit button and a Delete button
- **And** the Delete button is clearly visible and accessible
- **And** the Delete button uses appropriate iconography (e.g., Trash icon)

### Criterion 2: Delete Confirmation
- **Given** an external user clicks the Delete button for a custom column
- **When** they attempt to delete
- **Then** a confirmation dialog appears asking to confirm deletion
- **And** the confirmation message is clear (e.g., "Are you sure you want to delete this column?")
- **And** the confirmation is in Swedish for external users

### Criterion 3: Delete Functionality
- **Given** an external user confirms deletion
- **When** the delete action completes
- **Then** the column is removed from the database
- **And** the column disappears from the manage columns modal
- **And** the column is removed from the employee table
- **And** a success message is displayed

### Criterion 4: Delete Restrictions
- **Given** an external user attempts to delete a column
- **When** the delete action is attempted
- **Then** only columns created by the user (their own custom columns) can be deleted
- **And** masterdata columns cannot be deleted (not shown in manage modal anyway)
- **And** columns created by other users cannot be deleted

### Criterion 5: Error Handling
- **Given** a delete operation fails
- **When** an error occurs
- **Then** an appropriate error message is displayed
- **And** the column is not removed from the UI
- **And** the error is logged for debugging

### Criterion 6: Data Cleanup
- **Given** a custom column is deleted
- **When** the deletion completes
- **Then** all data associated with that column is removed (or handled appropriately)
- **And** the deletion is permanent (no soft delete for custom columns)
- **And** related column_config entries are removed

---

## Technical Notes

### API Endpoint

Create or update delete endpoint:
- `DELETE /api/columns/:columnId`
- Verify user owns the column before allowing deletion
- Return appropriate error if column doesn't exist or user doesn't have permission

### Component Updates

**`src/components/dashboard/manage-columns-dropdown.tsx`**
- Add Delete button next to Edit button for each column
- Add delete handler function
- Add confirmation dialog component

### Delete Handler Implementation

```typescript
const handleDeleteColumn = async (columnId: string, columnName: string) => {
  // Show confirmation dialog
  const confirmed = await showConfirmDialog(
    `Är du säker på att du vill ta bort kolumnen "${columnName}"?`
  );
  
  if (!confirmed) return;
  
  try {
    await columnService.deleteColumn(columnId);
    toast.success('Kolumnen har tagits bort');
    refetch(); // Refresh columns list
  } catch (error) {
    toast.error('Kunde inte ta bort kolumnen');
  }
};
```

### Service Method

Add to `src/lib/services/column-service.ts`:

```typescript
async deleteColumn(columnId: string): Promise<void> {
  const response = await fetch(`/api/columns/${columnId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete column');
  }
}
```

### Permission Check

In API endpoint, verify:
- Column exists
- Column is custom (not masterdata)
- User created the column (or has permission to delete it)
- User is not HR Admin trying to delete someone else's column (if applicable)

### UI Component Structure

```tsx
<Button
  variant="ghost"
  className="w-full justify-start"
  onClick={() => handleEditColumn(col.id)}
>
  <Edit className="h-4 w-4 mr-2" />
  {col.column_name}
</Button>
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleDeleteColumn(col.id, col.column_name)}
  className="text-destructive hover:text-destructive"
>
  <Trash className="h-4 w-4" />
</Button>
```

### Confirmation Dialog

Use existing dialog component or create simple confirmation:
- Can use browser `confirm()` for MVP, or
- Use shadcn/ui AlertDialog for better UX

---

## Tasks

- [x] Create DELETE API endpoint `/api/columns/:columnId`
- [x] Add permission check in API endpoint
- [x] Add `deleteColumn` method to column service
- [x] Add Delete button to manage columns modal
- [x] Implement delete handler with confirmation
- [x] Add success/error toast messages
- [x] Test delete functionality
- [x] Test permission restrictions
- [x] Test error handling
- [x] Add Swedish translations for delete messages
- [x] Update column list after deletion

---

## Prerequisites

- Story 17.1: Swedish Translations (for delete confirmation messages)
- Custom column management functionality must exist
- Column service must exist
- API authentication must be in place

---

## Testing Requirements

### Unit Tests
- Test delete service method
- Test permission checks
- Test error handling

### Integration Tests
- Test delete API endpoint with valid column
- Test delete API endpoint with invalid column
- Test delete API endpoint with unauthorized user
- Test delete confirmation dialog
- Test column removal from UI after deletion

### E2E Tests
- Test complete delete flow: open modal → click delete → confirm → verify column removed
- Test delete cancellation: open modal → click delete → cancel → verify column still exists
- Test delete with error: simulate API error → verify error message

### Manual Testing
- Login as external user
- Create a custom column
- Open manage columns modal
- Click delete button
- Verify confirmation dialog
- Confirm deletion
- Verify column is removed
- Verify success message
- Test deleting non-existent column (error case)

---

## Notes

- Consider data migration if column has existing data
- May need to handle cascading deletes for related data
- Ensure delete is permanent (no undo) - make this clear in UI

---

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### Debug Log
- Added DELETE endpoint to `/api/columns/[id]/route.ts`:
  - Verifies user authentication
  - Blocks HR Admin from using user endpoint (must use admin endpoint)
  - Checks column ownership via repository (user must have edit permission)
  - Returns appropriate error responses (403 for permission denied, 404 for not found)
- Updated `columnConfigRepository.deleteColumn()`:
  - Added userId and userRole parameters for ownership verification
  - External users can only delete columns they have edit permission for
  - HR Admin can delete any custom column
- Added `deleteCustomColumn()` method to `column-service.ts`:
  - User-facing delete method that calls `/api/columns/:id` endpoint
  - Separated from admin `deleteColumn()` method
- Updated `manage-columns-dropdown.tsx`:
  - Added delete button with Trash icon next to each column
  - Added AlertDialog confirmation dialog with Swedish translations
  - Implemented delete handler with error handling
  - Added aria-label for accessibility
  - Refetches columns after successful deletion
- Added Swedish translations to `messages/sv.json`:
  - `modals.deleteColumn.title`: "Ta bort kolumn"
  - `modals.deleteColumn.message`: Confirmation message with column name
  - `modals.deleteColumn.confirm`: "Ta bort"
  - `modals.deleteColumn.cancel`: "Avbryt"
  - `modals.deleteColumn.deleting`: "Tar bort..."
  - `modals.deleteColumn.success`: "Kolumnen har tagits bort"
  - `modals.deleteColumn.failed`: "Kunde inte ta bort kolumnen"
- Created unit tests:
  - `tests/unit/components/manage-columns-dropdown.test.tsx`: 6 new tests for delete functionality
  - `tests/unit/repositories/column-config-repository.test.ts`: Updated with ownership checks
  - All tests passing (12/12)

### Completion Notes

**Implementation Summary:**
- All acceptance criteria satisfied
- Delete functionality implemented with proper ownership checks
- Swedish translations added for all delete-related UI text
- Confirmation dialog prevents accidental deletions
- Error handling implemented with user-friendly messages
- Unit tests created and passing

**Key Features:**
- External users can only delete columns they own (have edit permission for)
- HR Admin cannot use user endpoint (must use admin endpoint)
- Confirmation dialog uses Swedish translations
- Column list automatically refreshes after deletion
- Proper error handling with toast notifications

**Files Modified:**
- `src/app/api/columns/[id]/route.ts` - Added DELETE endpoint
- `src/lib/server/repositories/column-config-repository.ts` - Added ownership check to deleteColumn
- `src/lib/services/column-service.ts` - Added deleteCustomColumn method
- `src/components/dashboard/manage-columns-dropdown.tsx` - Added delete button and confirmation dialog
- `messages/sv.json` - Added Swedish translations
- `tests/unit/components/manage-columns-dropdown.test.tsx` - Added delete functionality tests
- `tests/unit/repositories/column-config-repository.test.ts` - Updated with ownership checks

### File List

**Modified:**
- `src/app/api/columns/[id]/route.ts` - Added DELETE endpoint with ownership verification
- `src/lib/server/repositories/column-config-repository.ts` - Updated deleteColumn with ownership check
- `src/lib/services/column-service.ts` - Added deleteCustomColumn method
- `src/components/dashboard/manage-columns-dropdown.tsx` - Added delete button and confirmation dialog
- `messages/sv.json` - Added Swedish translations for delete functionality
- `tests/unit/components/manage-columns-dropdown.test.tsx` - Added 6 delete functionality tests
- `tests/unit/repositories/column-config-repository.test.ts` - Updated deleteColumn tests with ownership checks
- `docs/stories/story-17.2.md` - Updated tasks and added Dev Agent Record

## Change Log

| Date       | Description                                    | Author    |
| ---------- | ---------------------------------------------- | --------- |
| 2025-12-05 | Added delete functionality for custom columns  | Dev Agent |
| 2025-12-05 | Added ownership verification for delete operations | Dev Agent |
| 2025-12-05 | Added Swedish translations for delete UI       | Dev Agent |
| 2025-12-05 | Created unit tests for delete functionality    | Dev Agent |

