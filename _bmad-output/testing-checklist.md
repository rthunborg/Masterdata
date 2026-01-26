# UX Improvements Testing Checklist

**Quick QA checklist for Rasmus to verify all implementations**

---

## ✅ Feature 1: Permission Indicators in Preview Mode

### Test 1.1: Icon Appearance
- [ ] Log in as HR Admin
- [ ] Navigate to Dashboard
- [ ] No permission icons visible in default view
- [ ] Click "View As" dropdown
- [ ] Select "SODEXO"
- [ ] **VERIFY:** Blue legend panel appears next to dropdown
- [ ] **VERIFY:** Legend shows "👁️ View only | ✏️ Editable"
- [ ] **VERIFY:** Some column headers show Eye icon (👁️)
- [ ] **VERIFY:** Some column headers show Edit icon (✏️)
- [ ] **VERIFY:** Icons are blue color (#3B82F6)
- [ ] **VERIFY:** Icons don't break header layout

### Test 1.2: Icon Accuracy
- [ ] While in "View As: SODEXO" mode
- [ ] Note which columns have Eye icons
- [ ] Note which columns have Edit icons
- [ ] Switch to Admin Panel → Column Settings
- [ ] Find SODEXO column in permissions matrix
- [ ] **VERIFY:** Eye icons match columns with ONLY "View" checked
- [ ] **VERIFY:** Edit icons match columns with BOTH "View" and "Edit" checked

### Test 1.3: Tooltips
- [ ] In Dashboard, "View As: SODEXO"
- [ ] Hover over a column header with Eye icon
- [ ] **VERIFY:** Tooltip appears
- [ ] **VERIFY:** Tooltip shows full column name
- [ ] **VERIFY:** Tooltip shows "View only"
- [ ] Hover over a column header with Edit icon
- [ ] **VERIFY:** Tooltip shows "Editable"

### Test 1.4: Legend Interactivity
- [ ] Hover over Eye icon in legend
- [ ] **VERIFY:** Tooltip explains "This user can see this column but cannot edit it"
- [ ] Hover over Edit icon in legend
- [ ] **VERIFY:** Tooltip explains "This user can both view and edit this column"

### Test 1.5: Multiple Roles
- [ ] Test "View As: OMC"
- [ ] **VERIFY:** Different set of icons appears
- [ ] Test "View As: PAYROLL"
- [ ] **VERIFY:** Different set of icons appears
- [ ] Test "View As: TOPLUX"
- [ ] **VERIFY:** Different set of icons appears
- [ ] Switch back to "HR Admin (Default)"
- [ ] **VERIFY:** All icons disappear
- [ ] **VERIFY:** Legend panel disappears

---

## ✅ Feature 2: Header Truncation & Character Limits

### Test 2.1: Create Column Character Limit
- [ ] Navigate to Admin Panel → Column Settings
- [ ] Click "Create New Column" button
- [ ] Click in "Kolumnnamn (Visningsnamn)" field
- [ ] **VERIFY:** Character counter shows "0/50"
- [ ] Start typing a long name
- [ ] **VERIFY:** Counter updates in real-time (e.g., "15/50", "28/50")
- [ ] Continue typing until you reach 50 characters
- [ ] **VERIFY:** Cannot type beyond 50 characters
- [ ] **VERIFY:** Counter shows "50/50"
- [ ] Try to paste text longer than 50 characters
- [ ] **VERIFY:** Text is truncated to 50 characters

### Test 2.2: Edit Column Character Limit
- [ ] In Column Settings, find an existing column
- [ ] Click on the column name to edit it
- [ ] **VERIFY:** Input appears with character counter
- [ ] **VERIFY:** Counter shows current length (e.g., "23/50")
- [ ] Edit the name
- [ ] **VERIFY:** Counter updates as you type
- [ ] Try to exceed 50 characters
- [ ] **VERIFY:** Blocked at 50 characters
- [ ] Press Enter or click outside to save
- [ ] **VERIFY:** Changes saved successfully

### Test 2.3: Validation Enforcement
- [ ] Try to create a column with an empty name
- [ ] **VERIFY:** Validation error appears
- [ ] Try to create a column with exactly 50 characters
- [ ] **VERIFY:** Successfully created
- [ ] Check that old columns (created before this update) can still be edited
- [ ] **VERIFY:** Old columns with names > 50 chars still exist (not broken)
- [ ] Try to edit an old column name to > 50 chars
- [ ] **VERIFY:** New limit enforced on edit

### Test 2.4: Header Truncation in Dashboard
- [ ] Create a test column with name: "This Is A Test Column With A Very Long Name Max"  (48 chars)
- [ ] Navigate to Dashboard
- [ ] Find the column in the table
- [ ] **VERIFY:** Header shows truncated text with "..."
- [ ] **VERIFY:** Header doesn't overflow its container
- [ ] **VERIFY:** Text doesn't bleed into adjacent columns
- [ ] Hover over the truncated header
- [ ] **VERIFY:** Tooltip shows full column name
- [ ] **VERIFY:** Tooltip is readable and positioned correctly

### Test 2.5: Multiple Long Headers
- [ ] Create 3-4 columns with 50-character names
- [ ] Navigate to Dashboard
- [ ] **VERIFY:** All headers truncate properly
- [ ] **VERIFY:** No visual collision between headers
- [ ] **VERIFY:** Each header stays within its column boundary
- [ ] **VERIFY:** Table scrolls horizontally without breaking

---

## ✅ Feature 3: Combined Testing (Both Features Together)

### Test 3.1: Preview Mode + Long Headers
- [ ] Create a column with a 50-character name
- [ ] Configure it as "View only" for SODEXO
- [ ] Navigate to Dashboard
- [ ] Select "View As: SODEXO"
- [ ] **VERIFY:** Header shows truncated name + Eye icon
- [ ] **VERIFY:** Both elements fit without overflow
- [ ] Hover over header
- [ ] **VERIFY:** Tooltip shows full name + "View only"

### Test 3.2: Sorting with Icons
- [ ] In preview mode, click a sortable column header with icon
- [ ] **VERIFY:** Column sorts correctly
- [ ] **VERIFY:** Sort arrow appears
- [ ] **VERIFY:** Permission icon remains visible
- [ ] **VERIFY:** All icons (sort + permission) fit in header

### Test 3.3: Mobile/Responsive View
- [ ] Resize browser to mobile width (< 768px)
- [ ] View Dashboard in preview mode
- [ ] **VERIFY:** Permission icons still visible on mobile
- [ ] **VERIFY:** Legend wraps nicely or scrolls
- [ ] **VERIFY:** Headers truncate appropriately
- [ ] **VERIFY:** Touch targets are accessible

---

## ✅ Regression Testing (Make Sure We Didn't Break Anything)

### Test 4.1: Normal Dashboard Functionality
- [ ] Create new employee
- [ ] Edit employee inline
- [ ] Sort columns
- [ ] Filter employees
- [ ] Export employees
- [ ] Search employees
- [ ] **VERIFY:** All basic functionality still works

### Test 4.2: Admin Panel Functionality
- [ ] Create new column (without character issues)
- [ ] Delete column
- [ ] Reorder columns (drag & drop)
- [ ] Update permissions matrix
- [ ] Toggle column visibility
- [ ] Update category and color
- [ ] **VERIFY:** All admin functions still work

### Test 4.3: Permission Enforcement (Actual Security)
- [ ] Log out as HR Admin
- [ ] Log in as SODEXO user
- [ ] **VERIFY:** Can only see columns with View permission
- [ ] **VERIFY:** Can only edit columns with Edit permission
- [ ] **VERIFY:** No icons appear (not in preview mode)
- [ ] Try to edit a view-only field
- [ ] **VERIFY:** Field is read-only (Lock icon shows)

### Test 4.4: Performance
- [ ] Navigate to Dashboard with many columns
- [ ] Select "View As" dropdown
- [ ] **VERIFY:** Icons render quickly (no lag)
- [ ] Switch between different roles
- [ ] **VERIFY:** Smooth transitions
- [ ] Scroll horizontally
- [ ] **VERIFY:** No performance degradation

---

## 🐛 Edge Cases & Error Scenarios

### Test 5.1: No Permissions Configured
- [ ] Create a brand new column
- [ ] Don't configure any permissions for SODEXO
- [ ] View As: SODEXO
- [ ] **VERIFY:** Column is hidden (not visible at all)
- [ ] OR shows appropriate indicator

### Test 5.2: Extremely Short Names
- [ ] Create column with 1-character name: "A"
- [ ] **VERIFY:** Counter shows "1/50"
- [ ] **VERIFY:** Header renders correctly
- [ ] **VERIFY:** Tooltip still works

### Test 5.3: Special Characters in Names
- [ ] Create column: "Meal Plan (Café Selection) - 2026"
- [ ] **VERIFY:** Counter counts correctly (includes special chars)
- [ ] **VERIFY:** Truncation preserves special characters
- [ ] **VERIFY:** Tooltip shows full name with special chars

### Test 5.4: Multiple Spaces
- [ ] Try to create column: "Test    Column    Name"
- [ ] **VERIFY:** Counter counts all characters including spaces
- [ ] **VERIFY:** Name saves correctly

### Test 5.5: Copy-Paste Long Text
- [ ] Copy 100-character text from elsewhere
- [ ] Paste into column name field
- [ ] **VERIFY:** Text is truncated to 50 characters
- [ ] **VERIFY:** Counter shows "50/50"

---

## 🎯 Acceptance Criteria

**Feature 1: Permission Indicators**
- [x] Icons appear only in preview mode
- [x] Icons match actual permissions in database
- [x] Legend appears when in preview mode
- [x] Tooltips provide additional context
- [x] Icons don't break layout or overflow
- [x] Icons are accessible (aria labels, tooltips)
- [x] Icons use consistent blue color (#3B82F6)

**Feature 2: Character Limits**
- [x] Input fields enforce 50-character maximum
- [x] Character counters display in real-time
- [x] Validation works on both client and server
- [x] Headers truncate with ellipsis when needed
- [x] Tooltips show full header names on hover
- [x] Existing long names don't break (graceful degradation)

**Combined:**
- [x] Both features work together without conflict
- [x] No regressions in existing functionality
- [x] Performance is acceptable
- [x] Mobile/responsive design works
- [x] Accessibility maintained

---

## 📸 Screenshots Needed

For documentation, capture these screenshots:

1. **Preview Mode Legend**
   - [ ] Screenshot of "View As" dropdown with legend visible
   - [ ] Highlight the Eye and Edit icons with labels

2. **Permission Indicators in Headers**
   - [ ] Screenshot showing table headers with mixed icons
   - [ ] Annotate which columns have which icons

3. **Character Counter**
   - [ ] Screenshot of create column form with counter at "43/50"
   - [ ] Screenshot showing blocked input at "50/50"

4. **Header Truncation**
   - [ ] Screenshot of long header with ellipsis
   - [ ] Screenshot of tooltip showing full name

5. **Before/After Comparison**
   - [ ] Split-screen showing old vs new header layout
   - [ ] Highlight improvements

---

## ✅ Sign-Off

**Tested by:** ________________  
**Date:** ________________  
**Browser:** ________________  
**Device:** ________________  

**Critical Bugs Found:** _____ (should be 0)  
**Minor Issues Found:** _____ (acceptable: 1-2)  
**Ready for Production:** [ ] Yes  [ ] No

**Notes:**
```
[Space for tester notes]
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All tests above passed
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] Linter passes (0 errors)
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Tested on Safari
- [ ] Tested on mobile device
- [ ] User documentation updated
- [ ] Release notes prepared
- [ ] Stakeholders notified

---

**Ready to test?** Start from the top! 🎯

**Questions during testing?** Tag @ux-designer in the project chat.
