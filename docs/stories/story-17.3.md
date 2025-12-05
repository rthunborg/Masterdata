# Story 17.3: Category Color Editing in Edit Column Modal

**Story:** As an external party user, I want to edit the category color when editing my custom column, and I don't want to see the columnTypeHint text, so that I can customize category colors and have a cleaner edit interface.

**Status:** Approved  
**Epic:** Epic 17: External User UX Improvements

---

## Acceptance Criteria

### Criterion 1: Remove columnTypeHint
- **Given** an external user opens the edit column modal
- **When** the modal displays
- **Then** the `columnTypeHint` text is not shown
- **And** the column type field (if displayed) does not have the hint text below it
- **And** the UI is cleaner without the hint

### Criterion 2: Category Color Picker Display
- **Given** an external user is editing a custom column
- **When** they view the category field
- **Then** a color picker/selector is available for the category color
- **And** the current category color (if any) is displayed
- **And** the color picker is clearly associated with the category field

### Criterion 3: Category Color Selection
- **Given** an external user is editing a column's category
- **When** they select or type a category
- **Then** they can also select/change the color for that category
- **And** the color picker shows predefined color options
- **And** the color picker allows custom hex color input
- **And** the selected color is saved with the category

### Criterion 4: Color Persistence
- **Given** an external user changes a category color
- **When** they save the column
- **Then** the category color is updated in the database
- **And** the color is applied to all columns sharing that category
- **And** the color is visible in the table headers

### Criterion 5: Color Preview
- **Given** an external user selects a category color
- **When** they are in the edit modal
- **Then** a color preview/swatch is displayed
- **And** the preview shows the selected color
- **And** the preview updates when color changes

### Criterion 6: Existing Category Color
- **Given** an external user edits a column with an existing category
- **When** the modal opens
- **Then** the existing category color (if any) is displayed
- **And** the color picker shows the current color
- **And** the user can change it or keep it

---

## Technical Notes

### Remove columnTypeHint

In `src/components/dashboard/edit-column-modal.tsx`:
- Remove lines 204-206 (the `<p>` tag with `columnTypeHint`)
- Keep the column type field if needed for display, but remove the hint text

### Category Color Field

Add to the edit column form schema:
```typescript
category_color?: string | null; // Hex color code
```

### Color Picker Component

Use existing color picker infrastructure from Story 9.1:
- Can reuse color picker from `add-column-modal.tsx` if it exists
- Or create shared color picker component
- Use predefined color palette (8-10 colors)
- Allow custom hex input

### Form Field Addition

Add to `edit-column-modal.tsx`:

```tsx
<FormField
  control={form.control}
  name="category_color"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Kategorifärg (Valfritt)</FormLabel>
      <ColorPicker
        value={field.value || null}
        onChange={field.onChange}
        predefinedColors={PREDEFINED_COLORS}
      />
    </FormItem>
  )}
/>
```

### Update Schema

Update `updateColumnSchema` in `src/lib/validation/column-validation.ts`:
```typescript
category_color: z.string().regex(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$/).nullable().optional(),
```

### API Update

Ensure the update column API endpoint accepts `category_color`:
- `PATCH /api/columns/:columnId`
- Include `category_color` in request body
- Update `column_config.category_color` in database

### Color Picker Implementation

Options:
1. **Reuse from add-column-modal** - If color picker exists there, extract to shared component
2. **Use react-colorful** - Lightweight color picker library
3. **Custom with shadcn/ui** - Build using Popover + color swatches

Recommendation: Reuse existing implementation from Story 9.1 if available.

### Category Color Update Logic

When category color is updated:
- Update `column_config.category_color` for the edited column
- If multiple columns share the category, consider:
  - Option A: Update all columns with same category (shared color)
  - Option B: Only update the edited column (per-column color)
  
Recommendation: Option A (shared color) for consistency, but verify with product requirements.

---

## Tasks

- [ ] Remove `columnTypeHint` from edit column modal
- [ ] Add `category_color` field to update column schema
- [ ] Add color picker component to edit column modal
- [ ] Update form to include category_color field
- [ ] Update API endpoint to accept category_color
- [ ] Update column service to handle category_color
- [ ] Test color selection and saving
- [ ] Test color preview display
- [ ] Test existing category color loading
- [ ] Test color update affects all columns with same category (if applicable)
- [ ] Add Swedish translations for color picker labels

---

## Prerequisites

- Story 17.1: Swedish Translations (for color picker labels)
- Story 9.1: Category Color Coding (color infrastructure should exist)
- Edit column modal must exist
- Column update API must exist

---

## Testing Requirements

### Unit Tests
- Test form schema accepts category_color
- Test color picker component
- Test color validation (hex format)

### Integration Tests
- Test category color is saved when updating column
- Test existing category color loads correctly
- Test color picker updates form state
- Test API accepts and saves category_color

### E2E Tests
- Test complete flow: open edit modal → select color → save → verify color applied
- Test color preview updates when color changes
- Test existing color displays when editing column

### Manual Testing
- Login as external user
- Open edit column modal
- Verify columnTypeHint is not shown
- Verify color picker is available
- Select a color
- Verify color preview
- Save and verify color is applied
- Edit another column with same category, verify color is shared (if applicable)

---

## Notes

- Verify if category colors should be shared across all columns with same category, or per-column
- Consider accessibility: ensure color picker is keyboard navigable
- Ensure color contrast meets WCAG standards for text on colored backgrounds

