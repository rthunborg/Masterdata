# Manual Testing Guide: Story 5.9 - Swedish/English Language Toggle

## Status

**Done**

## Prerequisites

- ✅ Dev server running: `pnpm dev` → http://localhost:3000
- ✅ Production build tested: `pnpm build` → Successful
- ✅ All translation files in place
- ✅ Language toggle component integrated in header

## Test Scenarios

### Test 1: Default Language (English)

**Steps:**

1. Open a new incognito/private browser window
2. Navigate to http://localhost:3000
3. Observe the landing page

**Expected Results:**

- ✅ Page displays in English
- ✅ URL shows `/en` (e.g., http://localhost:3000/en)
- ✅ All UI text is in English
- ✅ Language toggle shows: 🇬🇧 EN (or just 🇬🇧 on mobile)

### Test 2: Language Toggle to Swedish

**Steps:**

1. Log in to the system with test credentials
2. Locate the language toggle button in the header (between role badge and sign-out button)
3. Click the language toggle button (should show 🇬🇧 EN)

**Expected Results:**

- ✅ Page refreshes automatically
- ✅ URL changes from `/en/dashboard` to `/sv/dashboard`
- ✅ All UI text changes to Swedish:
  - Header: "Logga ut" instead of "Sign Out"
  - Dashboard title: "Personalhantering" instead of "Employee Management"
  - Buttons: "Lägg till anställd" instead of "Add Employee"
  - Search placeholder: "Sök anställda..." instead of "Search employees..."
- ✅ Language toggle now shows: 🇸🇪 SV
- ✅ No console errors
- ✅ All functionality still works (search, filters, modals)

### Test 3: Language Toggle Back to English

**Steps:**

1. While on Swedish version, click the language toggle again

**Expected Results:**

- ✅ Page returns to English
- ✅ URL changes back to `/en/dashboard`
- ✅ All UI text returns to English

### Test 4: Language Persistence

**Steps:**

1. Switch to Swedish
2. Close the browser completely
3. Reopen browser and navigate to http://localhost:3000
4. Log in

**Expected Results:**

- ✅ System remembers Swedish preference
- ✅ Opens directly to `/sv/` routes
- ✅ All UI text in Swedish

### Test 5: Language Across Pages

**Steps:**

1. Set language to Swedish
2. Navigate to:
   - Important Dates page
   - User Management (if HR Admin)
   - Column Settings (if HR Admin)

**Expected Results:**

- ✅ Language stays Swedish across all pages
- ✅ URLs maintain `/sv/` prefix
- ✅ All page-specific text translated:
  - Important Dates: "Viktiga datum"
  - User Management: "Användarhantering"
  - Column Settings: "Kolumninställningar"

### Test 6: Modal Translations

**Steps:**

1. Set language to Swedish
2. Click "Lägg till anställd" (Add Employee)
3. Observe the modal

**Expected Results:**

- ✅ Modal title: "Lägg till anställd"
- ✅ Form labels in Swedish:
  - "Förnamn" (First Name)
  - "Efternamn" (Surname)
  - "Personnummer" (SSN)
  - "E-post" (Email)
  - "Kön" (Gender)
- ✅ Gender options in Swedish: "Man", "Kvinna", "Annat", "Vill inte uppge"
- ✅ Buttons: "Spara" (Save), "Avbryt" (Cancel)

### Test 7: Validation Error Messages

**Steps:**

1. Set language to Swedish
2. Open "Add Employee" modal
3. Try to submit with empty required fields

**Expected Results:**

- ✅ Error messages in Swedish:
  - "Förnamn krävs" (First name is required)
  - "Efternamn krävs" (Surname is required)
  - "Personnummer krävs" (SSN is required)
  - "E-post krävs" (Email is required)

### Test 8: Responsive Design

**Steps:**

1. Resize browser to mobile width (< 640px)
2. Observe language toggle

**Expected Results:**

- ✅ Language toggle shows only flag emoji (🇬🇧 or 🇸🇪)
- ✅ No "EN" or "SV" text visible on mobile
- ✅ Button is still clickable and switches language

### Test 9: Accessibility

**Steps:**

1. Tab through the header using keyboard
2. Focus on language toggle button
3. Press Enter to activate

**Expected Results:**

- ✅ Language toggle is keyboard accessible
- ✅ Has visible focus indicator
- ✅ ARIA label present (check with screen reader or browser DevTools)
- ✅ Language switches on Enter key

## Known Limitations (Expected)

- ⚠️ API error messages from Supabase remain in English (external library)
- ⚠️ Some toast notifications may use hardcoded English (if not yet updated)
- ⚠️ Database field names remain in English (not user-facing)

## Reporting Results

After completing manual testing, please document:

1. ✅ Which tests passed
2. ❌ Which tests failed (with screenshots if possible)
3. 🐛 Any bugs or unexpected behavior
4. 💡 Suggestions for improvement

## Next Steps After Manual Testing

1. Fix any bugs found during manual testing
2. Update component tests to wrap with `NextIntlClientProvider`
3. Mark story as "Ready for Review" if all tests pass
4. Deploy to staging for QA review
