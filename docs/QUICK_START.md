# Quick Start Guide

Get started with the HR Masterdata Management System in 5 minutes.

---

## Table of Contents

- [Access the Application](#access-the-application)
- [Login](#login)
- [HR Admin Quick Start](#hr-admin-quick-start)
- [External Party Quick Start](#external-party-quick-start)
- [Common Shortcuts & Tips](#common-shortcuts--tips)
- [Need More Help?](#need-more-help)

---

## Access the Application

**Production URL:** [https://hr-masterdata.vercel.app](https://hr-masterdata.vercel.app)

**System Requirements:**

- Modern web browser (Chrome, Firefox, Edge, Safari - last 2 versions)
- Internet connection
- No software installation required

---

## Login

1. **Navigate to the application URL**

   ```
   https://hr-masterdata.vercel.app
   ```

2. **Enter your credentials**
   - **Email:** Your work email (e.g., `hr@example.com`)
   - **Password:** Provided by HR Administrator

3. **Click "Sign In"**
   - You'll be redirected to your personalized dashboard
   - Dashboard displays employee data based on your role

**First-Time Login:**

- Change your password immediately (Settings > Change Password)
- Review the User Guide for detailed feature explanations

**Forgot Password:**

- Contact your HR Administrator to reset your password
- Self-service password reset coming in Phase 2

---

## HR Admin Quick Start

**🎯 Goal:** Manage employee masterdata and configure system settings

### 1. View Employee List (Dashboard)

After login, you'll see the employee table with all employees and all columns (masterdata + custom columns from all external parties).

**Key Actions:**

- **Search:** Type in the search box to filter by name, email, or SSN
- **Sort:** Click column headers to sort ascending/descending
- **Filter:** Use status dropdown to show Active/Archived/Terminated employees

### 2. Create New Employee

**Steps:**

1. Click **"Add Employee"** button (top-right of table)
2. Fill in required fields:
   - First Name
   - Surname
   - Email (must be unique)
   - SSN (must be unique)
   - Gender
   - Hire Date
3. Fill in optional fields (Mobile, Rank, Town District, Comments)
4. Click **"Create Employee"**
5. ✅ New employee appears in table immediately
6. ✅ All external parties see the new employee within 2 seconds (real-time sync)

**Pro Tip:** Use Tab key to navigate between form fields quickly.

### 3. Edit Employee Data

**Steps:**

1. Locate employee in table
2. Click **"Edit"** button (pencil icon) in row actions
3. Modify fields as needed
4. Click outside the field or press Enter to save
5. ✅ Changes save automatically and sync to all users in real-time

**What You Can Edit:**

- All masterdata fields (name, email, SSN, hire date, etc.)
- Custom columns created by external parties (you can view/edit all columns)

### 4. Archive Employee

**Steps:**

1. Locate employee in table
2. Click **"Archive"** button (archive icon) in row actions
3. Confirm archival in dialog
4. ✅ Employee status changes to "Archived"
5. ✅ Archived employees can be filtered out or restored later

**Note:** Archiving is a soft delete - data is preserved and can be unarchived anytime.

### 5. Configure Column Permissions

**Steps:**

1. Click **"Admin"** in navigation (top-right)
2. Select **"Column Settings"** from dropdown
3. View permission matrix (all roles vs. all columns)
4. Toggle **"Can View"** or **"Can Edit"** switches for each role
5. Click **"Save Changes"**
6. ✅ Permission changes take effect immediately for all users

**Example Use Case:**

- Hide "SSN" column from Sodexo users
- Grant ÖMC "Can Edit" permission for a specific custom column

### 6. Preview Role Views ("View As")

**Steps:**

1. In dashboard, click **"View As"** dropdown (top-right of table)
2. Select a role (e.g., "Sodexo")
3. ✅ Table updates to show exactly what Sodexo users see
4. Click **"Exit Preview"** to return to HR Admin view

**Why This is Useful:**

- Verify column permissions are correct before notifying external parties
- Troubleshoot permission issues
- Understand what each external party sees

**Pro Tip:** Always preview role views after changing column permissions to ensure configuration is correct.

### 7. Manage User Accounts

**Steps:**

1. Click **"Admin"** → **"User Management"**
2. View list of all users
3. **Create New User:**
   - Click "Add User" button
   - Enter email, name, and assign role (Sodexo, ÖMC, Payroll, Toplux)
   - Click "Create User"
   - Send credentials to new user
4. **Deactivate User:**
   - Click "Deactivate" button for user
   - User can no longer log in (but account is preserved)
5. **Activate User:**
   - Click "Activate" button for deactivated user
   - User can log in again

**Security Note:** You cannot deactivate your own account (prevents lockout).

---

## External Party Quick Start

**🎯 Goal:** View employee masterdata and manage your custom columns

### 1. View Employee List (Dashboard)

After login, you'll see the employee table with:

- **Masterdata columns** (read-only): First Name, Surname, Email, SSN, etc.
- **Your custom columns** (editable): Columns specific to your role

**Key Actions:**

- **Search:** Type in search box to find employees
- **Sort:** Click column headers to sort
- **Filter:** Use status dropdown to filter by employee status

### 2. Edit Custom Column Data

**Steps:**

1. Locate employee in table
2. Click into your custom column cell (e.g., "Sodexo ID")
3. Edit the value
4. Press Enter or click outside cell to save
5. ✅ Changes save automatically

**What You Can Edit:**

- Only your role's custom columns (e.g., Sodexo users can only edit Sodexo columns)
- Masterdata columns are read-only (managed by HR Admin)

**Example:**

- **Sodexo user** can edit "Sodexo ID", "Meal Plan Type", "Badge Number"
- **ÖMC user** can edit "ÖMC Employee Code", "Department", "Cost Center"

### 3. Create New Custom Column

**Steps:**

1. Click **"Add Custom Column"** button (top-right of table)
2. Fill in column details:
   - **Column Name:** e.g., "Uniform Size"
   - **Data Type:** Text, Number, Date, Boolean (Yes/No)
   - **Category:** Optional (e.g., "Recruitment Team", "Warehouse Team")
3. Click **"Create Column"**
4. ✅ New column appears in table immediately
5. ✅ You can now edit values for all employees in this column

**Example Use Cases:**

- **Sodexo:** Create "Meal Plan Type", "Badge Number", "Cafeteria Access Level"
- **ÖMC:** Create "Uniform Size", "Locker Number", "Shift Preference"
- **Payroll:** Create "Bank Account", "Tax Code", "Bonus Eligible"
- **Toplux:** Create "Vehicle Assignment", "Parking Spot", "Fuel Card Number"

**Pro Tip:** Use categories to organize related columns (e.g., "Recruitment Team" vs. "Warehouse Team").

### 4. Hide/Unhide Custom Columns

**Steps:**

1. Right-click column header in table
2. Select "Hide Column" from context menu
3. ✅ Column is hidden from your view (data is preserved)
4. To unhide: Click "Column Visibility" icon → Toggle column back on

**Note:** Hiding columns is a UI preference - it doesn't delete data.

### 5. View Real-Time Updates

**No action required** - the system automatically updates when HR Admin makes changes:

- ✅ HR creates new employee → appears in your table within 2 seconds
- ✅ HR edits employee data → changes appear in real-time
- ✅ HR archives employee → status updates immediately

**Pro Tip:** Keep the browser tab open to receive real-time updates. No need to refresh!

---

## Common Shortcuts & Tips

### Keyboard Shortcuts

| Shortcut                               | Action                          |
| -------------------------------------- | ------------------------------- |
| **Tab**                                | Navigate between form fields    |
| **Enter**                              | Save inline edit                |
| **Esc**                                | Cancel edit or close modal      |
| **Ctrl+F** (Windows) / **Cmd+F** (Mac) | Focus search box                |
| **Ctrl+S** (Windows) / **Cmd+S** (Mac) | Save changes (where applicable) |

### Time-Saving Tips

**1. Use Global Search Instead of Scrolling**

- Typing "John" in search box is faster than scrolling through 1,000 rows

**2. Sort Before Editing**

- Sort by "Hire Date" to find newest employees quickly
- Sort by "Status" to see all Active employees grouped together

**3. Use Categories for Custom Columns**

- Organize columns into logical groups (e.g., "Recruitment", "Warehouse", "Admin")
- Makes it easier to find specific columns when table has many columns

**4. Bookmark the Dashboard URL**

- Save the dashboard URL in your browser bookmarks for quick access

**5. Keep Browser Tab Open**

- Real-time sync works best when tab is open (receives updates immediately)
- If tab is closed, data will update when you next login

### Troubleshooting Quick Fixes

**Problem: Can't login**

- **Fix:** Verify email is correct (no typos)
- **Fix:** Check Caps Lock is off
- **Fix:** Contact HR Admin to reset password

**Problem: Don't see a column I created**

- **Fix:** Check column visibility settings (click "Column Visibility" icon)
- **Fix:** Refresh browser (Ctrl+R or Cmd+R)

**Problem: Changes not saving**

- **Fix:** Check internet connection (red warning appears if offline)
- **Fix:** Wait 2 seconds and try again (may be temporary network delay)
- **Fix:** Refresh browser and check if change persisted

**Problem: Can't edit a column**

- **Fix:** Verify column is not masterdata (only HR Admin can edit masterdata)
- **Fix:** Check column permissions (ask HR Admin if you should have edit access)

**Problem: Real-time updates not appearing**

- **Fix:** Refresh browser (Ctrl+R or Cmd+R)
- **Fix:** Check internet connection
- **Fix:** Re-login to re-establish real-time subscription

---

## Need More Help?

### Documentation Resources

**📚 Full User Guide** - Comprehensive documentation  
→ [docs/USER_GUIDE.md](./USER_GUIDE.md)

**📖 API Documentation** - For developers integrating with the system  
→ [docs/API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**❓ FAQ** - Frequently asked questions  
→ [docs/USER_GUIDE.md#faq](./USER_GUIDE.md#faq)

**🔧 Troubleshooting** - Common issues and solutions  
→ [docs/USER_GUIDE.md#troubleshooting](./USER_GUIDE.md#troubleshooting)

**🐛 Known Issues** - Current limitations and workarounds  
→ [docs/KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

### Support Contact

**HR Administrator Support:**

- **Email:** hr@yourcompany.com
- **Response Time:** Within 1 business day
- **Hours:** Monday-Friday, 9:00 AM - 5:00 PM

**Technical Support:**

- **Email:** techsupport@yourcompany.com (if available)
- **For:** Technical issues, bugs, performance problems

**Feedback & Feature Requests:**

- **Email:** hr@yourcompany.com
- We welcome your feedback to improve the system!

---

## What's Next?

### After Your First Login

**Week 1 Goals:**

- ✅ Login successfully
- ✅ Familiarize yourself with dashboard navigation
- ✅ Create or edit at least one record (to practice)
- ✅ Ask HR Admin any questions

**Week 2 Goals:**

- ✅ Use the system for daily tasks (replace Excel workflow)
- ✅ Create custom columns as needed (external parties)
- ✅ Provide feedback to HR Admin (what works, what doesn't)

**Ongoing:**

- ✅ Use the system as your primary tool for employee data management
- ✅ Report any issues or bugs to HR Admin
- ✅ Suggest improvements or new features

### Training Sessions (Optional)

Ask your HR Administrator about:

- Group training sessions for new users
- One-on-one training for complex workflows
- Advanced feature tutorials (column permissions, role preview, etc.)

---

## System Status

**Current Version:** MVP v1.0.0  
**Last Updated:** October 29, 2025  
**Uptime:** 99.9% (Vercel + Supabase infrastructure)  
**Support Hours:** Monday-Friday, 9:00 AM - 5:00 PM

**Upcoming Features (Phase 2):**

- CSV export for reports
- Bulk edit capabilities
- Self-service password reset
- Email notifications for important updates
- Audit log for tracking changes
- Advanced search with filters

---

**Ready to get started? [Login now](https://hr-masterdata.vercel.app) and explore the system!**

For detailed guidance, refer to the [Full User Guide](./USER_GUIDE.md).
