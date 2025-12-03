# Story 16.5: Field Highlighting in Employee Table

**Story:** As an external party user, I want changed fields to be visually highlighted in the employee table, so that I can quickly identify which specific fields have been updated.

**Status:** pending  
**Epic:** Epic 16: Employee Data Change Notifications

---

## Acceptance Criteria

### Criterion 1: Field Highlighting
- **Given** an employee has changed columns
- **When** the employee table renders
- **Then** cells for changed columns have a soft yellow/amber background color
- **And** the highlight is clearly visible but doesn't make text unreadable
- **And** the highlight applies to the entire cell (not just text)

### Criterion 2: Column Mapping
- **Given** change data uses `db_column_name` (e.g., 'first_name')
- **When** highlighting is applied
- **Then** the system correctly maps `db_column_name` to the displayed column
- **And** highlights the correct cell in the table
- **And** handles both masterdata and custom columns correctly

### Criterion 3: Highlight Persistence
- **Given** highlights are applied
- **When** the user interacts with the table (scrolls, filters, sorts)
- **Then** highlights persist (don't disappear)
- **And** highlights remain until next login or page refresh
- **And** highlights update if changes are refreshed

### Criterion 4: Multiple Column Highlights
- **Given** an employee has multiple changed columns
- **When** the table renders
- **Then** all changed columns are highlighted
- **And** each highlighted cell is independent (can have different values)

### Criterion 5: No Highlight for Unchanged
- **Given** an employee has some changed columns and some unchanged
- **When** the table renders
- **Then** only changed columns are highlighted
- **And** unchanged columns have normal styling
- **And** employees with no changes have no highlights

### Criterion 6: Highlight Styling
- **Given** a highlighted cell
- **When** it's rendered
- **Then** it uses soft yellow/amber color (e.g., `#FEF3C7` or `#FDE68A`)
- **And** text remains readable (proper contrast)
- **And** styling works in both light and dark mode
- **And** styling doesn't interfere with other cell states (hover, focus, edit mode)

### Criterion 7: Mobile Compatibility
- **Given** the table is viewed on mobile
- **When** highlights are applied
- **Then** highlights work in mobile card view
- **And** highlights are visible and don't break layout
- **And** touch interactions still work on highlighted fields

### Criterion 8: Inline Editing Compatibility
- **Given** a highlighted field
- **When** the user clicks to edit it
- **Then** the highlight doesn't interfere with edit mode
- **And** edit mode styling takes precedence
- **And** after saving, highlight remains if field still changed

### Criterion 9: Performance
- **Given** a table with many employees and changes
- **When** highlights are applied
- **Then** rendering performance is acceptable (<100ms overhead)
- **And** highlights don't cause unnecessary re-renders
- **And** lookup of change status is efficient (memoized)

---

## Technical Notes

### Highlight Logic

Use `isColumnChanged()` from `useEmployeeChanges()` hook:

```typescript
const { isColumnChanged } = useEmployeeChanges();

// In cell renderer
const isChanged = isColumnChanged(employee.id, column.db_column_name);
const cellClassName = isChanged 
  ? 'bg-amber-50 dark:bg-amber-950/20' 
  : '';
```

### Column Mapping

- Change data uses `db_column_name` from `column_config`
- Table columns also have `db_column_name` property
- Match on `db_column_name` to determine if column changed
- Handle both table view and mobile card view

### Styling Approach

**Option 1: Conditional className**
- Add highlight class to cell based on `isColumnChanged()`
- Use Tailwind classes: `bg-amber-50 dark:bg-amber-950/20`

**Option 2: Inline styles**
- Apply background color via inline style
- More flexible but less maintainable

**Recommendation:** Option 1 (conditional className) for consistency with existing codebase.

### Integration Points

- **EmployeeTable component:** Apply highlights in cell renderers
- **EditableCell component:** Ensure highlights work with inline editing
- **Mobile card view:** Apply highlights to card fields
- **useEmployeeChanges hook:** Provide `isColumnChanged` function

### Highlight Colors

- Light mode: `bg-amber-50` or `bg-yellow-50` (soft yellow)
- Dark mode: `bg-amber-950/20` or `bg-yellow-950/20` (subtle amber)
- Ensure contrast ratio meets WCAG AA (4.5:1 for normal text)

### Performance Optimization

- Memoize `isColumnChanged` function in hook
- Use `useMemo` for highlight calculations if needed
- Avoid re-rendering entire table when highlights change
- Consider virtual scrolling for large tables

---

## Tasks

- [ ] Integrate `useEmployeeChanges()` hook in EmployeeTable component
- [ ] Implement `isColumnChanged` lookup in cell renderers
- [ ] Add highlight styling (conditional className)
- [ ] Test column mapping (db_column_name matching)
- [ ] Test highlight persistence (scroll, filter, sort)
- [ ] Test multiple column highlights
- [ ] Test mobile card view highlights
- [ ] Test inline editing compatibility
- [ ] Test light/dark mode styling
- [ ] Test performance with large datasets
- [ ] Verify accessibility (color contrast)
- [ ] Update EditableCell component if needed
- [ ] Document highlight behavior

---

## Prerequisites

- Story 16.3: Frontend Change Tracking Hook (hook must exist)
- Story 2.1: Employee List Table View (table component must exist)
- Story 4.4: Inline Editing for Masterdata Fields (editable cells must exist)
- Tailwind CSS or styling system in place

---

## Testing Requirements

### Unit Tests
- Test `isColumnChanged` function
- Test column mapping logic
- Test highlight className application

### Integration Tests
- Test highlights in EmployeeTable component
- Test highlights with inline editing
- Test highlights in mobile card view
- Test highlight persistence across interactions

### E2E Tests
- Test complete flow: login → see highlights → interact with table → verify highlights persist
- Test highlights with multiple changed columns
- Test highlights don't interfere with editing

### Manual Testing
- Verify highlights appear on changed fields
- Verify highlights are correct color (soft yellow/amber)
- Verify highlights work in light/dark mode
- Verify highlights don't break inline editing
- Verify highlights work on mobile
- Verify performance is acceptable
- Verify accessibility (color contrast)

