# HR Masterdata Management System - User Guide

**Version:** 1.0  
**Last Updated:** October 29, 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [HR Admin Workflows](#hr-admin-workflows)
3. [External Party Workflows](#external-party-workflows)
4. [FAQ](#faq)
5. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Application

1. **Open your web browser** (Chrome, Firefox, Edge, or Safari recommended)
2. **Navigate to the application URL**: [Your Production URL]
3. **Bookmark the page** for easy access

### Logging In

1. On the login page, enter your **email address** and **password**
2. Click **Sign In**
3. If successful, you'll be redirected to the **Dashboard**

**First-Time Login:**
- Your HR administrator will provide your login credentials
- You'll receive an email with your username (email address)
- Your initial password will be provided separately (change it after first login)

**Session Timeout:**
- Sessions expire after **8 hours of inactivity**
- You'll be automatically logged out and redirected to the login page
- Simply log in again to continue working

### Navigation Overview

**Dashboard (All Users):**
- **Employee Table**: Main view showing employee data with search and filters
- **Important Dates**: Calendar view of birthdays, anniversaries, and milestones

**Admin Panel (HR Admin Only):**
- **User Management**: Create and manage user accounts
- **Column Settings**: Configure column permissions for each role

**User Menu (Top Right):**
- View your **profile information**
- **Log out** of the application

---

## HR Admin Workflows

As an HR Administrator, you have full system access to manage employees, users, and system configuration.

### Creating a New Employee

#### Step-by-Step Instructions

1. **Navigate to Dashboard**
   - Click **Dashboard** in the navigation menu
   - You'll see the employee table

2. **Open Create Employee Dialog**
   - Click the **"+ Add Employee"** button (top right of table)
   - A dialog will appear with an employee form

3. **Fill in Employee Information**
   
   **Required Fields:**
   - **First Name**: Employee's first name
   - **Last Name**: Employee's last name
   - **Email**: Employee's work email address (must be unique)
   - **SSN**: Social Security Number (must be unique)
   - **Hire Date**: Employee's start date (use date picker)
   
   **Optional Fields:**
   - **Preferred Name**: Nickname or preferred name
   - **Phone**: Employee's phone number
   - **Department**: Employee's department
   - **Position**: Job title
   - **Manager**: Select from existing employees
   - **Employment Type**: Full-time, Part-time, Contractor, Intern
   - **Work Location**: Office, Remote, Hybrid

4. **Save the Employee**
   - Click **"Create Employee"** button
   - If successful, the dialog closes and the new employee appears in the table
   - All external parties will see the new employee within **2 seconds** (real-time sync)

5. **Handle Validation Errors**
   - If any required fields are missing, you'll see error messages below the fields
   - Fix errors and try again

**Tips:**
- Email addresses must be unique across all employees
- SSN must be exactly 9 digits (formatted as XXX-XX-XXXX)
- Hire date cannot be in the future

### Editing Employee Data

#### Inline Editing (Quick Updates)

1. **Find the employee** in the table (use search if needed)
2. **Click on any editable cell** (masterdata columns only)
3. **Edit the value** directly in the table
4. **Press Enter** or **click outside the cell** to save
5. Changes are saved automatically and sync to all users in real-time

**Editable Masterdata Columns:**
- First Name, Last Name, Preferred Name
- Email, Phone
- Department, Position, Manager
- Employment Type, Work Location
- Hire Date

**Read-Only Columns (Cannot Edit Inline):**
- SSN (security restriction - must use Edit Employee dialog)
- Custom columns created by external parties (only they can edit)

#### Edit Employee Dialog (Full Update)

1. **Find the employee** in the table
2. **Click the row** to select it
3. **Click the "Edit" button** (pencil icon) or **right-click > Edit Employee**
4. **Update fields** in the dialog
5. **Click "Save Changes"**

**When to Use Dialog vs Inline Editing:**
- Use **inline editing** for quick single-field updates
- Use **dialog** for updating multiple fields or changing SSN

### Archiving an Employee

Archiving (soft delete) removes employees from the main table view while preserving all data for historical records.

#### Step-by-Step Instructions

1. **Find the employee** to archive
2. **Click the row** to select it
3. **Click the "Archive" button** (archive icon) or **right-click > Archive Employee**
4. **Confirm archiving** in the dialog
5. Employee is removed from the table and marked as archived

**What Happens When You Archive:**
- Employee disappears from main table view
- Data is preserved in the database (soft delete)
- External parties can no longer see the employee
- You can unarchive later if needed

#### Viewing Archived Employees

1. **Click the filter dropdown** (top of table)
2. **Select "Show Archived Employees"**
3. Archived employees appear with a visual indicator (grayed out or "Archived" badge)

#### Unarchiving an Employee

1. **Enable "Show Archived Employees"** filter
2. **Find the archived employee**
3. **Click the row** to select it
4. **Click "Unarchive" button** or **right-click > Unarchive Employee**
5. Employee returns to active status and becomes visible to external parties

**Best Practices:**
- Archive employees who have left the company
- Do NOT delete employees permanently (preserve historical data)
- Use termination date field to track when employee left

### Searching and Filtering Employees

#### Search Bar

1. **Click the search box** (top left of table)
2. **Type keywords**: name, email, department, or any visible field
3. Table filters automatically as you type
4. **Clear search** to reset view

**Search Tips:**
- Search matches any visible column
- Search is case-insensitive
- Use partial words (e.g., "john" matches "Johnson")

#### Column Filters

1. **Click the filter icon** in any column header
2. **Select filter criteria**:
   - Text columns: Contains, Starts with, Ends with, Equals
   - Date columns: Before, After, Between
   - Dropdown columns: Select specific values
3. **Apply filter** - table updates immediately
4. **Clear filters** by clicking "Clear All Filters" button

#### Sorting

1. **Click any column header** to sort ascending
2. **Click again** to sort descending
3. **Shift+Click** to sort by multiple columns

### Managing User Accounts

Access: **Admin Panel > Users**

#### Creating a New User

1. **Navigate to Admin Panel > Users**
2. **Click "+ Add User" button**
3. **Fill in user information**:
   - **Email**: User's email address (will be their username)
   - **Password**: Temporary password (user should change after first login)
   - **Full Name**: User's full name
   - **Role**: Select from HR Admin, Sodexo, ÖMC, Payroll, Toplux
4. **Click "Create User"**
5. **Provide credentials** to the new user (email and temporary password)

**User Role Permissions:**

| Role     | Can See                 | Can Edit             | Admin Access |
| -------- | ----------------------- | -------------------- | ------------ |
| HR Admin | All columns and data    | All masterdata       | Yes          |
| Sodexo   | Permitted columns only  | Sodexo custom only   | No           |
| ÖMC      | Permitted columns only  | ÖMC custom only      | No           |
| Payroll  | Permitted columns only  | Payroll custom only  | No           |
| Toplux   | Permitted columns only  | Toplux custom only   | No           |

#### Deactivating a User

1. **Find the user** in the users table
2. **Click the user row** to select
3. **Click "Deactivate" button** or toggle status to "Inactive"
4. **Confirm deactivation**

**What Happens When You Deactivate:**
- User cannot log in
- Active sessions are terminated on next page load
- User data is preserved
- You can reactivate later

**Security Note:**
- You cannot deactivate your own account (prevents lockout)
- At least one HR Admin must remain active

#### Activating a User

1. **Find the deactivated user** (filter by "Inactive" status)
2. **Click the user row**
3. **Click "Activate" button** or toggle status to "Active"
4. User can now log in

### Configuring Column Permissions

Access: **Admin Panel > Column Settings**

Column permissions control which columns each external party role can see. Masterdata columns are always visible to all roles (controlled by system).

#### Permission Matrix Interface

The Column Settings page displays a **permission matrix**:

- **Rows**: Each column in the system
- **Columns**: Each user role (Sodexo, ÖMC, Payroll, Toplux)
- **Checkboxes**: Check to grant permission, uncheck to deny

#### Granting Column Permissions

1. **Navigate to Admin Panel > Column Settings**
2. **Find the column** you want to configure
3. **Check the box** for each role that should see this column
4. Changes **save automatically**
5. Permission changes take effect **immediately** (users see changes within 2 seconds)

**Example:**
- "Sodexo Meal Budget" column should only be visible to Sodexo users
- Check the "Sodexo" column box for this row
- Uncheck all other role boxes

#### Understanding Column Types

**Masterdata Columns (System-Managed):**
- Always visible to all roles
- Cannot be hidden or deleted
- Only HR Admin can edit values
- Examples: First Name, Last Name, Email, SSN, Hire Date

**Custom Columns (Party-Created):**
- Created by external parties for their own data tracking
- Visibility configured via permission matrix
- Only the creating party can edit values (HR can view)
- Can be deleted by HR Admin if no longer needed

#### Best Practices

- **Principle of Least Privilege**: Only grant access to columns a role needs
- **Regular Review**: Quarterly review permissions for accuracy
- **Test with Role Preview**: Use "View As" mode to verify configuration
- **Document Decisions**: Note why certain permissions were granted

### Using "View As" Role Preview Mode

The Role Preview feature lets you see exactly what each external party sees when they log in. This is critical for verifying column permissions.

#### Activating Role Preview

1. **Navigate to any page** (Dashboard or Admin Panel)
2. **Click your profile menu** (top right)
3. **Select "View As"** from dropdown
4. **Choose a role** to preview (Sodexo, ÖMC, Payroll, Toplux)

**What Happens:**
- A **banner appears at the top** indicating you're in preview mode
- The interface changes to show exactly what that role sees
- Hidden columns disappear
- Admin panel becomes inaccessible (if previewing non-admin role)
- You can navigate and interact as if you were that role (read-only, no data changes saved)

#### Using Role Preview Effectively

**Verification Workflow:**
1. **Make permission changes** in Column Settings
2. **Activate "View As Sodexo"** mode
3. **Check employee table** - verify only permitted columns visible
4. **Exit preview** and repeat for other roles
5. **Document configuration** once verified

#### Exiting Role Preview

1. **Click the banner** at the top of the page
2. **Select "Exit Preview Mode"** or **click your profile menu > Exit View As**
3. You return to full HR Admin view

**Important:**
- Changes made in preview mode are **read-only** and don't save
- You can still navigate and test functionality
- Banner remains visible at all times to avoid confusion

### Deleting/Hiding Custom Columns

Access: **Admin Panel > Column Settings**

HR Admins can delete custom columns created by external parties when they're no longer needed.

#### Deleting a Custom Column (Permanent)

1. **Navigate to Admin Panel > Column Settings**
2. **Find the custom column** to delete (filter by "Custom Columns")
3. **Click the delete icon** (trash can) for that row
4. **Confirm deletion** in the dialog

**Confirmation Dialog:**
`
Delete Column: "Sodexo Meal Budget"?

This will permanently delete this column and all data stored in it 
across all employees. This action cannot be undone.

Affected employees: 247
Data will be deleted from: sodexo_data table

[Cancel] [Delete Permanently]
`

5. **Click "Delete Permanently"**

**What Happens:**
- Column is removed from the column_config table
- All data in that column (across all employees) is permanently deleted
- External party can no longer see or edit the column
- Change is immediate (real-time sync)

**Warning:**
- Deletion is **permanent and irreversible**
- All employee data for that column is lost
- Consider hiding instead of deleting if you might need the data later

#### Hiding a Custom Column (Temporary)

If you want to temporarily hide a column without deleting data:

1. **Navigate to Admin Panel > Column Settings**
2. **Find the custom column**
3. **Uncheck all role permissions** for that column
4. Column becomes invisible to all external parties (but data is preserved)

**When to Hide vs Delete:**
- **Hide**: Seasonal data (e.g., "Summer Shift Preference" - hide in winter, unhide in summer)
- **Hide**: Temporarily sensitive data
- **Delete**: Obsolete data no longer needed
- **Delete**: Incorrectly created columns

---

## External Party Workflows

As an external party user (Sodexo, ÖMC, Payroll, Toplux), you have read-only access to employee masterdata and full control over your party's custom columns.

### Viewing Employee Data

#### Understanding the Dashboard

When you log in, you see the **Employee Table Dashboard** with the following:

- **Masterdata Columns** (Read-Only): Core employee information managed by HR
  - First Name, Last Name, Email, Phone
  - Hire Date, Department, Position
  - Employment Type, Work Location
  - You can **view** these columns but **cannot edit** them

- **Your Custom Columns** (Editable): Columns your party has created
  - Specific to your organization's needs
  - You can **view and edit** values
  - Examples: "Meal Preference", "Shift Schedule", "Cost Center"

- **Hidden Columns**: Columns you don't have permission to see
  - These are invisible to you (controlled by HR)
  - Other parties' custom columns are typically hidden

#### Navigating the Employee List

**Search Employees:**
1. Click the **search box** (top left)
2. Type employee name, email, or any visible field
3. Results filter automatically

**Sort Employees:**
1. Click any **column header** to sort
2. Click again to reverse sort order

**Filter Employees:**
1. Click **filter icon** in column header
2. Set filter criteria
3. Click **Apply**

### Editing Custom Column Values

You can edit data in custom columns your party created.

#### Inline Editing

1. **Find the employee** in the table
2. **Click on the cell** in your custom column
3. **Type the new value**
4. **Press Enter** or **click outside cell** to save
5. Changes save automatically and sync to HR view in real-time

**Supported Data Types:**
- **Text**: Free-form text entry
- **Number**: Numeric values only
- **Date**: Date picker appears
- **Dropdown**: Select from predefined options
- **Yes/No**: Checkbox toggle

**Validation:**
- Required fields show error if left blank
- Data type constraints enforced (e.g., number fields reject text)
- Invalid entries show error message below cell

#### Editing Multiple Employees

1. **Select multiple rows** (Shift+Click or Ctrl+Click)
2. **Right-click** selected rows
3. **Choose "Bulk Edit Custom Columns"**
4. **Update values** for selected employees
5. **Click "Save"**

**Use Case:**
- Update "Shift Schedule" for all employees in a department
- Set "Meal Plan" for a group of new hires

### Creating New Custom Columns

External parties can create custom columns to track data specific to their needs.

#### Step-by-Step Instructions

1. **Navigate to Dashboard**
2. **Click the "Manage Columns" button** (gear icon near search)
3. **Click "+ Add Custom Column"**
4. **Fill in column configuration**:
   
   **Required Fields:**
   - **Column Name**: Descriptive name (e.g., "Meal Plan Type")
   - **Data Type**: Select from Text, Number, Date, Dropdown, Yes/No
   - **Category**: Organize column (e.g., "Benefits", "Scheduling")
   
   **Optional Fields:**
   - **Description**: Help text explaining the column's purpose
   - **Default Value**: Value for new employees
   - **Required**: Check if this field must be filled for all employees
   - **Dropdown Options**: If data type is Dropdown, define the allowed values

5. **Click "Create Column"**

**What Happens:**
- New column appears in the employee table (rightmost position)
- Column is empty for all existing employees
- Only your party can edit values (HR can view)
- HR Admin can see the column and configure permissions

**Example: Creating a "Meal Plan" Column**
`
Column Name: Meal Plan Type
Data Type: Dropdown
Category: Sodexo Benefits
Description: Employee's selected meal plan
Required: Yes
Dropdown Options:
  - Basic
  - Premium
  - Vegetarian
  - None
`

#### Column Naming Best Practices

- **Be Descriptive**: "Shift Preference" not "SP"
- **Include Party Name**: "Sodexo Meal Budget" not just "Meal Budget"
- **Avoid Abbreviations**: "ÖMC Cost Center" not "OMC CC"
- **Use Title Case**: "Employee Meal Plan" not "employee meal plan"

### Organizing Columns into Categories

Categories help organize custom columns for easier navigation.

#### Creating a Category

1. **Open "Manage Columns" dialog**
2. **Click "Manage Categories"**
3. **Click "+ Add Category"**
4. **Enter category name** (e.g., "Benefits", "Scheduling", "Payroll Data")
5. **Click "Save"**

#### Assigning Columns to Categories

1. **Edit existing column** (click edit icon)
2. **Select category** from dropdown
3. **Save changes**

**Benefits of Categories:**
- Group related columns together
- Easier to find columns in large tables
- Visual organization in table view (columns grouped by category)

### Searching and Filtering

#### Quick Search

1. **Click search box** (top left)
2. **Type keywords**: name, email, or any visible column data
3. Results filter in real-time
4. **Clear search** to reset

#### Advanced Filtering

1. **Click filter icon** in column header
2. **Select filter type**:
   - **Text**: Contains, Equals, Starts with, Ends with
   - **Number**: Equals, Greater than, Less than, Between
   - **Date**: Before, After, Between, Is Blank
   - **Dropdown**: Select specific values
3. **Apply filter**
4. **Combine multiple filters** (filters across columns are AND logic)

**Example Filter Scenario:**
- Show only employees in "Sales" department
- With "Premium" meal plan
- Hired after January 1, 2024

**Filter Steps:**
1. Filter "Department" = "Sales"
2. Filter "Meal Plan Type" = "Premium"
3. Filter "Hire Date" > "2024-01-01"
4. Results show matching employees

#### Clearing Filters

1. **Click "Clear All Filters" button** (top right)
2. All filters reset and full employee list displays

---

## FAQ

### General Questions

**Q: What browsers are supported?**  
**A:** Chrome (latest 2 versions), Firefox (latest 2 versions), Edge (latest 2 versions), Safari (latest 2 versions). For best experience, use Chrome or Edge.

**Q: Can I use the application on my phone?**  
**A:** Yes, the interface is mobile-responsive. However, for extensive data entry, we recommend using a desktop or tablet for the spreadsheet-like table interface.

**Q: How long do sessions last?**  
**A:** Sessions expire after 8 hours of inactivity. You'll be automatically logged out and need to log in again.

**Q: Can I change my password?**  
**A:** Yes, click your profile menu (top right) > "Change Password". Current implementation requires HR Admin to reset passwords on your behalf - contact HR if you forgot your password.

**Q: How do I log out?**  
**A:** Click your profile menu (top right) > "Log Out". Always log out when finished, especially on shared computers.

### HR Admin Questions

**Q: Can I bulk import employees from our existing Excel file?**  
**A:** Yes, use the "Import CSV" button on the Dashboard. Ensure your CSV matches the required format (template downloadable from the import dialog).

**Q: What happens if I accidentally archive an employee?**  
**A:** No problem! Archiving is a soft delete. Enable "Show Archived" filter, find the employee, and click "Unarchive" to restore them.

**Q: Can I export employee data to Excel?**  
**A:** Yes, click "Export to CSV" button on the Dashboard. This exports all visible columns (respecting your current filters) to a CSV file you can open in Excel.

**Q: How do I know which columns are custom vs masterdata?**  
**A:** In the Column Settings admin panel, custom columns are labeled with the party name (e.g., "Sodexo Meal Budget"). Masterdata columns are system-managed and cannot be deleted.

**Q: Can I rename a column?**  
**A:** Yes, in Admin Panel > Column Settings, click the edit icon for the column and change the "Display Name" field.

**Q: What if an external party creates too many unnecessary columns?**  
**A:** You can delete custom columns in Admin Panel > Column Settings. Confirm with the party first, as deletion is permanent.

### External Party Questions

**Q: Why can't I edit employee names or hire dates?**  
**A:** Those are masterdata columns managed by HR. You can only edit columns your party created. If you need masterdata updated, contact HR.

**Q: Why don't I see all columns that HR mentioned?**  
**A:** HR controls column visibility via permissions. If you should see a column but don't, ask HR to check your role's permissions in Column Settings.

**Q: Can I delete a custom column I created by mistake?**  
**A:** You cannot delete columns directly. Contact your HR Admin to delete it via the Admin Panel. Alternatively, you can stop using it and HR can hide it.

**Q: How quickly do my changes sync to HR's view?**  
**A:** Within 2 seconds! The system uses real-time synchronization via WebSockets. HR sees your edits almost instantly.

**Q: Can I create columns for specific employees only?**  
**A:** No, custom columns apply to all employees. If you need conditional fields, use a dropdown with "N/A" or "Not Applicable" option.

**Q: What if I need a column type that doesn't exist (e.g., multi-select)?**  
**A:** Current MVP supports Text, Number, Date, Dropdown, and Yes/No. For multi-select, use multiple Yes/No columns or a Text field with comma-separated values. Contact your HR Admin to request new column types in future updates.

---

## Troubleshooting

### Login Issues

**Problem: "Invalid email or password" error**

**Solutions:**
1. **Check Caps Lock**: Passwords are case-sensitive
2. **Verify Email**: Ensure you're using the email address HR provided
3. **Copy-Paste Password**: Avoid typos by pasting the password HR sent you
4. **Contact HR**: If you forgot your password, HR Admin must reset it

**Problem: "Account is deactivated" error**

**Solutions:**
1. **Contact HR**: Your account may have been deactivated
2. **Verify Employment Status**: Accounts are deactivated when employees leave the company

**Problem: Session expired / Automatically logged out**

**Solutions:**
1. **Log in again**: Sessions expire after 8 hours of inactivity
2. **Stay Active**: If working on large edits, save frequently and refresh session by navigating between pages

### Permission Errors

**Problem: "403 Forbidden - Insufficient Permissions" when accessing Admin Panel**

**Solutions:**
1. **Verify Your Role**: Only HR Admin can access Admin Panel
2. **Contact HR**: If you believe you should have admin access, ask HR to check your user role

**Problem: Cannot see columns that should be visible**

**Solutions:**
1. **Check Column Permissions**: Ask HR to verify your role has permission in Column Settings
2. **Refresh Page**: Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) to hard refresh
3. **Clear Browser Cache**: Settings > Privacy > Clear Browsing Data > Cached Images and Files

**Problem: Cannot edit a column (read-only)**

**Solutions:**
1. **Masterdata Columns**: These are read-only for external parties - only HR can edit
2. **Other Party's Columns**: You can only edit custom columns your party created
3. **Permission Issue**: Contact HR to verify you have edit permission for that column

### Real-Time Sync Issues

**Problem: Changes by HR don't appear immediately**

**Solutions:**
1. **Wait 2 Seconds**: Real-time sync has a small delay (should be <2 seconds)
2. **Check Internet Connection**: Poor connection can delay WebSocket updates
3. **Refresh Page**: If sync fails, manual refresh (F5) will fetch latest data
4. **Clear Cache**: Ctrl+F5 hard refresh to bypass cache

**Problem: "Connection lost" notification appears**

**Solutions:**
1. **Check Internet**: Verify you're online
2. **Reconnect**: The app will automatically attempt to reconnect
3. **Manual Reconnect**: Refresh the page (F5)
4. **VPN Issues**: If using VPN, try disconnecting/reconnecting

### Data Entry Issues

**Problem: Cannot save changes to a cell**

**Solutions:**
1. **Validation Errors**: Check for error messages below the cell
2. **Required Fields**: Ensure required fields aren't left blank
3. **Data Type Mismatch**: Number fields require numeric values, Date fields require valid dates
4. **Permission Issue**: Verify you have edit permission for that column

**Problem: Bulk edit affects wrong employees**

**Solutions:**
1. **Clear Selection**: Click empty area to deselect all, then reselect correct employees
2. **Use Filters**: Filter to target employees first, then select all visible rows
3. **Undo Changes**: If you made a mistake, contact HR immediately - they may be able to restore from backups

**Problem: CSV import fails**

**Solutions:**
1. **Check File Format**: Must be .csv format (not .xlsx)
2. **Match Template**: Download CSV template and ensure your file has matching columns
3. **Encoding**: Save CSV as UTF-8 encoding to avoid character issues
4. **Required Fields**: Ensure all required columns (First Name, Last Name, Email, SSN, Hire Date) have values
5. **Unique Constraints**: Email and SSN must be unique (no duplicates)

### Performance Issues

**Problem: Table loads slowly with many employees**

**Solutions:**
1. **Use Filters**: Filter to a subset of employees (e.g., by department)
2. **Close Unused Browser Tabs**: Free up memory
3. **Clear Browser Cache**: Ctrl+Shift+Delete > Clear cache
4. **Upgrade Browser**: Ensure you're using the latest browser version

**Problem: Scrolling is laggy**

**Solutions:**
1. **Enable Virtual Scrolling**: Already enabled by default for 1,000+ rows
2. **Reduce Visible Columns**: Hide columns you don't need via column visibility settings
3. **Close Other Applications**: Free up system resources

**Problem: Search is slow**

**Solutions:**
1. **Use Specific Keywords**: More specific search terms narrow results faster
2. **Use Column Filters**: Filter on indexed columns (Email, SSN, Hire Date) for best performance
3. **Reduce Dataset**: If searching within a department, filter by department first

### Browser-Specific Issues

**Problem: Interface looks broken or misaligned**

**Solutions:**
1. **Update Browser**: Ensure you're using a supported browser version
2. **Zoom Level**: Reset browser zoom to 100% (Ctrl+0)
3. **Disable Browser Extensions**: Ad blockers or privacy extensions may interfere
4. **Try Different Browser**: Test in Chrome or Edge as a fallback

**Problem: Drag-and-drop doesn't work**

**Solutions:**
1. **Enable JavaScript**: Ensure JavaScript is enabled in browser settings
2. **Update Browser**: Drag-and-drop requires modern browser features
3. **Try Click-and-Select**: Use checkboxes instead of dragging to select multiple rows

---

## Support

For additional help:

- **Technical Issues**: Contact IT Support at [support-email]
- **Permission Questions**: Contact your HR Administrator
- **Feature Requests**: Submit via [feedback-form]
- **Report Bugs**: Email [bug-reports-email] with screenshots and steps to reproduce

---

**Document Version:** 1.0  
**Last Updated:** October 29, 2025  
**Next Review:** January 2026
