# Epic 2: HR Masterdata Management Core

**Epic Goal**: Enable HR Admin users to fully manage employee masterdata through an intuitive table interface including creating new employees, editing all masterdata fields, archiving employees, marking terminations with reasons, importing from CSV files, maintaining an important dates reference calendar, and utilizing search and sort capabilities to efficiently navigate the employee list. This epic delivers core HR CRUD functionality as a complete, testable vertical slice.

## Story 2.1: Employee List Table View

As an **HR Admin**,  
I want **to see all active employees in a spreadsheet-like table displaying key masterdata fields**,  
so that **I can quickly browse and navigate the employee list**.

### Acceptance Criteria

1. Dashboard route (/dashboard) displays a table component showing all non-archived, non-terminated employees from the database
2. Table displays columns: First Name, Surname, SSN, Email, Mobile, Rank, Gender, Town District, Hire Date, Status with proper formatting (dates as YYYY-MM-DD or locale-specific)
3. Table uses TanStack Table library (or similar) for rendering with TypeScript types for employee data
4. Table is styled with Tailwind CSS and shadcn/ui components for clean, professional appearance
5. Table displays loading state while fetching data from Supabase
6. Empty state message displayed if no employees exist ("No employees found. Click 'Add Employee' to create your first record.")
7. Table is responsive and horizontally scrollable on smaller desktop screens if needed
8. Data fetch uses Supabase client with RLS policies ensuring only HR Admin role can read employees table
9. Page renders correctly for HR Admin role (verified manually through login as HR Admin)
10. Archived and terminated employees are excluded from the default table view (separate filter options available)

## Story 2.2: Create New Employee Record

As an **HR Admin**,  
I want **to create a new employee record with all required masterdata fields**,  
so that **I can add new hires or candidates to the system**.

### Acceptance Criteria

1. "Add Employee" button displayed prominently on the dashboard table view
2. Clicking "Add Employee" opens a modal or side panel form with input fields for: First Name (required), Surname (required), SSN (required), Email (required, email format validation), Mobile (optional), Town District (optional), Rank (optional), Gender (optional, dropdown: Male/Female/Other/Prefer not to say), Hire Date (required, date picker), Comments (optional, text area)
3. Form includes client-side validation: required fields, email format, date format
4. Form includes "Save" and "Cancel" buttons
5. Clicking "Save" submits data to API route /api/employees (POST) which inserts record into employees table
6. Successful save closes the modal, refreshes the table to show new employee, and displays success toast message ("Employee [First Name] [Surname] created successfully")
7. Save operation validates user role is hr_admin before allowing insert
8. Validation errors display inline below respective form fields with clear messages
9. API endpoint is testable via CLI (e.g., curl -X POST /api/employees -d '{...}' -H 'Authorization: Bearer <token>')
10. New employee appears in table immediately after creation (real-time update or page refresh)

## Story 2.3: Edit Employee Masterdata Fields

As an **HR Admin**,  
I want **to edit any masterdata field for an existing employee by clicking on a cell**,  
so that **I can correct or update employee information as needed**.

### Acceptance Criteria

1. Table cells for all displayed columns (First Name, Surname, SSN, Email, Mobile, Rank, Gender, Town District, Hire Date, Comments) are visually indicated as editable (e.g., hover state shows edit cursor or subtle background change)
2. Clicking a cell enters edit mode: cell becomes an input field (text input for text fields, date picker for dates, dropdown for gender) with current value pre-populated
3. User can modify the value and press Enter or click outside the cell to save
4. Pressing Escape cancels the edit and reverts to original value
5. Save triggers API call to /api/employees/[id] (PATCH) updating the specific field in the database
6. Successful update shows subtle visual feedback (brief highlight or success indicator) and updates the displayed value
7. Update operation validates user role is hr_admin before allowing modification
8. Validation errors (e.g., invalid email format, empty required field) display as inline error message and prevent save
9. Termination Date field is nullable and can be edited to set or clear the value
10. API endpoint is testable via CLI (e.g., curl -X PATCH /api/employees/{id} -d '{"email": "new@example.com"}')
11. Changes are persisted to database and remain after page refresh

## Story 2.4: Archive Employee (Soft Delete)

As an **HR Admin**,  
I want **to archive an employee record so it's hidden from the main view but remains recoverable**,  
so that **I can manage employee lifecycle (departures) without losing historical data**.

### Acceptance Criteria

1. Each table row includes an "Archive" action button or icon (e.g., archive icon in an actions column)
2. Clicking "Archive" displays a confirmation dialog: "Are you sure you want to archive [Employee Name]? They will be hidden from the main view but can be recovered later."
3. Confirming archive action calls API route /api/employees/[id]/archive (POST) which sets is_archived = true in the database
4. Archived employee immediately disappears from the main table view
5. Archive operation validates user role is hr_admin before allowing modification
6. Success message displayed: "[Employee Name] has been archived."
7. Archived employees can be viewed by toggling a "Show Archived" checkbox or filter on the dashboard (displays archived employees in a visually distinct way, e.g., grayed out or separate section)
8. Clicking "Unarchive" on an archived employee restores it to active status and returns it to the main table view
9. API endpoint is testable via CLI (e.g., curl -X POST /api/employees/{id}/archive)
10. Archive status persists correctly in database (is_archived column)

## Story 2.5: Mark Employee as Terminated/Drop Out

As an **HR Admin**,  
I want **to mark an employee as "Terminated/Drop out" with termination date and reason**,  
so that **I can track employee departures separately from active employees while maintaining their full record history**.

