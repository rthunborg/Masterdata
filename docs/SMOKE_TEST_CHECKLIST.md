# MVP Smoke Test Checklist

**Version:** 1.0  
**Last Updated:** October 29, 2025  
**Test Environment:** [To be filled during test execution]  
**Tester:** [To be filled during test execution]

---

## Test Environment Setup

### Prerequisites

Before executing smoke tests, ensure the following setup is complete:

- [ ] **Test Environment Running**: Application deployed and accessible at test URL
- [ ] **Database Seeded**: Test employee data loaded (minimum 100 employees for performance tests)
- [ ] **Test Users Created**: All user roles created with known credentials
  - [ ] HR Admin user: hradmin@test.com
  - [ ] Sodexo user: sodexo@test.com
  - [ ] ÖMC user: omc@test.com
  - [ ] Payroll user: payroll@test.com
  - [ ] Toplux user: toplux@test.com
  - [ ] Inactive user: inactive@test.com (for deactivation testing)
- [ ] **Test Data Prepared**: Sample custom columns created for each external party
- [ ] **Browser**: Latest version of Chrome, Firefox, or Edge
- [ ] **Network**: Stable internet connection
- [ ] **Tools**: Browser DevTools open (Network tab for latency measurement)

### Test Data

**Employee Records:**
- Minimum: 100 employees
- Recommended: 500-1,000 employees (for performance testing)
- Include: Archived employees, terminated employees

**Custom Columns:**
- Sodexo: 2-3 custom columns (e.g., "Team Assignment", "Warehouse Location")
- ÖMC: 2-3 custom columns (e.g., "Cost Center", "Project Code")
- Payroll: 2-3 custom columns (e.g., "Salary Grade", "Tax Code")
- Toplux: 2-3 custom columns (e.g., "Equipment Assigned", "Access Level")

**Column Permissions:**
- Mixed visibility: Some columns visible to multiple roles, some to single role
- Test both "view only" and "view + edit" permissions

---

## Test Execution Instructions

### How to Use This Checklist

1. **Mark Results**: Use  for PASS,  for FAIL,  for PARTIAL
2. **Add Notes**: Record observations, errors, or issues in Notes column
3. **Take Screenshots**: Capture failures for bug reports
4. **Record Timestamps**: Note start/end time for each test case
5. **Re-Test Failures**: After fixes, re-run failed tests and update results

### Pass/Fail Criteria

- **PASS ()**: Test case executed successfully, meets expected result
- **FAIL ()**: Test case failed, does not meet expected result
- **PARTIAL ()**: Test case partially works, has minor issues but core functionality intact
- **BLOCKED ()**: Cannot execute test due to blocking issue from previous test

---

## Test Cases

### 1. Authentication Tests

| ID | Test Case | Steps | Expected Result | Result | Notes |
|----|-----------|-------|-----------------|--------|-------|
| AUTH-001 | Login with HR Admin credentials (valid) | 1. Navigate to /login<br>2. Enter hradmin@test.com<br>3. Enter correct password<br>4. Click "Sign In" | - Redirect to /dashboard<br>- User logged in<br>- Session cookie set | [ ] | |
| AUTH-002 | Login with External Party credentials (Sodexo) | 1. Navigate to /login<br>2. Enter sodexo@test.com<br>3. Enter correct password<br>4. Click "Sign In" | - Redirect to /dashboard<br>- User logged in<br>- Limited columns visible | [ ] | |
| AUTH-003 | Login with invalid credentials | 1. Navigate to /login<br>2. Enter any@email.com<br>3. Enter wrong password<br>4. Click "Sign In" | - Error message displayed: "Invalid email or password"<br>- User remains on login page<br>- No redirect | [ ] | |
| AUTH-004 | Login with deactivated account | 1. Navigate to /login<br>2. Enter inactive@test.com<br>3. Enter correct password<br>4. Click "Sign In" | - Error message: "Account is deactivated"<br>- User cannot log in<br>- Redirect to login page | [ ] | |
| AUTH-005 | Session timeout after 8 hours | 1. Login successfully<br>2. Leave browser idle for 8+ hours (or manipulate session cookie expiry)<br>3. Try to navigate to any page | - Automatic logout<br>- Redirect to /login<br>- Session cookie cleared | [ ] | |
| AUTH-006 | Logout functionality | 1. Login as any user<br>2. Click profile menu (top right)<br>3. Click "Log Out" | - Redirect to /login or home page<br>- Session cookie cleared<br>- Cannot access /dashboard without re-login | [ ] | |

---

### 2. HR CRUD Operations Tests

