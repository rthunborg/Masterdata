# Epic 4: External Party Custom Columns, Real-Time Sync & Change Notifications

**Epic Goal**: Enable external parties to create and manage their own custom data columns with category organization, ensuring complete data isolation between parties. Implement real-time synchronization so that masterdata changes by HR Admin instantly propagate to all external party views. Provide visual notifications to external parties when data changes affect their current filtered/sorted view. This epic delivers the core value proposition of autonomous data management with live updates and change awareness.

## Story 4.1: Custom Column Definition and Storage Schema

As a **developer**,  
I want **database tables to store custom column data separately per external party with flexible schema**,  
so that **each party can define their own columns without affecting others**.

### Acceptance Criteria

1. Database tables created for each external party: sodexo_data, omc_data, payroll_data, oplux_data with columns: id (UUID), employee_id (UUID, foreign key to employees.id), data (JSONB), created_at, updated_at
2. RLS policies created on each party-specific table: only users with matching role can read/write their own table (e.g., sodexo role can only access sodexo_data)
3. column_config table supports entries for custom columns with is_masterdata = false and party-specific role permissions
4. Foreign key constraint ensures employee_id references valid employee in employees table with CASCADE delete
5. JSONB data field stores custom column values as key-value pairs (column_name: value)
6. Database migration files version controlled and documented
7. API route /api/custom-columns (GET) returns list of custom columns for current user's role from column_config
8. API route /api/custom-columns (POST) allows creating new custom column definition (role validation enforces only appropriate roles can create columns for their party)

## Story 4.2: Create Custom Column for External Party

As an **external party user**,  
I want **to create a new custom column specific to my role with a name, type, and optional category**,  
so that **I can track data relevant to my department's needs**.

### Acceptance Criteria

1. External party dashboard includes "Add Column" button (visible only to external party roles, not HR Admin)
2. Clicking "Add Column" opens modal with form fields: Column Name (required, text input), Column Type (dropdown: Text, Number, Date, Boolean), Category (optional, text input or dropdown with existing categories)
3. Form validation ensures column name is unique for the role (cannot create duplicate column names)
4. Submitting form calls /api/custom-columns (POST) creating entry in column_config with is_masterdata = false,
   ole_permissions set for only current user's role
5. New column appears in the table as a new column header immediately after creation
6. New column cells are empty for all employees initially (null values in JSONB data field)
7. Success message displayed: "Column '[Column Name]' created successfully"
8. External party user can create multiple custom columns (no limit for MVP)
9. Column creation is isolated: Sodexo creating a column does not affect ÖMC, Payroll, or Toplux views
10. API endpoint testable via CLI with appropriate role authentication

## Story 4.3: Edit Custom Column Data

As an **external party user**,  
I want **to click on cells in my custom columns and edit the values**,  
so that **I can populate and maintain my department-specific data**.

### Acceptance Criteria

1. Custom column cells (columns where current user role has edit: true permission and is_masterdata = false) are visually indicated as editable
2. Clicking a custom column cell enters edit mode with appropriate input type based on column type (text input, number input, date picker, checkbox for boolean)
3. User can enter/modify value and save by pressing Enter or clicking outside cell
4. Save triggers API call to /api/employees/[id]/custom-data (PATCH) updating the JSONB data field in the appropriate party-specific table (e.g., sodexo_data)
5. If no record exists in party-specific table for this employee_id, insert new record with employee_id and data JSONB
6. If record exists, update the specific column key-value in JSONB data field
7. RLS policies enforce that only the matching role can update their party-specific table
8. Successful save updates the displayed value in the table cell
9. Validation errors (e.g., invalid number format, invalid date) display inline and prevent save
10. Other external parties cannot see or edit this custom column data (verified through manual testing with multiple role accounts)
11. API endpoint testable via CLI

## Story 4.4: Organize Custom Columns by Category

As an **external party user**,  
I want **to organize my custom columns into categories**,  
so that **I can logically group related columns for my workflow (e.g., Recruitment Team, Warehouse Team)**.

### Acceptance Criteria

1. Column configuration includes category field (string, optional)
2. Table view groups custom columns by category with visual separators or subheaders (e.g., "Recruitment Team" subheader above columns in that category)
3. Columns without category appear in an "Uncategorized" or default group
4. External party user can edit column category through a "Manage Columns" interface or edit modal
5. Clicking "Edit Column" on an existing custom column allows changing its name, type, or category
6. Category changes update column_config and table view reorganizes columns immediately
7. Category grouping is cosmetic/UI only (does not affect data storage)
8. Table remains sortable and searchable across all visible columns regardless of category grouping
9. Categories can be reused across multiple columns (e.g., multiple columns in "Recruitment Team" category)

## Story 4.5: Real-Time Masterdata Synchronization

As an **external party user**,  
I want **to see masterdata changes made by HR Admin appear in my view within 2 seconds without refreshing the page**,  
so that **I always have current employee information**.

### Acceptance Criteria

1. Frontend subscribes to Supabase real-time channel for employees table changes (inserts, updates, deletes)
2. When HR Admin updates a masterdata field (e.g., changes employee name), the change event is received by all subscribed clients
3. Table component updates the affected row automatically with new data within 2 seconds
4. Real-time update maintains current sort and search filters (updated row stays in correct position based on active sort/filter)
5. Visual indicator briefly highlights the updated cell or row (e.g., brief color pulse) to draw user attention to the change
6. New employee insertions by HR Admin appear in all external party tables automatically (if they have permission to view employees)
7. Employee archival by HR Admin removes the employee from external party views in real-time
8. Real-time functionality gracefully degrades if Supabase real-time connection fails (fallback to polling every 5 seconds or display warning message)
9. Real-time sync tested manually: open two browser windows (one as HR Admin, one as external party), verify changes propagate
10. Performance remains acceptable with real-time sync active (no noticeable lag or memory leaks)
11. Real-time change events trigger ViewStateTracker to evaluate if notification should be shown to external party users (implemented in Story 4.6)

## Story 4.6: Change Notifications for External Party Views

As an **external party user**,  
I want **to receive visual notifications when masterdata changes affect my current filtered/sorted view**,  
so that **I'm aware when employees enter, leave, or are updated in my view without manually refreshing**.

### Acceptance Criteria

1. When HR Admin updates masterdata causing an employee to newly match the external party's active filter criteria (e.g., hire_date change moves employee into filtered date range), a toast notification appears: "1 new employee matches your filters: [Employee Name]"
2. When HR Admin updates masterdata causing an employee to no longer match the external party's active filter criteria, a toast notification appears: "1 employee no longer matches your filters: [Employee Name]"
3. When HR Admin updates a masterdata field for an employee already visible in the external party's view, a toast notification appears: "Employee [Name] was updated ([Field] changed)"
4. Notifications appear as non-intrusive toast messages in the bottom-right corner using Sonner library (already in project)
5. Notifications are dismissible by clicking the X icon or automatically dismiss after 5 seconds
6. If multiple employees are affected simultaneously (e.g., bulk import), notifications are batched: "3 new employees match your filters"
7. Clicking a notification focuses/scrolls to the affected employee row in the table (optional enhancement for MVP)
8. Notifications only trigger for changes affecting the user's current view state (if no filters active, only show "Employee [Name] was updated")
9. ViewStateTracker custom hook tracks current filter/sort state and visible employee IDs to determine notification triggers
10. Notifications do not trigger for the user's own edits to custom columns (only for HR masterdata changes)
11. Performance: Notification logic executes in <100ms after real-time event received
12. Accessibility: Notifications are announced to screen readers using ARIA live regions

---