### Acceptance Criteria

1. Each table row includes a "Mark as Terminated" action button or option in actions menu
2. Clicking "Mark as Terminated" opens a modal with form fields: Termination Date (required, date picker), Termination Reason (required, text area for comments)
3. Modal displays employee key information for confirmation: First Name, Surname, SSN, Rank, Gender
4. Form includes "Confirm Termination" and "Cancel" buttons
5. Confirming termination calls API route /api/employees/[id]/terminate (POST) which sets is_terminated = true, termination_date, and termination_reason in the database
6. Terminated employee is visually distinguished in the table (e.g., grayed out, struck through, or badge showing "Terminated")
7. Terminated employees can be filtered separately using "Show Terminated" checkbox or filter dropdown
8. Termination operation validates user role is hr_admin before allowing modification
9. Success message displayed: "[First Name] [Surname] has been marked as terminated."
10. Terminated employees can be "reactivated" (setting is_terminated = false, clearing termination_date and reason) if marked in error
11. API endpoint is testable via CLI (e.g., curl -X POST /api/employees/{id}/terminate -d '{"termination_date": "2025-10-26", "termination_reason": "Voluntary resignation"}')

## Story 2.6: Import Employees from CSV File

As an **HR Admin**,  
I want **to import employee masterdata from a CSV file**,  
so that **I can migrate existing Excel data into the system efficiently without manual data entry**.

### Acceptance Criteria

1. "Import Employees" button displayed on the dashboard near "Add Employee" button
2. Clicking "Import Employees" opens a modal with file upload component accepting .csv files
3. Modal includes instructions: "Upload a CSV file with the following columns: First Name, Surname, Social Security No., Email, Mobile, Town District, Rank, Gender, Hire Date (YYYY-MM-DD), Comments"
4. After file selection, system validates CSV format and displays preview of first 5 rows with detected columns
5. Column mapping interface allows HR to map CSV columns to database fields (e.g., "Surname" → surname, "Social Security No." → ssn)
6. Validation checks for required fields (First Name, Surname, SSN, Hire Date) and displays errors for missing/invalid data
7. "Import" button processes the CSV, inserting valid employee records into the employees table via API route /api/employees/import (POST)
8. Import progress indicator shows number of records processed (e.g., "Importing 45 of 100 employees...")
9. After import completes, success summary displays: "Successfully imported X employees. Y rows skipped due to errors." with option to download error report
10. Imported employees appear in the main table view immediately
11. Import operation validates user role is hr_admin before allowing execution
12. Duplicate SSN handling: skip row and report as error (no duplicate SSN allowed)
13. API endpoint is testable via CLI (e.g., curl -X POST /api/employees/import -F 'file=@employees.csv')

## Story 2.7: Search and Sort Employee Table

As an **HR Admin**,  
I want **to search employees by any field and sort columns ascending/descending**,  
so that **I can quickly find specific employees in a large list**.

### Acceptance Criteria

1. Search input box displayed above the employee table with placeholder "Search employees..."
2. Typing in search box filters table rows in real-time (client-side filtering) matching search term against all visible columns (First Name, Surname, SSN, Email, Mobile, Rank, Gender, Town District)
3. Search is case-insensitive and matches partial strings
4. Table displays "No employees match your search" message if search returns no results
5. Clearing search box restores full employee list
6. Each column header is clickable to sort the table by that column
7. First click sorts ascending (visual indicator: up arrow), second click sorts descending (down arrow), third click removes sort (returns to default order)
8. Sort functionality works correctly for text fields (alphabetical) and date fields (chronological)
9. Search and sort work together: search filters the data set, sort orders the filtered results
10. Performance is acceptable for 1,000 employee records (filtering/sorting completes in <500ms)

## Story 2.8: Important Dates Reference Calendar

As an **HR Admin**,  
I want **to maintain a reference calendar of important operational dates visible to all users**,  
so that **everyone can coordinate scheduling around key Stena and ÖMC dates throughout the year**.

### Acceptance Criteria

1. Navigation includes "Important Dates" link accessible to all authenticated users (HR Admin, external parties)
2. Important Dates page displays a table/calendar view showing dates organized by week number and category (e.g., "Stena Dates", "ÖMC Dates")
3. Table displays columns: Week Number, Year, Category, Date Description, Date Value, Notes
4. For HR Admin: "Add Date" button opens modal with form fields: Week Number (integer, optional), Year (integer, default current year), Category (text or dropdown: "Stena Dates", "ÖMC Dates", "Other"), Date Description (text, e.g., "Fredag 14/2"), Date Value (text for flexible date formats like "15-16/2"), Notes (optional text area)
5. For HR Admin: Inline editing capability to update existing date entries (click cell to edit)
6. For HR Admin: Delete action for each date entry with confirmation dialog
7. Clicking "Save" calls API route /api/important-dates (POST) which inserts record into important_dates table
8. All users (including external parties) can view the important dates in read-only mode
9. Table is sortable by week number and filterable by category
10. RLS policy enforces that all authenticated users can read important_dates but only hr_admin role can create/update/delete
11. API endpoints testable via CLI: GET /api/important-dates, POST /api/important-dates, PATCH /api/important-dates/[id], DELETE /api/important-dates/[id]
12. Important dates persist across sessions and are available immediately after creation
13. Optional: Visual calendar view toggle showing dates in traditional calendar format alongside table view

---