| ID | Test Case | Steps | Expected Result | Result | Notes |
|----|-----------|-------|-----------------|--------|-------|
| HR-001 | Create new employee with all required fields | 1. Login as HR Admin<br>2. Navigate to /dashboard<br>3. Click "+ Add Employee"<br>4. Fill required fields (First Name, Last Name, Email, SSN, Hire Date)<br>5. Click "Create Employee" | - Success message displayed<br>- New employee appears in table<br>- Real-time sync: External parties see new employee within 2 seconds | [ ] | |
| HR-002 | Create employee with missing required field | 1. Login as HR Admin<br>2. Click "+ Add Employee"<br>3. Fill some fields, leave "Email" blank<br>4. Click "Create Employee" | - Validation error: "Email is required"<br>- Employee not created<br>- Modal remains open | [ ] | |
| HR-003 | Create employee with duplicate email | 1. Login as HR Admin<br>2. Click "+ Add Employee"<br>3. Fill all fields with email of existing employee<br>4. Click "Create Employee" | - Error message: "Email already exists"<br>- Employee not created | [ ] | |
| HR-004 | Edit employee masterdata (inline) | 1. Login as HR Admin<br>2. Navigate to employee table<br>3. Click on editable cell (e.g., "First Name")<br>4. Edit value<br>5. Press Enter | - Cell updates immediately<br>- Changes saved to database<br>- External parties see updated value within 2 seconds | [ ] | |
| HR-005 | Edit employee via dialog | 1. Login as HR Admin<br>2. Select employee row<br>3. Click "Edit" button<br>4. Update multiple fields<br>5. Click "Save Changes" | - Success message displayed<br>- Employee data updated<br>- Changes reflected in table | [ ] | |
| HR-006 | Archive employee | 1. Login as HR Admin<br>2. Select employee row<br>3. Click "Archive" button<br>4. Confirm archival | - Employee removed from default table view<br>- External parties can no longer see employee<br>- Database: is_archived = true | [ ] | |
| HR-007 | Unarchive employee | 1. Login as HR Admin<br>2. Enable "Show Archived" filter<br>3. Select archived employee<br>4. Click "Unarchive" button | - Employee returns to active status<br>- Visible in default table view<br>- External parties can see employee again | [ ] | |
| HR-008 | Search employees by name | 1. Login as HR Admin<br>2. Enter employee name in search box<br>3. Observe results | - Table filters to matching employees<br>- Search is case-insensitive<br>- Partial matches work (e.g., "john" matches "Johnson") | [ ] | |
| HR-009 | Filter employees by department | 1. Login as HR Admin<br>2. Click filter icon on "Department" column<br>3. Select specific department<br>4. Apply filter | - Table shows only employees in selected department<br>- Filter indicator displayed | [ ] | |
| HR-010 | Sort employees by hire date | 1. Login as HR Admin<br>2. Click "Hire Date" column header | - Table sorts by hire date ascending<br>- Click again: sorts descending | [ ] | |

---

### 3. Column Permissions Tests

| ID | Test Case | Steps | Expected Result | Result | Notes |
|----|-----------|-------|-----------------|--------|-------|
| PERM-001 | HR Admin can see all columns | 1. Login as HR Admin<br>2. Navigate to /dashboard<br>3. Observe table columns | - All masterdata columns visible<br>- All custom columns from all parties visible<br>- SSN column visible | [ ] | |
| PERM-002 | External party sees only permitted columns | 1. Login as Sodexo user<br>2. Navigate to /dashboard<br>3. Observe table columns | - Permitted masterdata columns visible (e.g., First Name, Last Name, Email)<br>- SSN column hidden<br>- Only Sodexo custom columns visible<br>- Other parties' custom columns hidden | [ ] | |
| PERM-003 | HR Admin modifies column permissions | 1. Login as HR Admin<br>2. Navigate to /admin/columns<br>3. Find custom column<br>4. Check "View" permission for ÖMC role<br>5. Save (auto-save) | - Permission updated in database<br>- ÖMC users now see the column (test by logging in as ÖMC) | [ ] | |
| PERM-004 | Permission changes take effect immediately | 1. Have ÖMC user logged in with /dashboard open<br>2. HR Admin grants "View" permission for new column<br>3. ÖMC user refreshes page or waits 2 seconds | - New column appears in ÖMC user's table view within 2 seconds (real-time sync) | [ ] | |
| PERM-005 | Masterdata columns cannot be deleted | 1. Login as HR Admin<br>2. Navigate to /admin/columns<br>3. Try to delete "First Name" column | - Delete button disabled or hidden for masterdata columns<br>- Error message if attempted | [ ] | |
| PERM-006 | External party cannot edit other party's columns | 1. Login as Sodexo user<br>2. Navigate to /dashboard<br>3. Try to edit ÖMC custom column (if visible) | - Cell is read-only<br>- No edit allowed<br>- Or column is completely hidden | [ ] | |

