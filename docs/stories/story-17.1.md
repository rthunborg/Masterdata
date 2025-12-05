# Story 17.1: Swedish Translations for Custom Column Management

**Story:** As an external party user, I want all custom column management UI text to be in Swedish, so that the interface is properly localized for Swedish users.

**Status:** Approved  
**Epic:** Epic 17: External User UX Improvements

---

## Acceptance Criteria

### Criterion 1: Manage Columns Button Translation
- **Given** an external user has custom columns
- **When** they view the dashboard
- **Then** the "Manage Columns" button displays as "Hantera kolumner" in Swedish
- **And** the button text uses the translation system

### Criterion 2: Manage Custom Columns Modal Translations
- **Given** an external user clicks "Hantera kolumner"
- **When** the modal opens
- **Then** the following texts are in Swedish:
  - "Manage Custom Columns" → "Hantera anpassade kolumner"
  - "Edit your custom column names and categories" → "Redigera dina anpassade kolumnnamn och kategorier"
  - "Uncategorized" → "Okategoriserad" (when displaying uncategorized columns)
- **And** all text uses the translation system

### Criterion 3: Edit Column Modal Translations
- **Given** an external user clicks to edit a custom column
- **When** the edit column modal opens
- **Then** the following field labels are in Swedish:
  - "title" → "Titel" (or appropriate Swedish label)
  - "description" → "Beskrivning" (or appropriate Swedish label)
  - "Select or type a category" → "Välj eller skriv en kategori"
  - "saveButton" → "Spara" (or appropriate Swedish label)
- **And** all text uses the translation system

### Criterion 4: Translation File Updates
- **Given** the translation system
- **When** Swedish translations are added
- **Then** all new translations are added to `messages/sv.json`
- **And** translations use appropriate namespaces (e.g., `modals`, `forms`, `tooltips`)
- **And** translations follow existing naming conventions

### Criterion 5: HR Admin Unaffected
- **Given** an HR Admin user views the same UI
- **When** they interact with custom column management
- **Then** English text is still displayed (default behavior)
- **And** functionality remains unchanged

---

## Technical Notes

### Translation Keys to Add

Add to `messages/sv.json`:

```json
{
  "tooltips": {
    "manageColumns": "Hantera kolumner"
  },
  "modals": {
    "manageCustomColumns": "Hantera anpassade kolumner",
    "editCustomColumnsDescription": "Redigera dina anpassade kolumnnamn och kategorier",
    "uncategorized": "Okategoriserad"
  },
  "forms": {
    "title": "Titel",
    "description": "Beskrivning",
    "selectOrTypeCategory": "Välj eller skriv en kategori",
    "save": "Spara"
  }
}
```

### Components to Update

1. **`src/components/dashboard/manage-columns-dropdown.tsx`**
   - Line 59: "Manage Columns" button text
   - Line 64: "Manage Custom Columns" title
   - Line 66: "Edit your custom column names and categories" description
   - Line 74: "Uncategorized" category header (if displayed)

2. **`src/components/dashboard/edit-column-modal.tsx`**
   - Form field labels: title, description
   - Category combobox placeholder: "Select or type a category"
   - Save button text

### Translation Hook Usage

```typescript
const t = useTranslations('tooltips');
const tModals = useTranslations('modals');
const tForms = useTranslations('forms');

// In component
<Button>{t('manageColumns')}</Button>
<DialogTitle>{tModals('manageCustomColumns')}</DialogTitle>
<FormLabel>{tForms('title')}</FormLabel>
```

### Testing Translation Keys

- Verify all keys exist in `messages/sv.json`
- Test with Swedish locale set
- Verify English fallback works for HR Admin

---

## Tasks

- [ ] Add Swedish translations to `messages/sv.json`
- [ ] Update `manage-columns-dropdown.tsx` to use translations
- [ ] Update `edit-column-modal.tsx` to use translations
- [ ] Test translations display correctly for external users
- [ ] Verify English text still shows for HR Admin
- [ ] Test with different user roles (sodexo, omc, payroll, toplux)
- [ ] Verify "Uncategorized" translation appears when applicable

---

## Prerequisites

- Translation system (`useTranslations` hook) must exist
- `messages/sv.json` file must exist
- Custom column management components must exist

---

## Testing Requirements

### Unit Tests
- Test translation keys exist in `messages/sv.json`
- Test components use translation hooks correctly

### Integration Tests
- Test Swedish translations display for external users
- Test English text displays for HR Admin
- Test all translation keys are used correctly

### Manual Testing
- Login as external user (sodexo, omc, etc.)
- Verify "Hantera kolumner" button text
- Open manage columns modal, verify Swedish text
- Open edit column modal, verify Swedish text
- Login as HR Admin, verify English text still shows

---

## Notes

- This story focuses only on translations, not functionality changes
- Ensure translation keys follow existing naming patterns
- Consider future-proofing for additional languages if needed

