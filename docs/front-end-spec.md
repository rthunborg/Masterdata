# HR Masterdata Management System UI/UX Specification

## Introduction

This document defines the user experience goals, information architecture, user flows, and visual design specifications for HR Masterdata Management System's user interface. It serves as the foundation for visual design and frontend development, ensuring a cohesive and user-centered experience.

### Overall UX Goals & Principles

#### Target User Personas

**1. HR Admin - Power User & System Manager**

- **Profile:** HR professionals who manage all employee masterdata, configure system permissions, and maintain user accounts
- **Technical Comfort:** Moderate - Excel-proficient but not database-savvy
- **Primary Goals:** 
  - Efficiently maintain accurate employee records
  - Control data access and permissions confidently
  - Reduce time spent on data management from Excel workflow
- **Pain Points:** 
  - Previously burdened by VB script maintenance
  - Frustrated by Excel data synchronization issues
  - Need transparency in permission configuration
- **Key Needs:**
  - Excel-like editing for familiarity
  - Clear visibility into what each role sees (View As preview)
  - Quick bulk operations (CSV import, batch edits)

**2. External Party Users (Sodexo, ÖMC, Payroll, Toplux) - Departmental Data Managers**

- **Profile:** Department representatives who need employee information relevant to their operations
- **Technical Comfort:** Low to moderate - comfortable with Excel, unfamiliar with databases
- **Primary Goals:**
  - View current employee masterdata for their operations
  - Maintain department-specific data columns
  - Stay synchronized with HR's masterdata changes
- **Pain Points:**
  - Previously received outdated Excel files
  - Confusion about which data they can modify
  - Need to organize custom data by team/category
- **Key Needs:**
  - Clear visual indicators of read-only vs editable fields
  - Simple column creation without technical knowledge
  - Real-time updates when HR changes employee data

#### Usability Goals

1. **Ease of Learning:** Users transitioning from Excel can perform basic tasks (view data, edit cell, search) within 5 minutes without training or documentation
2. **Efficiency of Use:** Common tasks require minimal interaction:
   - Edit cell: 1 click + type + Enter
   - Add employee: 2 clicks (button + save)
   - Search: 0 clicks (always-visible search box)
   - Sort: 1 click on column header
3. **Error Prevention:** Destructive actions (archive, terminate, delete column) require confirmation dialogs with clear consequence descriptions
4. **Memorability:** Infrequent users recognize familiar Excel-like patterns (grid layout, inline editing, column headers) and can resume work without relearning
5. **Real-time Awareness:** Data changes appear within 2 seconds with subtle visual feedback (brief highlight pulse) to maintain user context

#### Design Principles

1. **"Excel Without the Pain"** - Preserve familiar spreadsheet paradigms users already know while delivering modern web benefits
   - Click-to-edit cells with inline input
   - Arrow key navigation between cells
   - Column header sorting
   - Global search filtering
   - BUT: Add real-time sync, role-based security, cloud access, proper data validation

2. **Clarity Over Cleverness** - Prioritize intuitive, obvious interactions over innovative but confusing patterns
   - Standard form inputs over custom widgets
   - Explicit buttons ("Add Employee") over hidden context menus
   - Clear labels ("Read-only") over subtle visual-only indicators
   - Consistent table layout over dynamic rearrangement

3. **Progressive Disclosure** - Show complexity only when needed
   - HR Admin sees advanced features (admin panel, role preview) in separate navigation
   - Main table interface remains clean for all users
   - Modal dialogs for complex operations (CSV import, column configuration)
   - Collapsed/expandable sections for detailed information

4. **Immediate, Obvious Feedback** - Every action receives clear visual confirmation
   - Inline success indicators (green checkmark, brief highlight)
   - Non-blocking toast notifications for background operations
   - Loading states for async operations (spinner in button, skeleton rows)
   - Error messages inline near the affected field

5. **Transparent Permissions** - Users always know what they can and cannot do
   - Consistent visual language: light gray background = read-only, white = editable
   - Lock icons on read-only column headers
   - Disabled buttons with explanatory tooltips
   - "View As" mode for HR to verify permissions

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-26 | 1.0 | Initial UI/UX specification created from PRD | Sally (UX Expert) |

---

## Information Architecture (IA)

### Site Map / Screen Inventory

\\\mermaid
graph TD
    A[Login Screen] --> B{Role Check}
    B -->|HR Admin| C[Dashboard - Full View]
    B -->|External Party| D[Dashboard - Role View]
    
    C --> C1[Employee Table - All Columns]
    C --> C2[Add Employee Modal]
    C --> C3[Edit Employee Inline]
    C --> C4[Archive Employee]
    C --> C5[Terminate Employee Modal]
    C --> C6[Import CSV Modal]
    C --> C7[Important Dates Calendar]
    C --> C8[Admin Panel]
    
    C8 --> C8A[User Management]
    C8 --> C8B[Column Settings]
    C8 --> C8C[View As Preview Mode]
    
    D --> D1[Employee Table - Limited Columns]
    D --> D2[View Read-only Masterdata]
    D --> D3[Edit Custom Columns Inline]
    D --> D4[Add Custom Column Modal]
    D --> D5[Manage Columns Modal]
    D --> D6[Important Dates Calendar - Read-only]
    
    C --> H[Header Navigation]
    D --> H
    H --> H1[Dashboard Link]
    H --> H2[Important Dates Link]
    H --> H3[Admin Link - HR Only]
    H --> H4[User Profile Dropdown]
    H4 --> H4A[Logout]
\\\

### Navigation Structure

**Primary Navigation** (Top Header Bar - All Users)
- **Logo/Home:** "HR Masterdata" text/logo - links to dashboard
- **Dashboard:** Main employee table view
- **Important Dates:** Reference calendar
- **Admin** (HR Admin only): Dropdown with "User Management" and "Column Settings"
- **User Profile** (Right-aligned): Shows user email/role with dropdown for "Logout"

**Secondary Navigation** (Contextual - In Dashboard)
- **Action Buttons:** 
  - HR Admin: "Add Employee", "Import CSV", filter toggles ("Show Archived", "Show Terminated")
  - External Party: "Add Column", "Manage Columns"