---

### 4. Real-Time Sync Tests

| ID | Test Case | Steps | Expected Result | Result | Notes |
|----|-----------|-------|-----------------|--------|-------|
| SYNC-001 | HR creates employee  visible to external parties | 1. Open two browsers:<br>   - Browser A: HR Admin logged in<br>   - Browser B: Sodexo logged in<br>2. HR Admin creates new employee<br>3. Observe Browser B (Sodexo view) | - New employee appears in Sodexo view within 2 seconds<br>- No manual refresh required | [ ] | Measure latency with DevTools Network tab |
| SYNC-002 | HR edits employee  changes propagate | 1. Two browsers: HR Admin and Sodexo<br>2. HR Admin edits employee first name<br>3. Observe Sodexo view | - Updated first name appears in Sodexo view within 2 seconds | [ ] | |
| SYNC-003 | Multiple concurrent users see consistent data | 1. Three browsers: HR Admin, Sodexo, ÖMC (all viewing same employee)<br>2. HR Admin edits employee department<br>3. Observe all views | - All three users see updated department within 2 seconds<br>- No stale data | [ ] | |
| SYNC-004 | External party edits custom column  HR sees update | 1. Two browsers: HR Admin and Sodexo<br>2. Sodexo edits "Team Assignment" custom column<br>3. Observe HR Admin view | - HR Admin sees updated value within 2 seconds | [ ] | |
| SYNC-005 | Column permission change syncs to affected users | 1. Two browsers: HR Admin and Sodexo<br>2. HR Admin hides column from Sodexo role<br>3. Observe Sodexo view | - Column disappears from Sodexo view within 2 seconds | [ ] | |

---

### 5. Role Preview Tests

| ID | Test Case | Steps | Expected Result | Result | Notes |
|----|-----------|-------|-----------------|--------|-------|
| PREVIEW-001 | HR Admin can activate "View As" mode | 1. Login as HR Admin<br>2. Click profile menu<br>3. Select "View As" > "Sodexo" | - Banner appears at top: "Viewing as Sodexo"<br>- Interface changes to Sodexo view<br>- Only Sodexo-permitted columns visible | [ ] | |
| PREVIEW-002 | Preview mode displays exactly what role sees | 1. Activate "View As Sodexo"<br>2. Compare columns to actual Sodexo user login | - Exact same columns visible<br>- Same permissions applied<br>- No admin-only features visible | [ ] | |
| PREVIEW-003 | Admin panel inaccessible in non-admin preview | 1. Activate "View As Sodexo"<br>2. Try to navigate to /admin/users | - Access denied or 403 error<br>- Cannot access admin routes | [ ] | |
| PREVIEW-004 | Exit preview returns to HR Admin view | 1. Activate "View As Sodexo"<br>2. Click banner or profile menu<br>3. Select "Exit Preview Mode" | - Banner disappears<br>- Full HR Admin view restored<br>- All columns visible<br>- Admin panel accessible | [ ] | |
| PREVIEW-005 | Preview mode read-only (no data changes) | 1. Activate "View As Sodexo"<br>2. Try to edit employee data or custom columns | - Changes do not save (or edit blocked entirely)<br>- Exit preview: No changes made to database | [ ] | |

---

### 6. User Management Tests

| ID | Test Case | Steps | Expected Result | Result | Notes |
|----|-----------|-------|-----------------|--------|-------|
| USER-001 | HR Admin can create new user account | 1. Login as HR Admin<br>2. Navigate to /admin/users<br>3. Click "+ Add User"<br>4. Fill email, password, role (e.g., "omc")<br>5. Click "Create User" | - Success message displayed<br>- New user appears in users table<br>- Can login with provided credentials | [ ] | |
| USER-002 | Created user can login successfully | 1. Use credentials from USER-001<br>2. Navigate to /login<br>3. Enter email and password<br>4. Click "Sign In" | - Successful login<br>- Redirect to /dashboard<br>- User sees appropriate columns for their role | [ ] | |
| USER-003 | HR Admin can deactivate user | 1. Login as HR Admin<br>2. Navigate to /admin/users<br>3. Select user<br>4. Click "Deactivate" or toggle is_active to false | - User status changes to "Inactive"<br>- User cannot login (test: LOGIN attempt shows "Account deactivated" error) | [ ] | |
| USER-004 | Deactivated user cannot login | 1. Try to login with deactivated user credentials | - Error message: "Account is deactivated"<br>- Login denied | [ ] | |
| USER-005 | HR Admin can activate deactivated user | 1. Login as HR Admin<br>2. Navigate to /admin/users<br>3. Filter/find deactivated user<br>4. Click "Activate" or toggle is_active to true | - User status changes to "Active"<br>- User can now login successfully | [ ] | |
| USER-006 | HR Admin cannot deactivate own account | 1. Login as HR Admin<br>2. Navigate to /admin/users<br>3. Try to deactivate own user account | - Deactivate button disabled for own account<br>- Or error message: "Cannot deactivate own account" | [ ] | |

