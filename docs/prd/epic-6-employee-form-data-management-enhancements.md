# Epic 6: Employee Form & Data Management Enhancements

**Epic Goal**: Address UAT-discovered usability gaps in employee form validation, data loss prevention, important dates CSV import, column management UX, and user activity tracking to ensure production-ready HR workflows.

**Epic Origin**: User acceptance testing feedback from Stena Line HR staff (October 30, 2025)

**Estimated Total Effort**: 24-32 hours (approximately 3-4 working days)

**Priority**: **P0-P1** (Critical to High) - Production-critical usability issues

---

## Business Context

After deploying Epic 5.5 (Post-MVP Polish & Branding) to production, comprehensive user acceptance testing with Stena Line HR staff revealed **8 critical usability gaps** and **missing business requirements** that prevent the system from matching real-world HR workflows.

### Key User Pain Points

1. **Form Validation Mismatch**: Email required when it should be optional; Rank optional when it should be mandatory
2. **Manual Date Entry**: HR staff manually typing dates instead of selecting from pre-configured Important Dates
3. **PE3 Date Conflicts**: Multiple employees assigned same PE3 date causing scheduling conflicts
4. **Data Loss Risk**: Accidental modal closure during slow phone-based data entry loses all unsaved work
5. **CSV Import Gaps**: No way to bulk-import important dates; overly strict validation prevents partial data imports
6. **Column Management Confusion**: No visual feedback for hidden columns; no way to reorder columns for preferred layout
7. **User Activity Blindspot**: Cannot identify inactive user accounts for cleanup
8. **UI Text Clutter**: Unnecessary login page text; root page translation regression

### Business Impact

**Without Epic 6:**
- HR staff waste time re-entering lost form data (estimated 2-3 incidents per week)
- Scheduling conflicts from duplicate PE3 date assignments
- Manual date entry increases error rate and slows employee onboarding
- Cannot efficiently manage user accounts (no activity tracking)
- Unprofessional user experience (text issues, poor column management UX)

**With Epic 6:**
- Zero data loss from accidental modal closure
- Guaranteed unique PE3 date assignments (inventory management)
- Faster, more accurate employee onboarding (date pickers from Important Dates)
- Efficient user account lifecycle management
- Professional, production-ready user experience

---

## Story 6.1: Update Employee Form Field Validation

**As an** HR Admin,  
**I want** email to be optional, rank to be mandatory, and date fields integrated with Important Dates,  
**so that** the form matches our actual HR data collection requirements.

### Acceptance Criteria

1. Email field validation changed from mandatory to optional
2. Rank field validation changed from optional to mandatory
3. Stena Date field: Dropdown populated from Important Dates table (category: "Stena Dates"), mandatory
4. ÖMC Date field: Dropdown populated from Important Dates table (category: "ÖMC Dates"), mandatory
5. PE3 Date field: Dropdown populated from Important Dates table (category: "PE3 Dates"), optional
6. All date dropdowns default to closest future date (date >= today)
7. Date dropdown options display in format: "Week [number] - [date_description]" (e.g., "Week 14 - Fredag 14/2")
8. Validation error messages updated to reflect new mandatory/optional status
9. Add Employee modal updates immediately when Important Dates table changes
10. Update `src/lib/validation/employee-schema.ts` to reflect new rules
11. Update translations for new validation messages

**Estimated Effort:** 4-5 hours

---

## Story 6.2: PE3 Date Unique Selection (Inventory Management)

**As an** HR Admin,  
**I want** PE3 dates to be removed from the dropdown once assigned to an employee,  
**so that** each PE3 date can only be used once across all employees.

### Acceptance Criteria

1. PE3 Date dropdown excludes dates already assigned to any employee
2. When PE3 Date is removed from an employee, it returns to available pool
3. Visual indicator shows "X PE3 dates remaining" below dropdown
4. If no PE3 dates available, show message: "No PE3 dates available. Add more in Important Dates."
5. Real-time sync: If another HR Admin assigns a PE3 date, it disappears from current user's dropdown immediately
6. Edit Employee modal respects same logic (can change PE3 date, but only to unassigned dates)
7. PE3 Date field can be cleared (set to null) to release the date
8. Database query optimized to fetch available PE3 dates efficiently
9. API endpoint `/api/important-dates/available-pe3` returns only unassigned PE3 dates
10. Unit tests for PE3 date assignment/release logic

**Estimated Effort:** 5-6 hours

---

## Story 6.3: Add Employee Form Data Loss Prevention

**As an** HR Admin,  
**I want** a confirmation prompt when closing the Add Employee modal with unsaved data,  
**so that** I don't accidentally lose data entered during slow form entry (e.g., during phone calls).

### Acceptance Criteria