- **Search Bar:** Always visible above table
- **View As Selector** (HR Admin only): Dropdown in table toolbar

**Breadcrumb Strategy**
- Not required for MVP (flat navigation structure with 2-3 levels maximum)
- Future consideration: Admin > User Management, Admin > Column Settings

---

## User Flows

### Flow 1: HR Admin - Add New Employee

**User Goal:** Create a new employee record with all required masterdata

**Entry Points:** Dashboard "Add Employee" button

**Success Criteria:** Employee appears in table, success toast displays, modal closes

#### Flow Diagram

\\\mermaid
graph TD
    A[User clicks 'Add Employee'] --> B[Modal opens with form]
    B --> C{User fills required fields?}
    C -->|No| D[Inline validation errors]
    D --> C
    C -->|Yes| E[User clicks 'Save']
    E --> F[API call: POST /api/employees]
    F --> G{API Success?}
    G -->|No| H[Error message in modal]
    H --> E
    G -->|Yes| I[Modal closes]
    I --> J[Success toast appears]
    J --> K[New row appears in table]
    K --> L[Brief highlight animation]
    L --> M[End - Employee created]
\\\

**Edge Cases & Error Handling:**
- Duplicate SSN: Display error "An employee with this SSN already exists"
- Network failure: Display "Unable to save. Check connection and try again"
- User clicks Cancel: Close modal, discard changes, no API call
- User clicks outside modal: Prompt "Discard changes?" if form dirty
- Invalid email format: Inline error "Please enter valid email address"

**Notes:** Consider autosave draft to localStorage for long forms (future enhancement)

---

### Flow 2: HR Admin - Import Employees from CSV

**User Goal:** Bulk import employee records from existing Excel export

**Entry Points:** Dashboard "Import CSV" button

**Success Criteria:** Valid employees imported, error report generated for invalid rows, table updates

#### Flow Diagram

\\\mermaid
graph TD
    A[User clicks 'Import CSV'] --> B[Modal opens with upload area]
    B --> C[User selects CSV file]
    C --> D[File validation]
    D --> E{Valid CSV?}
    E -->|No| F[Error: Invalid file format]
    F --> B
    E -->|Yes| G[Display preview - first 5 rows]
    G --> H[Column mapping interface]
    H --> I[User maps CSV columns to DB fields]
    I --> J[User clicks 'Import']
    J --> K[Progress indicator: X of Y rows]
    K --> L[API call: POST /api/employees/import]
    L --> M{All rows valid?}
    M -->|All valid| N[Success: X employees imported]
    M -->|Some invalid| O[Partial success: X imported, Y errors]
    O --> P[Offer download error report]
    N --> Q[Modal closes]
    P --> Q
    Q --> R[Table refreshes with new employees]
    R --> S[End]
\\\

**Edge Cases & Error Handling:**
- Empty CSV file: "File is empty. Please upload a file with employee data."
- Missing required columns: "Required columns missing: First Name, Surname, SSN, Hire Date"
- Duplicate SSN in CSV: Skip row, include in error report
- Invalid date format: Skip row, include in error report with line number
- Encoding issues (non-UTF8): Detect and attempt conversion or display encoding warning
- Large file (>1000 rows): Show warning "Large file detected. Import may take several minutes."

**Notes:** Consider chunked upload for files >5MB (future enhancement)

---

### Flow 3: External Party - Create Custom Column

**User Goal:** Add a new custom data column for department-specific information

**Entry Points:** Dashboard "Add Column" button

**Success Criteria:** Column appears in table header, cells editable, success message displays

#### Flow Diagram

\\\mermaid
graph TD
    A[User clicks 'Add Column'] --> B[Modal opens with form]
    B --> C[User enters Column Name]
    C --> D[User selects Column Type]
    D --> E[User optionally selects Category]
    E --> F[User clicks 'Create']
    F --> G[API call: POST /api/custom-columns]
    G --> H{API Success?}
    H -->|No| I[Error message]
    I --> F
    H -->|Yes| J[Modal closes]
    J --> K[Success toast: Column created]
    K --> L[New column header appears]
    L --> M[Empty cells for all rows]
    M --> N[End]
\\\

**Edge Cases & Error Handling:**
- Duplicate column name: "A column named '[name]' already exists. Please choose a different name."
- Special characters in name: Strip or warn "Column name can only contain letters, numbers, and spaces"
- Maximum columns reached (if limit exists): "Maximum custom columns reached (20). Please delete unused columns."
- Network error: "Unable to create column. Please try again."

**Notes:** Column appears at end of table (rightmost position after existing custom columns)

---

### Flow 4: HR Admin - View As Role Preview

**User Goal:** Verify what an external party role sees in their table view

**Entry Points:** "View As" dropdown in dashboard toolbar

**Success Criteria:** Table displays only permitted columns for selected role, preview banner visible

#### Flow Diagram

\\\mermaid
graph TD
    A[HR selects role from 'View As' dropdown] --> B[Client-side role filter applies]
    B --> C[Table re-renders with role permissions]
    C --> D[Banner appears: 'Viewing as Sodexo - Preview Mode']
    D --> E[Read-only columns indicated]
    E --> F[Edit actions disabled]
    F --> G{User switches roles?}
    G -->|Yes| B
    G -->|No| H{User clicks 'Exit Preview'?}
    H -->|No| I[User explores table]
    I --> H
    H -->|Yes| J[Return to HR Admin view]
    J --> K[Banner disappears]
    K --> L[Full columns restored]
    L --> M[Edit actions enabled]
    M --> N[End]
\\\

**Edge Cases & Error Handling:**
- Role has no visible columns: Display message "No columns configured for this role. Please configure column permissions."
- User attempts edit in preview: Tooltip "Editing disabled in preview mode"
- Custom columns don't exist for previewed role: Show placeholder message in custom column area