---

### 7. Custom Columns Tests

| ID | Test Case | Steps | Expected Result | Result | Notes |
|----|-----------|-------|-----------------|--------|-------|
| COL-001 | External party can create custom column | 1. Login as Sodexo<br>2. Navigate to /dashboard<br>3. Click "Manage Columns" or similar<br>4. Click "+ Add Custom Column"<br>5. Fill column name, type, category<br>6. Click "Create" | - Success message<br>- New column appears in table (rightmost position)<br>- Only Sodexo can edit values<br>- HR Admin can view column | [ ] | |
| COL-002 | External party can edit custom column data | 1. Login as Sodexo<br>2. Find employee row<br>3. Click on cell in Sodexo custom column<br>4. Enter value<br>5. Press Enter | - Value saves immediately<br>- HR Admin sees value (test by logging in as HR Admin) | [ ] | |
| COL-003 | HR Admin can delete custom column | 1. Login as HR Admin<br>2. Navigate to /admin/columns<br>3. Find Sodexo custom column<br>4. Click delete icon<br>5. Confirm deletion | - Column removed from column_config table<br>- Column disappears from all employee views<br>- Data deleted from sodexo_data table | [ ] | |
| COL-004 | Hide column functionality works | 1. Login as HR Admin<br>2. Navigate to /admin/columns<br>3. Find custom column<br>4. Uncheck all role permissions<br>5. Save | - Column becomes invisible to all external parties<br>- HR Admin can still see it<br>- Data preserved in database | [ ] | |
| COL-005 | Unhide column restores visibility | 1. Login as HR Admin<br>2. Navigate to /admin/columns<br>3. Find hidden column<br>4. Check "View" permission for Sodexo<br>5. Save | - Column becomes visible to Sodexo users<br>- Previous data restored and visible | [ ] | |

---

## Summary

### Test Execution Summary

| Category | Total Tests | Passed | Failed | Partial | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| Authentication | 6 | [ ] | [ ] | [ ] | _% |
| HR CRUD Operations | 10 | [ ] | [ ] | [ ] | _% |
| Column Permissions | 6 | [ ] | [ ] | [ ] | _% |
| Real-Time Sync | 5 | [ ] | [ ] | [ ] | _% |
| Role Preview | 5 | [ ] | [ ] | [ ] | _% |
| User Management | 6 | [ ] | [ ] | [ ] | _% |
| Custom Columns | 5 | [ ] | [ ] | [ ] | _% |
| **TOTAL** | **43** | **[ ]** | **[ ]** | **[ ]** | **_%** |

### Acceptance Criteria

- [ ] **All tests executed**: 43/43 test cases run
- [ ] **Pass rate  95%**: At least 41/43 tests must pass (max 2 failures allowed)
- [ ] **Zero critical failures**: No blocking issues that prevent core functionality
- [ ] **Issues documented**: All failures logged as GitHub issues
- [ ] **Re-tests passed**: Failed tests re-run after fixes and pass

### Critical Failures (Must Fix Before MVP)

| ID | Test Case | Issue | Severity | GitHub Issue |
|----|-----------|-------|----------|--------------|
| | | | | |

### Non-Critical Issues (Post-MVP)

| ID | Test Case | Issue | Severity | Notes |
|----|-----------|-------|----------|-------|
| | | | | |

---

## Test Execution Log

### Test Session 1

- **Date:** _________________
- **Tester:** _________________
- **Environment:** _________________
- **Browser:** _________________
- **Start Time:** _________________
- **End Time:** _________________
- **Duration:** _________________

**Results:**
- Passed: ____ / 43
- Failed: ____ / 43
- Partial: ____ / 43
- Blocked: ____ / 43

**Notes:**


---

### Test Session 2 (Re-Test After Fixes)

- **Date:** _________________
- **Tester:** _________________
- **Environment:** _________________
- **Browser:** _________________
- **Start Time:** _________________
- **End Time:** _________________
- **Duration:** _________________

**Results:**
- Passed: ____ / 43
- Failed: ____ / 43
- Partial: ____ / 43
- Blocked: ____ / 43

**Notes:**


---

**Document Version:** 1.0  
**Last Updated:** October 29, 2025  
**Next Review:** After first test execution