1. Track form "dirty" state (has user entered any data?)
2. When user clicks "Cancel" button AND form is dirty: Show confirmation dialog
3. When user clicks outside modal (backdrop click) AND form is dirty: Show confirmation dialog
4. When user presses Escape key AND form is dirty: Show confirmation dialog
5. Confirmation dialog text: "Are you sure you want to exit this view? Your data will not be saved."
6. Confirmation dialog buttons: "Continue Editing" (default focus) and "Discard Changes"
7. Clicking "Discard Changes" closes modal and clears form
8. Clicking "Continue Editing" returns user to form
9. If form is pristine (no data entered), allow immediate close (no prompt)
10. Same logic applies to Edit Employee modal
11. Translated confirmation text (Swedish/English)

**Estimated Effort:** 2-3 hours

---

## Story 6.4: Important Dates CSV Import

**As an** HR Admin,  
**I want** to import important dates from a CSV file,  
**so that** I can bulk-load dates from Excel or other planning tools.

### Acceptance Criteria

1. "Import Dates" button on Important Dates page
2. CSV file upload modal with example format displayed
3. Expected CSV columns: Week Number, Year, Category, Date Description, Date Value, Notes
4. Column mapping interface (similar to employee CSV import)
5. Preview first 5 rows before import
6. Validation: Week Number (1-53), Year (4 digits), Category (text), Date Description (text), Date Value (text), Notes (optional)
7. Import allows empty/null values for optional fields (Notes)
8. Duplicate detection: Skip rows with exact same Week Number + Year + Category combination
9. Progress indicator during import
10. Success summary: "Imported X dates. Skipped Y duplicates."
11. Error report downloadable if validation failures occur
12. API endpoint `/api/important-dates/import` (POST)
13. Only HR Admin role can import dates (role check in API route)

**Estimated Effort:** 4-5 hours

---

## Story 6.5: Relax CSV Import Validation for Empty Fields

**As an** HR Admin,  
**I want** CSV imports to allow empty values for optional fields,  
**so that** I can import partial data without validation errors.

### Acceptance Criteria

1. Employee CSV import: Email can be empty (validation skipped)
2. Employee CSV import: Rank must still be present (new mandatory rule)
3. Employee CSV import: All other optional fields can be empty
4. Important Dates CSV import: Notes field can be empty
5. Import error messages distinguish between "missing required field" and "invalid format"
6. Update `src/app/api/employees/import/route.ts` to use relaxed validation schema
7. Update `src/app/api/important-dates/import/route.ts` to allow empty optional fields
8. Import preview clearly shows empty fields as "(empty)" or blank cells
9. No database constraint violations for null/empty optional fields
10. Unit tests for relaxed CSV validation

**Estimated Effort:** 2-3 hours

---

## Story 6.6: Column Management UX Improvements

**As an** HR Admin,  
**I want** clear visual feedback for hidden columns and the ability to reorder columns via drag-and-drop,  
**so that** I can customize the table layout for my workflow.

### Acceptance Criteria

1. **Add Column Button:**
   - "Add Column" button visible on Column Settings page for HR Admin
   - Opens modal with fields: Column Name, Data Type (Text/Number/Date/Boolean), Category (optional)
   - Clicking "Create" adds column to column_config table and makes it visible in employee table

2. **Hide Column Visual Feedback:**
   - Hidden columns show "Hidden" badge in Column Settings table
   - Visible columns show "Visible" badge or checkmark icon
   - Toggle button changes text: "Hide"  "Show" based on current state
   - Hidden columns do NOT appear in employee table (already implemented, just need visual indicator)

3. **Drag-and-Drop Column Reordering:**
   - Drag handle icon () on each column row in Column Settings table
   - HR Admin can drag columns to reorder them
   - New order saved to `column_config.display_order` field (new database column)
   - Employee table columns render in order specified by `display_order`
   - Reordering is persistent across sessions

4. **Database Schema Update:**
   - Add `display_order` column to `column_config` table (integer, default 0)
   - Migration script to populate default order for existing columns

5. **Responsive Design:**
   - Drag-and-drop works on desktop (mouse)
   - Mobile: Show "Move Up" / "Move Down" buttons instead of drag-and-drop

6. **Translations:**
   - "Add Column" button translated
   - "Hidden" / "Visible" badges translated
   - Drag handle accessible label: "Reorder column" (English) / "Ordna kolumn" (Swedish)

**Estimated Effort:** 6-8 hours

**Dependencies:** Requires database migration for `display_order` column

---

## Story 6.7: Add Last Active Timestamp to User Table

**As an** HR Admin,  
**I want** to see when each user was last active in the system,  
**so that** I can identify inactive accounts and manage user access.

### Acceptance Criteria

1. **Database Schema:**
   - Add `last_active_at` column to `users` table (timestamp, nullable)
   - Migration script to add column

2. **Activity Tracking:**
   - Middleware updates `last_active_at` timestamp on every authenticated request
   - Timestamp update happens asynchronously (non-blocking)
   - Update only if last activity > 5 minutes ago (avoid excessive DB writes)