**Notes:** Preview mode is client-side only (doesn't affect database or other users)

---

### Flow 5: All Users - Real-Time Masterdata Update

**User Goal:** See current employee data when HR Admin makes changes

**Entry Points:** Automatic (user viewing dashboard)

**Success Criteria:** Updated data appears within 2 seconds with visual indicator

#### Flow Diagram

\\\mermaid
graph TD
    A[User viewing dashboard] --> B[Supabase real-time subscription active]
    B --> C[HR Admin updates employee field]
    C --> D[Database update committed]
    D --> E[Supabase broadcasts change event]
    E --> F[Client receives event < 2 sec]
    F --> G[Table component updates row]
    G --> H[Brief highlight animation on changed cell]
    H --> I[Update complete]
    I --> B
    
    B --> J{Connection lost?}
    J -->|Yes| K[Fallback to polling every 5 sec]
    K --> L[Warning banner: 'Real-time sync unavailable']
    J -->|No| B
\\\

**Edge Cases & Error Handling:**
- Connection lost: Fall back to polling, display warning banner
- Conflicting edits: Last-write-wins with notification "This row was updated by another user"
- User is editing cell when update arrives: Queue update until user finishes edit
- Large batch update: Display loading indicator, update in chunks

**Notes:** Highlight color pulses for 1 second then fades (use CSS animation)

---

## Wireframes & Mockups

**Primary Design Files:** To be created in Figma (link to be added after initial wireframing session)

### Key Screen Layouts

#### 1. Login Screen

**Purpose:** Authenticate users and establish role-based session

**Key Elements:**
- Centered login card (400px width) on neutral background
- Application logo/name "HR Masterdata Management"
- Email input field (full width, email type)
- Password input field (full width, password type with show/hide toggle)
- "Login" button (primary, full width)
- Error message area (red text, hidden until error)
- Footer: Version number, support contact

**Interaction Notes:**
- Enter key submits form from any field
- Show loading spinner in button during authentication
- Error message appears inline above form, not in alert
- Successful login redirects to /dashboard

**Design File Reference:** [Figma - Login Screen] (to be created)

---

#### 2. Main Dashboard - Employee Table (HR Admin View)

**Purpose:** Primary workspace for viewing and editing employee masterdata

**Key Elements:**

**Header Section:**
- Top navigation bar (full width, sticky)
  - Logo/Home link (left)
  - "Dashboard" | "Important Dates" | "Admin " navigation links
  - User profile dropdown (right): "admin@company.com (HR Admin)" with logout option

**Toolbar Section:**
- Action buttons row:
  - "Add Employee" (primary button)
  - "Import CSV" (secondary button)
  - Filter toggles:  Show Archived |  Show Terminated
  - "View As" dropdown (HR Admin only): "HR Admin " | Sodexo | ÖMC | Payroll | Toplux
- Search bar: " Search employees..." (full width, instant filter)

**Table Section:**
- Data table with columns (horizontal scroll if needed):
  - **Masterdata columns** (white background): First Name | Surname | SSN | Email | Mobile | Town District | Rank | Gender | Hire Date | Status
  - **Actions column** (sticky right): Edit | Archive | Terminate icons
- Row states:
  - Active: default styling
  - Terminated: grayed out with "Terminated" badge
  - Archived: hidden by default, shown with gray background when filter enabled
  - Hover: subtle background color change
- Column headers:
  - Clickable for sorting
  - Sort indicator:  ascending,  descending
  - Resizable (drag separator)
- Cells:
  - Editable cells: cursor changes on hover, click activates inline edit
  - Read-only cells: no hover effect
- Pagination: "Showing 1-50 of 247 employees" with next/prev buttons

**Empty State:**
- Centered illustration + text: "No employees found. Click 'Add Employee' to create your first record."

**Interaction Notes:**
- Table rows load with skeleton loaders initially
- Inline cell editing: click  input field  Enter saves, Esc cancels
- Column sorting: 1st click asc, 2nd desc, 3rd removes sort
- Search filters instantly (client-side for <1000 rows)
- Real-time updates highlight changed cells briefly

**Design File Reference:** [Figma - Dashboard Main] (to be created)

---

#### 3. Main Dashboard - Employee Table (External Party View - Sodexo)

**Purpose:** Limited view for external party to see permitted masterdata and manage custom columns

**Key Elements:**

**Header Section:** (Same as HR Admin but no "Admin" link)

**Toolbar Section:**
- Action buttons row:
  - "Add Column" (primary button)
  - "Manage Columns" (secondary button)
- Search bar: " Search employees..." (full width)

**Table Section:**
- Data table with columns:
  - **Masterdata columns** (light gray background, read-only): First Name | Surname | Email | Mobile | Hire Date
  - **Custom columns** (white background, editable): [User-created columns grouped by category]
    - Category header: "Recruitment Team" (visual separator)
      - Interview Date | Status | Notes
    - Category header: "Warehouse Team"
      - Training Complete | Safety Cert Date
- Column headers:
  - Masterdata: Lock icon  indicating read-only
  - Custom: No icon, editable
  - All sortable
- Cells:
  - Masterdata: light gray background, no hover effect, click shows tooltip "Read-only field. Contact HR to update."
  - Custom: white background, hover effect, click activates edit
  
**Interaction Notes:**
- Clear visual distinction between read-only masterdata (gray) and editable custom columns (white)
- Custom columns grouped by category with subtle separators/headers
- Empty custom column cells show placeholder hint "Click to add data"

**Design File Reference:** [Figma - Dashboard External Party] (to be created)

---

#### 4. Add Employee Modal (HR Admin)

**Purpose:** Form to create new employee record

**Key Elements:**
- Modal overlay (semi-transparent background)
- Modal card (600px width, centered, white background, shadow)
- Header: "Add New Employee" with close icon ()
- Form fields (two-column layout for space efficiency):
  - **Left column:**
    - First Name* (text input)
    - SSN* (text input, formatted)
    - Mobile (text input, phone format)
    - Rank (text input or dropdown if predefined)
    - Hire Date* (date picker)
  - **Right column:**
    - Surname* (text input)
    - Email* (email input)
    - Town District (text input)
    - Gender (dropdown: Male/Female/Other/Prefer not to say)
    - Comments (text area, spans both columns)
- Required field indicator: * with note "Required fields"
- Validation errors: inline below each field in red
- Footer buttons:
  - "Cancel" (secondary, left)
  - "Save Employee" (primary, right)

**Interaction Notes:**
- Focus first field on modal open
- Tab order follows logical flow
- Enter key doesn't submit (avoid accidental submission)
- Save button shows loading spinner during API call
- Success closes modal + shows toast
- Validation happens on blur and submit

**Design File Reference:** [Figma - Add Employee Modal] (to be created)

---

#### 5. Import CSV Modal (HR Admin)

**Purpose:** Bulk import employees from CSV file

**Key Elements:**
- Wide modal (800px width)
- Header: "Import Employees from CSV" with close icon
- **Step 1: Upload**
  - Drag-and-drop zone: "Drag CSV file here or click to browse"
  - File type hint: "Accepts .csv files"
  - Template download link: "Download CSV template"
- **Step 2: Preview** (after file selected)
  - File info: "employees_2025.csv (247 rows)"
  - Preview table: first 5 rows with detected columns
  - Column headers editable/mappable
- **Step 3: Map Columns**
  - Mapping interface:
    - CSV Column  Database Field
    - "First Name"  [Dropdown: first_name ]
    - "Social Security No."  [Dropdown: ssn ]
    - Auto-detect attempts to match by name similarity
  - Required field validation: highlight unmapped required fields
- **Step 4: Import**
  - Progress bar: "Importing 124 of 247 employees..."
  - Live status: " 120 successful |  4 errors"
- **Step 5: Results**
  - Summary: "Successfully imported 243 employees. 4 rows skipped due to errors."
  - Error report table: Row # | Error | Data
  - "Download Error Report" button
  - "Close" button

**Interaction Notes:**
- Multi-step wizard with clear progress indicator
- Can't proceed to next step until current step valid
- Large files show file size warning
- Errors display with row numbers for easy Excel reference

**Design File Reference:** [Figma - Import CSV Modal] (to be created)

---

#### 6. Important Dates Calendar

**Purpose:** Shared reference calendar for operational dates (Stena, ÖMC dates by week)

**Key Elements:**

**HR Admin View:**
- Header: "Important Dates" with "Add Date" button
- Filter: Dropdown "All Categories | Stena Dates | ÖMC Dates | Other"
- Table view:
  - Columns: Week # | Year | Category | Date Description | Date Value | Notes | Actions
  - Sortable by week number
  - Inline editing: click cell to edit
  - Actions: Edit | Delete icons
- Alternative: Toggle to calendar view (grid showing weeks with dates)

**External Party View:**
- Same layout but read-only (no "Add Date" button, no Actions column)
- Can view and search but not modify

**Add Date Modal:**
- Week Number (number input, optional)
- Year (number input, default current year)
- Category (dropdown: Stena Dates | ÖMC Dates | Other)
- Date Description (text: e.g., "Fredag 14/2")
- Date Value (text for flexible formats: "15-16/2")
- Notes (text area, optional)

**Interaction Notes:**
- Dates organized by week number for easy reference
- Category filtering helps users find relevant dates
- Flexible date value field accommodates various formats (ranges, multiple dates)

**Design File Reference:** [Figma - Important Dates] (to be created)

---

#### 7. Admin Panel - User Management (HR Admin Only)

**Purpose:** Create and manage user accounts with role assignment

**Key Elements:**
- Page header: "User Management"
- "Add User" button (primary, top right)
- Users table:
  - Columns: Email | Role | Status | Created Date | Actions
  - Role badges: color-coded (HR Admin=blue, Sodexo=green, ÖMC=purple, Payroll=orange, Toplux=yellow)
  - Status badges: Active (green) | Inactive (gray)
  - Actions: Deactivate/Activate | Reset Password
- Search/filter: "Search users..." + filter by role dropdown

**Add User Modal:**
- Email* (email input)
- Password* (password input with show/hide)
- Password confirmation* (password input)
- Role* (dropdown: HR Admin | Sodexo | ÖMC | Payroll | Toplux)
- Active (checkbox, default checked)
- Buttons: Cancel | Create User

**Success Modal:**
- "User created successfully"
- Display generated password: "Initial password: [password] - Copy to clipboard"
- Note: "Please share this password securely with the user."

**Interaction Notes:**
- Can't deactivate own account (button disabled with tooltip)
- Deactivate requires confirmation: "Deactivate [email]? They won't be able to log in."
- Password strength indicator during creation

**Design File Reference:** [Figma - User Management] (to be created)

---

#### 8. Admin Panel - Column Settings (HR Admin Only)

**Purpose:** Configure column-level view/edit permissions for each role

**Key Elements:**
- Page header: "Column Settings"
- Filter toggles:  Show Masterdata |  Show Custom | Filter by role dropdown
- Permissions table:
  - Columns: Column Name | Type | Category | Is Masterdata | HR Admin | Sodexo | ÖMC | Payroll | Toplux | Actions
  - For each role column, two toggles:
    -  View (eye icon toggle)
    -  Edit (pencil icon toggle)
  - HR Admin column: grayed out (always view+edit for masterdata)
  - Actions: Edit | Delete (custom columns only)
- Bulk actions:
  - "Select All External Parties" checkbox
  - "Apply View to Selected" button
  - "Apply Edit to Selected" button

**Permission Toggle Behavior:**
- Edit requires View (enabling Edit auto-enables View)
- Disabling View auto-disables Edit
- Visual feedback: tooltip on hover explaining permission

**Edit Column Modal** (for custom columns):
- Column Name (text input)
- Column Type (dropdown: Text | Number | Date | Boolean)
- Category (text input)
- Buttons: Cancel | Save Changes

**Interaction Notes:**
- Changes save immediately on toggle (optimistic UI with API call)
- Invalid states prevented (can't have Edit without View)
- Masterdata columns can't be deleted (delete button disabled)
- Custom column delete requires confirmation with warning about data loss

**Design File Reference:** [Figma - Column Settings] (to be created)

---

#### 9. View As Preview Mode (HR Admin)

**Purpose:** Preview exactly what external party roles see

**Key Elements:**
- **Preview Banner** (full width, prominent, yellow background):
  - Text: " Viewing as: Sodexo - Preview Mode"
  - "Exit Preview" button (right side)
- **Table changes:**
  - Columns filtered to role permissions
  - Edit actions disabled (grayed out)
  - Tooltip on edit attempt: "Editing disabled in preview mode"
- **Navigation changes:**
  - "Admin" menu hidden (simulates external party view)
  - Action buttons reflect role (e.g., "Add Column" visible for external parties)

**Interaction Notes:**
- Banner stays visible while scrolling (sticky)
- Switching roles updates instantly (client-side)
- Search and sort work normally (to test functionality)
- Exit Preview restores HR Admin view immediately

**Design File Reference:** [Figma - Preview Mode] (to be created)

---

## Component Library / Design System

### Design System Approach

**Use shadcn/ui with Tailwind CSS** - Leverage the shadcn/ui component library built on Radix UI primitives and styled with Tailwind CSS utility classes. This approach provides:

- Pre-built accessible components (modals, dropdowns, buttons, inputs)
- Customizable design tokens via Tailwind config
- Copy-paste component code (not npm dependency)
- Full control over styling and behavior
- TypeScript support out of the box
- Excellent documentation and community support

**No custom design system for MVP** - shadcn/ui provides sufficient components and consistency without requiring custom design system creation overhead.

### Core Components

#### Button Component

**Purpose:** Primary interactive element for actions

**Variants:**
- **Primary:** Solid background, high contrast (main actions: "Save", "Add Employee")
- **Secondary:** Outlined, lower emphasis (alternative actions: "Cancel", "Import CSV")
- **Ghost:** No border, minimal styling (tertiary actions, icon buttons)
- **Destructive:** Red color scheme (dangerous actions: "Delete", "Archive")

**States:**
- Default: base styling
- Hover: slightly darker background, cursor pointer
- Active/Pressed: darker background, slight scale down
- Focus: visible outline ring (accessibility)
- Disabled: reduced opacity, cursor not-allowed
- Loading: spinner icon replacing text/icon

**Usage Guidelines:**
- Primary button max 1 per screen section
- Button text uses action verbs ("Save" not "OK")
- Destructive actions always require confirmation
- Loading state prevents double-submission

---

#### Input Component

**Purpose:** Text entry fields for forms and inline editing

**Variants:**
- **Text:** Single-line text input (default)
- **Email:** Email validation and keyboard type
- **Number:** Numeric input with optional step controls
- **Date:** Date picker integration
- **TextArea:** Multi-line text input
- **Select/Dropdown:** Choice from predefined options

**States:**
- Default: neutral border
- Focus: highlighted border, visible ring
- Error: red border, error message below
- Disabled: grayed out, not interactive
- Read-only: locked appearance, copyable text

**Usage Guidelines:**
- Label always visible above input
- Required fields marked with asterisk (*)
- Placeholder text shows format example, not instructions
- Error messages specific and actionable ("Email must contain @")
- Validation on blur and submit, not on every keystroke

---

#### Table Component

**Purpose:** Display structured employee data in grid format (TanStack Table)

**Variants:**
- **Standard:** Basic row/column layout
- **Editable:** Inline cell editing capability
- **Sortable:** Clickable column headers with sort indicators
- **Filterable:** Search/filter integration

**States:**
- Loading: Skeleton rows with pulse animation
- Empty: Centered empty state message with illustration
- Error: Error message with retry button
- Row Hover: Subtle background color change
- Selected Row: Highlighted background (for bulk operations - future)
- Updated Cell: Brief highlight pulse animation (real-time updates)

**Usage Guidelines:**
- Horizontal scroll acceptable for many columns (desktop-first)
- Sticky header on vertical scroll
- Minimum column width for readability (avoid cramped text)
- Sort indicators clear ( icons)
- Cell editing activates on single click, not double-click
- Empty cells show placeholder hint on hover

---

#### Modal/Dialog Component

**Purpose:** Overlay for focused tasks and forms

**Variants:**
- **Small:** Simple confirmations (400px)
- **Medium:** Forms with 5-10 fields (600px)
- **Large:** Complex workflows like CSV import (800px)
- **Full-screen:** Rare, for very complex tasks (avoid in MVP)

**States:**
- Open: Visible with backdrop overlay
- Closing: Fade-out animation
- Loading: Internal content loading state

**Usage Guidelines:**
- Always closeable via X button, Esc key, backdrop click
- Focus trapped within modal (keyboard accessibility)
- Primary action right-aligned, secondary left-aligned
- Confirm before close if form is dirty (has unsaved changes)
- Max one modal open at a time (no stacking)

---

#### Toast Notification Component

**Purpose:** Non-blocking feedback for background operations

**Variants:**
- **Success:** Green with checkmark icon
- **Error:** Red with X icon
- **Warning:** Yellow with ! icon
- **Info:** Blue with i icon

**States:**
- Appearing: Slide in from top-right
- Visible: Full opacity for 4-6 seconds
- Dismissing: Fade out animation
- Dismissed: Removed from DOM

**Usage Guidelines:**
- Auto-dismiss after 4-6 seconds (success/info) or 8 seconds (error/warning)
- Manually dismissible via X button
- Stack vertically if multiple toasts
- Keep message concise (1-2 lines max)
- Include action link if applicable ("Undo", "View Details")

---

#### Badge Component

**Purpose:** Status indicators and labels

**Variants:**
- **Role badges:** Color-coded by role (HR Admin, Sodexo, ÖMC, Payroll, Toplux)
- **Status badges:** Active (green), Inactive (gray), Terminated (red)
- **Column type badges:** Masterdata, Custom

**States:**
- Static (not interactive)

**Usage Guidelines:**
- Use consistent colors across application
- Keep text short (1-2 words)
- Sufficient contrast for WCAG AA
- Icon optional for clarity ( Active,  Inactive)

---

## Branding & Style Guide

### Visual Identity

**Brand Guidelines:** Minimal corporate branding - focus on clarity and professionalism

The HR Masterdata Management System uses a clean, neutral design language that emphasizes usability over brand identity. No specific company branding requirements for MVP. Future iterations may incorporate company logo and colors as requested.

### Color Palette

| Color Type | Hex Code | Usage |
|------------|----------|-------|
| **Primary** | #3B82F6 | Primary buttons, links, focus states, HR Admin role badge |
| **Primary Dark** | #2563EB | Primary button hover, active states |
| **Secondary** | #64748B | Secondary buttons, icons, borders, labels |
| **Accent** | #8B5CF6 | ÖMC role badge, special highlights |
| **Success** | #10B981 | Success messages, Active status, Sodexo role badge |
| **Warning** | #F59E0B | Warnings, important notices, Toplux role badge |
| **Error** | #EF4444 | Errors, destructive actions, Terminated status, validation errors |
| **Neutral 50** | #F8FAFC | Table row alternate background, page background |
| **Neutral 100** | #F1F5F9 | Read-only cell background, disabled elements |
| **Neutral 200** | #E2E8F0 | Borders, dividers |
| **Neutral 500** | #64748B | Secondary text, placeholders |
| **Neutral 900** | #0F172A | Primary text, headings |
| **Payroll Orange** | #F97316 | Payroll role badge |
| **White** | #FFFFFF | Editable cell background, card backgrounds |

**Color Accessibility:**
- All text colors meet WCAG AA contrast ratio (4.5:1 minimum)
- Interactive elements have 3:1 contrast against background
- Status colors distinguishable for color-blind users (use icons + text)

### Typography

#### Font Families

- **Primary:** Inter (sans-serif) - Clean, modern, excellent readability for UI
- **Secondary:** (same as primary for consistency)
- **Monospace:** JetBrains Mono - For code, SSN, or technical data (optional)

**Font Loading:** Use system font stack fallback for performance
\\\css
font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
\\\

#### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| **H1** | 2rem (32px) | 700 (Bold) | 1.2 (38px) | Page titles (rarely used) |
| **H2** | 1.5rem (24px) | 600 (Semibold) | 1.3 (31px) | Section headers, modal titles |
| **H3** | 1.25rem (20px) | 600 (Semibold) | 1.4 (28px) | Subsection headers |
| **Body** | 1rem (16px) | 400 (Regular) | 1.5 (24px) | Paragraph text, table cells |
| **Body Bold** | 1rem (16px) | 600 (Semibold) | 1.5 (24px) | Emphasis, labels |
| **Small** | 0.875rem (14px) | 400 (Regular) | 1.5 (21px) | Helper text, captions, timestamps |
| **Tiny** | 0.75rem (12px) | 500 (Medium) | 1.4 (17px) | Badges, table column headers (uppercase) |

**Typography Guidelines:**
- Never use font size below 12px for accessibility
- Maintain consistent hierarchy across screens
- Use font weight for emphasis rather than color
- Adequate line height for readability (minimum 1.5 for body text)

### Iconography

**Icon Library:** Lucide Icons (or Heroicons) - Consistent, modern, open-source

**Icon Set Examples:**
-  Search (magnifying glass)
-  Add (plus)
-  Edit (pencil)
-  Delete (trash)
-  Archive (archive box)
-  Lock (for read-only)
-  View (eye)
-  Sort indicators (arrows)
-  Success (checkmark)
-  Error (X)
-  Warning (exclamation triangle)
- ℹ Info (info circle)
-  User profile
-  Logout
-  Settings

**Usage Guidelines:**
- Icons 16px or 20px size in UI, 24px in headers
- Use stroke icons (not filled) for consistency
- Pair icons with text labels for clarity (especially for destructive actions)
- Ensure sufficient contrast (same as text requirements)
- Use aria-label for icon-only buttons (accessibility)

### Spacing & Layout

**Grid System:** 12-column responsive grid (Tailwind's default)

**Container Widths:**
- Max width: 1280px (centered)
- Padding: 1rem (16px) on mobile, 2rem (32px) on desktop

**Spacing Scale** (Tailwind default, based on 0.25rem = 4px increments):
- **xs:** 0.25rem (4px) - Tight spacing, icon-text gaps
- **sm:** 0.5rem (8px) - Small gaps, compact layouts
- **md:** 1rem (16px) - Default spacing, form field gaps
- **lg:** 1.5rem (24px) - Section spacing, card padding
- **xl:** 2rem (32px) - Large section gaps
- **2xl:** 3rem (48px) - Major section separation

**Layout Guidelines:**
- Consistent vertical rhythm (use spacing scale)
- White space improves readability (don't cram)
- Card/panel padding: 1.5rem minimum
- Button padding: 0.5rem vertical, 1rem horizontal
- Form field gaps: 1rem minimum
- Section gaps: 2rem minimum

---

## Accessibility Requirements

### Compliance Target

**Standard:** WCAG 2.1 Level AA

This level ensures the application is usable by people with a wide range of disabilities including visual, auditory, motor, and cognitive impairments while remaining practical to implement for MVP.

### Key Requirements

**Visual:**
- **Color contrast ratios:** 
  - Normal text (16px): minimum 4.5:1 against background
  - Large text (24px+): minimum 3:1 against background
  - UI components and graphics: minimum 3:1 against adjacent colors
  - Use WebAIM Contrast Checker during design
- **Focus indicators:** 
  - Visible focus outline on all interactive elements (2px solid ring)
  - Focus order follows logical reading order (top-to-bottom, left-to-right)
  - Focus never trapped except in modals (with Esc key exit)
- **Text sizing:** 
  - Text resizable up to 200% without loss of functionality
  - Use relative units (rem, em) not fixed pixels
  - No horizontal scrolling required at 200% zoom on desktop

**Interaction:**
- **Keyboard navigation:** 
  - All functionality available via keyboard (no mouse-only interactions)
  - Tab key navigates between interactive elements
  - Enter/Space activates buttons and toggles
  - Arrow keys navigate within components (table cells, dropdowns)
  - Esc key closes modals, cancels edits
  - Skip links to main content (for screen reader users)
- **Screen reader support:** 
  - Semantic HTML5 elements (nav, main, article, aside, header, footer)
  - ARIA labels for icon-only buttons and complex widgets
  - ARIA live regions for dynamic content updates (table changes, toast notifications)
  - Form labels properly associated with inputs
  - Table headers properly marked with <th> and scope attributes
  - Error messages announced to screen readers
- **Touch targets:** 
  - Minimum size 44x44px for interactive elements (WCAG AAA guideline, important for motor impairments)
  - Adequate spacing between touch targets (8px minimum)

**Content:**
- **Alternative text:** 
  - Descriptive alt text for all informational images
  - Decorative images marked with empty alt="" 
  - Icon buttons have aria-label describing action
- **Heading structure:** 
  - Logical heading hierarchy (don't skip levels)
  - One H1 per page (page title)
  - Headings used for structure, not styling
- **Form labels:** 
  - Every input has associated <label>
  - Required fields marked with aria-required="true" and visual indicator (*)
  - Validation errors linked to fields with aria-describedby
  - Fieldsets and legends for grouped inputs (radio, checkbox groups)

### Testing Strategy

**Manual Testing:**
1. **Keyboard-only navigation test:** Navigate entire application using only keyboard (no mouse)
2. **Screen reader test:** Test with NVDA (Windows) or VoiceOver (Mac)
3. **Color contrast audit:** Use browser DevTools or WebAIM checker
4. **Zoom test:** Test at 200% browser zoom, verify no horizontal scroll
5. **Focus visibility test:** Tab through all interactive elements, verify visible focus

**Automated Testing:**
- Run axe DevTools or Lighthouse accessibility audits during development
- Integrate @axe-core/react in component tests
- Set CI/CD to fail on critical accessibility violations

**Testing Schedule:**
- Run automated tests on every commit (CI/CD)
- Manual testing weekly during development sprints
- Full accessibility audit before UAT handoff
- Re-test after any major UI changes

**Acceptance Criteria:**
- Zero critical/serious axe-core violations
- All manual test scenarios pass
- Lighthouse accessibility score >90

---

## Responsiveness Strategy

### Breakpoints

| Breakpoint | Min Width | Max Width | Target Devices | Notes |
|------------|-----------|-----------|----------------|-------|
| **Mobile** | 0px | 767px | Phones | Not prioritized for MVP (table editing impractical) |
| **Tablet** | 768px | 1023px | iPad, tablets in landscape | View-only optimized, limited editing |
| **Desktop** | 1024px | 1439px | Laptops, small desktops | Primary target, full functionality |
| **Wide** | 1440px | - | Large desktops, external monitors | Enhanced experience, more columns visible |

### Adaptation Patterns

**Layout Changes:**
- **Desktop (1024px+):** 
  - Full table with all columns visible or horizontal scroll
  - Two-column modal forms
  - Side-by-side layouts (table + filters)
  - Max container width 1280px, centered
- **Tablet (768-1023px):**
  - Table with horizontal scroll (acceptable)
  - Single-column modal forms
  - Stacked layouts (filters above table)
  - Reduced padding and margins
- **Mobile (<768px):**
  - Display message: "For best experience, please use a desktop browser (1024px+ screen width)"
  - Optional: Show minimal read-only list view (employee names, basic info)
  - Redirect to desktop browser if possible
  - No editing functionality on mobile for MVP

**Navigation Changes:**
- **Desktop:** Full horizontal navigation bar
- **Tablet:** Horizontal nav with text labels
- **Mobile:** Hamburger menu (if mobile view supported post-MVP)

**Content Priority:**
- **Desktop:** Show all available columns
- **Tablet:** Show essential columns, hide optional columns (e.g., Comments, Town District)
- **Mobile:** Show name + 2-3 most critical fields only

**Interaction Changes:**
- **Desktop:** 
  - Mouse hover effects active
  - Click-to-edit cells
  - Keyboard navigation optimized
- **Tablet:** 
  - Touch-optimized targets (44px minimum)
  - Tap-to-edit cells
  - Virtual keyboard considerations
- **Mobile:** 
  - Minimal interaction (view-only)
  - Large touch targets
  - Simplified gestures

---

## Animation & Micro-interactions

### Motion Principles

**Purpose-driven motion:** Animations serve functional purposes (provide feedback, guide attention, indicate relationships) rather than decoration

**Performance-conscious:** All animations GPU-accelerated (transform, opacity) to maintain 60fps; avoid animating layout properties (width, height, top, left)

**Respectful of user preferences:** Honor prefers-reduced-motion media query for users with vestibular disorders or motion sensitivity

**Consistent timing:** Use standard durations and easing functions across the application

### Key Animations

**1. Page Transitions**
- **Description:** Fade in main content on route change
- **Duration:** 200ms
- **Easing:** ease-out
- **Implementation:** Opacity 0  1 on component mount

**2. Modal/Dialog Appearance**
- **Description:** Modal fades in with subtle scale-up, backdrop fades in
- **Duration:** 150ms modal, 200ms backdrop
- **Easing:** ease-out
- **Implementation:** Scale 0.95  1, opacity 0  1

**3. Toast Notification Slide-in**
- **Description:** Toast slides in from top-right corner
- **Duration:** 300ms
- **Easing:** ease-out
- **Implementation:** TranslateX(100%)  translateX(0), opacity 0  1

**4. Table Row Highlight (Real-time Update)**
- **Description:** Brief color pulse when row data updates
- **Duration:** 1000ms
- **Easing:** ease-in-out
- **Implementation:** Background color: white  light blue  white (keyframe animation)

**5. Button Loading State**
- **Description:** Spinner rotation inside button
- **Duration:** Infinite (while loading)
- **Easing:** linear
- **Implementation:** Rotate 360deg continuously

**6. Skeleton Loader Pulse**
- **Description:** Shimmer effect on loading placeholders
- **Duration:** 1500ms
- **Easing:** ease-in-out
- **Implementation:** Background position animation (gradient shimmer)

**7. Dropdown Menu Expand**
- **Description:** Menu slides down and fades in
- **Duration:** 150ms
- **Easing:** ease-out
- **Implementation:** TranslateY(-10px)  translateY(0), opacity 0  1

**8. Cell Edit Mode Transition**
- **Description:** Subtle border highlight when cell enters edit mode
- **Duration:** 100ms
- **Easing:** ease-out
- **Implementation:** Border color transition to primary color

**9. Sort Indicator Flip**
- **Description:** Arrow icon rotates when sort direction changes
- **Duration:** 200ms
- **Easing:** ease-in-out
- **Implementation:** Rotate 0deg  180deg

**10. Hover State Transitions**
- **Description:** Smooth background color change on button/row hover
- **Duration:** 150ms
- **Easing:** ease-in-out
- **Implementation:** Background color transition

---

## Performance Considerations

### Performance Goals

- **Page Load:** Initial dashboard load under 2 seconds on 4G connection (1,000 employee records)
- **Interaction Response:** UI responds to user input within 100ms (perceived as instant)
- **Animation FPS:** Maintain 60fps for all animations and scrolling
- **Real-time Sync:** Data updates appear within 2 seconds of database change
- **Table Rendering:** Render 1,000 rows without UI lag (virtual scrolling if needed)

### Design Strategies

**1. Lazy Loading & Code Splitting**
- Load admin panel components only for HR Admin role
- Lazy load modals (don't include in initial bundle)
- Split vendor libraries (React, TanStack Table) into separate chunks
- **UX Impact:** Modals may have 50-100ms delay on first open (acceptable)

**2. Virtual Scrolling for Large Tables**
- Render only visible rows + buffer (e.g., 50 rows at a time)
- Use TanStack Virtual or react-window
- **UX Impact:** Smooth scrolling even with 10,000+ rows, minimal memory usage

**3. Optimistic UI Updates**
- Update UI immediately on user action, rollback if API fails
- Show inline spinner for async operations
- **UX Impact:** Feels instant, errors handled gracefully with rollback + message

**4. Debounced Search**
- Delay search execution by 300ms after user stops typing
- Reduces unnecessary filtering on every keystroke
- **UX Impact:** Feels responsive while reducing computation

**5. Skeleton Loading States**
- Show content placeholders while data loads
- Better perceived performance than blank screen or spinner
- **UX Impact:** User knows content is coming, maintains context

**6. Image Optimization** (if applicable post-MVP)
- Use WebP format with fallbacks
- Lazy load images below fold
- Responsive images with srcset
- **UX Impact:** Faster load times, especially on slower connections

**7. Minimize Re-renders**
- Memoize table components with React.memo
- Use useCallback for event handlers
- Optimize Supabase subscriptions to update only changed rows
- **UX Impact:** Smooth real-time updates without jank

**8. Critical CSS Inline**
- Inline above-fold CSS in initial HTML
- Load full stylesheet asynchronously
- **UX Impact:** Faster first contentful paint

---

## Next Steps

### Immediate Actions

1. **Review and approve UX specification** with stakeholders (PM, Tech Lead, HR representative)
2. **Create detailed wireframes in Figma** for all key screens (login, dashboard variants, modals)
3. **Build interactive prototype** in Figma for user testing (optional but recommended)
4. **Conduct usability testing** with 2-3 representative users (1 HR Admin, 2 external party users)
5. **Refine designs** based on feedback and finalize Figma designs
6. **Hand off to Frontend Architect** for technical implementation planning
7. **Create component library in code** using shadcn/ui + Tailwind CSS
8. **Begin development** starting with Epic 1 (Foundation & Authentication)

### Design Handoff Checklist

- [x] All user flows documented with edge cases
- [x] Component inventory complete (buttons, inputs, tables, modals, badges)
- [x] Accessibility requirements defined (WCAG AA target, keyboard nav, screen readers)
- [x] Responsive strategy clear (desktop-first, breakpoints defined)
- [x] Brand guidelines incorporated (minimal branding, color palette, typography)
- [x] Performance goals established (2s load, 60fps animations, 2s real-time sync)
- [ ] Figma wireframes created (to be completed next)
- [ ] Interactive prototype built (optional, recommended for complex flows)
- [ ] Usability testing conducted (before development starts)
- [ ] Design system components implemented in code (shadcn/ui setup)
- [ ] Handoff meeting scheduled with Frontend Architect

---

## Appendix: Key UX Decisions & Rationale

**Decision 1: Desktop-First, Not Mobile-Responsive**
- **Rationale:** Table editing with many columns is impractical on mobile screens. Users are HR professionals and department managers working from desks. Excel (current tool) is also desktop-only. Mobile access adds complexity without clear user value for MVP.
- **Trade-off:** Excludes mobile users, but saves significant development time and maintains usability.

**Decision 2: TanStack Table Over AG Grid**
- **Rationale:** TanStack Table is lightweight, flexible, free (MIT license), and integrates well with React. AG Grid has more features but complex licensing and larger bundle size. MVP feature set doesn't require AG Grid's advanced capabilities.
- **Trade-off:** May need to build custom features (e.g., advanced filtering) that AG Grid provides out-of-box. Re-evaluate if requirements expand significantly.

**Decision 3: Inline Cell Editing (Excel-Style) Over Form-Based Editing**
- **Rationale:** Matches user's Excel mental model, reduces clicks, feels efficient for power users. Users explicitly requested "Excel-like" interactions per PRD NFR12.
- **Trade-off:** More complex to implement (state management, validation), potential accessibility challenges (mitigated with proper ARIA labels and keyboard support).

**Decision 4: Real-Time Updates Over Polling**
- **Rationale:** Better user experience (instant updates), lower server load (Supabase real-time is efficient), explicitly required by PRD NFR4 (<2s sync).
- **Trade-off:** Requires WebSocket connection management, fallback strategy for connection failures. Added technical complexity worth the UX benefit.

**Decision 5: Modal-Based Forms Over In-Page Forms**
- **Rationale:** Focuses user attention, keeps dashboard clean, clearly separates "view mode" from "edit mode". Standard pattern for complex forms (create employee, import CSV, add column).
- **Trade-off:** Modals can feel disruptive. Mitigated by keeping modals dismissable and remembering scroll position.

**Decision 6: Role Preview Mode Client-Side Only**
- **Rationale:** Faster (no API call), simpler (no database state), safe (can't accidentally modify as wrong role). HR Admin just needs to verify column visibility configuration.
- **Trade-off:** Doesn't test API-level permissions. Mitigated by proper RLS policies in database (defense in depth).

**Decision 7: Category Grouping for Custom Columns (Visual Only)**
- **Rationale:** Helps external parties organize their data logically, improves scannability for tables with many custom columns. No database impact (purely UI).
- **Trade-off:** Adds slight complexity to table rendering. Visual separators may make table feel cluttered if overused (limit to 2-3 categories recommended).

**Decision 8: Toast Notifications Over Alert Dialogs for Success Messages**
- **Rationale:** Non-blocking, less disruptive, modern UX pattern. Users can continue working while seeing confirmation. Error dialogs block when user action is required.
- **Trade-off:** Users may miss toast if looking away. Mitigated by appropriate duration (6 seconds) and sound (optional, accessibility consideration).

---

*End of UI/UX Specification Document*
