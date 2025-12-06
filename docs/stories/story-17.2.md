# Story 17.2: Delete Functionality for Custom Columns

**Story:** As an external party user, I want to delete my own custom columns, so that I can remove columns I no longer need.

**Status:** Approved  
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

- [ ] Create DELETE API endpoint `/api/columns/:columnId`
- [ ] Add permission check in API endpoint
- [ ] Add `deleteColumn` method to column service
- [ ] Add Delete button to manage columns modal
- [ ] Implement delete handler with confirmation
- [ ] Add success/error toast messages
- [ ] Test delete functionality
- [ ] Test permission restrictions
- [ ] Test error handling
- [ ] Add Swedish translations for delete messages
- [ ] Update column list after deletion

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