3. **User Management Table:**
   - Add "Last Active" column to User Management table
   - Display relative time: "2 hours ago", "3 days ago", "Never" (if null)
   - Sort by Last Active (newest first by default)

4. **API Endpoint:**
   - PATCH `/api/admin/users/[id]/update-activity` (internal use by middleware)

5. **Performance:**
   - Activity update uses optimistic locking or upsert pattern
   - No impact on page load time (<10ms overhead)

6. **Privacy:**
   - Last Active timestamp only visible to HR Admin role
   - Other users cannot see their own or others' activity

7. **Translations:**
   - "Last Active" column header translated
   - Relative time strings translated (next-intl provides this via `relativeTime` formatter)

**Estimated Effort:** 3-4 hours

**Dependencies:** Requires database migration for `last_active_at` column

---

## Story 6.8: Remove Login Page Instructional Text & Fix Root Page Translation

**As a** user,  
**I want** a clean login page and Swedish-only root page,  
**so that** the interface is polished and matches language requirements.

### Acceptance Criteria

1. **Login Page:**
   - Remove text: "Ange dina uppgifter för att komma åt HR Masterdata-systemet" (Swedish)
   - Remove text: "Enter your credentials to access the HR Masterdata Management System" (English)
   - Keep only: Login form (email, password, submit button)
   - Keep Stena Line branding (logo, background image)

2. **Root Page Translation Fix:**
   - Verify `/sv` route shows Swedish content (investigate why Story 5.13 didn't fix this)
   - Root cause analysis: Check if locale routing middleware is interfering
   - Ensure root page (`src/app/page.tsx`) is NOT wrapped in locale routing
   - All text in Swedish: "Stena Line Säsongsrekrytering", description paragraph, "Logga in till systemet" button
   - No third-party company names mentioned

3. **Testing:**
   - Navigate to `/`  should show Swedish content
   - Navigate to `/sv`  should redirect to `/` or show same Swedish content
   - Navigate to `/en`  should redirect to `/en/dashboard` (authenticated) or `/en/login` (unauthenticated)

4. **Translations:**
   - Verify all translation keys used in root page exist in `messages/sv.json`
   - No hardcoded English text remains

**Estimated Effort:** 1-2 hours

**Note:** This is a **regression fix** + cleanup story. Root page issue may be due to middleware configuration or deployment caching.

---

## Epic Summary

**Total Stories:** 8 (Stories 6.1-6.8)

**Priority Order:**

1. **P0 Critical:**
   - Story 6.3 (Data Loss Prevention) - Prevents actual data loss
   - Story 6.2 (PE3 Unique Selection) - Prevents scheduling conflicts

2. **P1 High:**
   - Story 6.1 (Form Validation Update) - Core workflow improvement
   - Story 6.8 (Login/Root Page Cleanup) - User-facing polish

3. **P2 Medium:**
   - Story 6.4 (Important Dates CSV Import) - Efficiency improvement
   - Story 6.5 (Relax CSV Validation) - Import flexibility
   - Story 6.6 (Column Management UX) - Power user feature
   - Story 6.7 (Last Active Tracking) - Admin convenience

**Suggested Implementation Order:**

1. Story 6.8 (1-2 hours) - Quick win, high visibility
2. Story 6.1 (4-5 hours) - Foundation for Stories 6.2
3. Story 6.3 (2-3 hours) - Data loss prevention
4. Story 6.2 (5-6 hours) - Complex logic, depends on 6.1
5. Story 6.5 (2-3 hours) - Foundation for 6.4
6. Story 6.4 (4-5 hours) - CSV import feature
7. Story 6.7 (3-4 hours) - Requires migration
8. Story 6.6 (6-8 hours) - Most complex, requires migration

**Epic Progress Tracking:**

- Total Effort: 28-36 hours
- Critical Path: Stories 6.1  6.2 (form validation dependency)
- Database Migrations: 2 (Stories 6.6, 6.7)

**Definition of Done for Epic 6:**

1. All 8 stories pass acceptance criteria
2. Automated tests updated and passing (>95% pass rate maintained)
3. Database migrations successfully deployed
4. UAT validation with Stena Line HR staff
5. No regression in existing Epic 1-5.5 functionality
6. User Guide updated with new features (CSV import, column reordering)
7. Deployed to production and smoke tested

**Impact on MVP Success Criteria:**

-  Improves data accuracy (form validation aligned with business rules)
-  Reduces HR administrative time (CSV import, date pickers)
-  Prevents data integrity issues (PE3 unique selection)
-  Increases user confidence (data loss prevention)
-  Enhances system professionalism (UI polish)

---

**Created:** October 30, 2025  
**Status:** Approved - Ready for Development  
**Sprint Change Proposal:** Generated via `*correct-course` task (YOLO mode)
