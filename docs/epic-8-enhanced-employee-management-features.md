# Epic 8: Enhanced Employee Management Features

## Epic Goal

Implement advanced operational features for employee lifecycle management including controlled enum values, visual status tracking, conditional field logic, important dates capacity management, and automated room assignment to support production HR workflows at Stena Line.

## Background

Following completion of Epic 7 (Initial Setup & Production Readiness), stakeholder feedback has identified critical operational features required for full production deployment. These features enhance the existing employee management system with business logic for completion tracking, capacity management for training dates, and automated workflows that reduce manual data entry and prevent booking conflicts.

The current system successfully manages basic employee data and important dates, but lacks:

1. Data validation constraints (gender/rank are free text, causing inconsistencies)
2. Visual completion indicators (HR cannot quickly scan which fields are complete)
3. Business rule enforcement (fields that depend on other fields being completed first)
4. Capacity management (training dates can be overbooked)
5. Automated room assignments (manual process prone to errors)
6. Repayment tracking for terminated employees (financial reconciliation requirement)

This epic addresses all production readiness blockers for operational workflows.

## Success Criteria

- Gender restricted to "Man"/"Woman" enum values
- Rank restricted to "SEV"/"CHEF" enum values
- 11 boolean masterdata fields display green badges when true
- One field shows yellow badge for 24 hours, then green
- Talmundo field only editable when One is green (24+ hours)
- Crewing/Done field only editable when all 10 prerequisite fields are true
- Lönenivå accepts values 0-7 with green badge when set
- Important dates track max_spots, remaining_spots, and assigned employees
- Date dropdowns show remaining capacity and prevent overbooking
- ÖMC dates support two-day format (e.g., "8-9th March")
- PE3 dates support time-of-day selection (HH:MM)
- Important dates have deadline_cancel and deadline_submit columns
- PE3 import automatically calculates deadlines
- Terminated employees have repayment tracking fields
- Termination clears dates and updates capacity
- Hotel required field captured during employee creation
- Room numbers automatically assigned based on business rules
- All features fully tested and documented

## Dependencies

- **Epic 2:** Employee management core (CRUD operations)
- **Epic 6:** Employee form enhancements (validation infrastructure)
- **Epic 7:** Comprehensive masterdata columns (One, ISP, Photo, etc. already exist)
- **Story 2.8:** Important dates table exists
- **Story 6.1:** Employee date fields (stena_date, omc_date, pe3_date) exist

## Stories

### Story 8.1: Gender & Rank Enum Restrictions

**As an** HR Admin  
**I want** gender and rank to be restricted dropdown selections  
**So that** data is consistent and reporting is accurate

#### Acceptance Criteria

1.  Gender field changes from free text to dropdown with options: "Man", "Woman"
2.  Rank field changes from free text to dropdown with options: "SEV", "CHEF"
3.  Database migration converts existing TEXT columns to appropriate enum constraint types
4.  Employee create form displays dropdowns instead of text inputs for gender and rank
5.  Employee edit mode displays dropdowns for inline editing of gender and rank
6.  Existing data is validated during migration (invalid values converted to default or flagged)
7.  API validation enforces enum values on create/update operations
8.  Translation keys added: "Man" = "Man" (EN/SV), "Woman" = "Kvinna", "SEV" = "SEV", "CHEF" = "Chef"
9.  Sorting and filtering work correctly with enum values
10. CSV import validates enum values and shows errors for invalid entries
11. Export displays enum values in readable format
12. Database constraints prevent invalid values at schema level

#### Technical Notes

**Database Migration:**

```sql
-- Convert gender to CHECK constraint
ALTER TABLE employees
DROP CONSTRAINT IF EXISTS employees_gender_check;

ALTER TABLE employees
ADD CONSTRAINT employees_gender_check
CHECK (gender IN ('Man', 'Woman') OR gender IS NULL);

-- Convert rank to CHECK constraint
ALTER TABLE employees
DROP CONSTRAINT IF EXISTS employees_rank_check;

ALTER TABLE employees
ADD CONSTRAINT employees_rank_check
CHECK (rank IN ('SEV', 'CHEF') OR rank IS NULL);

-- Update existing invalid data (optional - or flag for manual review)
UPDATE employees SET gender = 'Man' WHERE gender NOT IN ('Man', 'Woman') AND gender IS NOT NULL;
UPDATE employees SET rank = 'SEV' WHERE rank NOT IN ('SEV', 'CHEF') AND rank IS NOT NULL;
```

**UI Components:**

- Update `add-employee-modal.tsx` to use Select component for gender/rank
- Update `employee-table.tsx` editable cell rendering to use dropdown for gender/rank
- Add translation keys to `messages/en.json` and `messages/sv.json`

#### Dependencies

None (foundational story)

---

### Story 8.2: Visual Status Indicators for Boolean Fields

**As an** HR Admin  
**I want** boolean completion fields to show green badges when true  
**So that** I can quickly scan employee completion status

#### Acceptance Criteria

1. ✅ The following fields display green badge when true: ISP, Photo, Origo, Mail, lön, Bankuppgifter, LI, Passport, Kvitto C17/18, C17
2. ✅ Badge displays "✓" checkmark icon with green background (`bg-green-100 text-green-800 border border-green-300`)
3. ✅ Badge appears inline next to field value in employee table
4. ✅ Badge does not display when field is false or null
5. ✅ Crewing/Done field displays green badge when true (additional logic in Story 8.5)
6. ✅ Badge is accessible with proper ARIA labels for screen readers (`aria-label="Completed"`)
7. ✅ Badge styling matches Stena Line design system colors
8. ✅ Mobile/responsive view displays badges with appropriate sizing
9. ✅ Print view includes badge status in readable format
10. ✅ Export to CSV includes boolean status as "Yes"/"No" or "Completed"/"Not Completed"
11. ✅ Visual consistency: all green badges use same styling
12. ✅ Performance: badge rendering doesn't degrade table performance with 1000+ rows

#### Technical Notes

**New Component:** `src/components/dashboard/status-badge.tsx`

```typescript
interface StatusBadgeProps {
  status: 'green' | 'yellow' | null;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  if (!status) return null;

  const styles = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${styles[status]}`} aria-label={label}>
      {status === 'green' ? '✓' : '⚠'}
    </span>
  );
}
```

**Integration:** Update `employee-table.tsx` cell rendering to include StatusBadge for boolean fields

#### Dependencies

- Story 8.1 (boolean column types must be established)

---

### Story 8.3: One Field Time-Based Status Logic

**As an** HR Admin  
**I want** the One field to show yellow for 24 hours then turn green  
**So that** I know when the mandatory waiting period has elapsed

#### Acceptance Criteria

1. Database adds `one_marked_at` TIMESTAMPTZ column to employees table
2. When One field is set to true, record current timestamp in `one_marked_at`
3. Display yellow badge (" Pending") when One=true and < 24 hours elapsed since `one_marked_at`
4. Display green badge (" Complete") when One=true and >= 24 hours elapsed
5. Badge updates automatically via polling (every 60 seconds) or real-time subscription
6. Tooltip on yellow badge shows "Pending - Will be ready in X hours"
7. If One field is set to false, clear `one_marked_at` timestamp
8. If One field is toggled true false true, reset `one_marked_at` to new timestamp
9. Time calculation accounts for timezone differences correctly (use UTC)
10. API endpoint returns current status (yellow/green) based on elapsed time calculation
11. Client-side logic calculates status in real-time for immediate feedback
12. Edge case: Handle clock skew and daylight savings time correctly

#### Technical Notes

**Database Migration:**
`sql
ALTER TABLE employees ADD COLUMN one_marked_at TIMESTAMPTZ;
`

**Business Logic Service:** `src/lib/services/one-field-status.ts`
``typescript
export function getOneFieldStatus(oneValue: boolean, markedAt: Date | null): 'green' | 'yellow' | null {
if (!oneValue) return null;
if (!markedAt) return 'yellow'; // Just marked, hasn't been saved yet

const now = new Date();
const elapsed = now.getTime() - markedAt.getTime();
const twentyFourHours = 24 _ 60 _ 60 \* 1000;

return elapsed >= twentyFourHours ? 'green' : 'yellow';
}

export function getRemainingTime(markedAt: Date): string {
const now = new Date();
const elapsed = now.getTime() - markedAt.getTime();
const twentyFourHours = 24 _ 60 _ 60 \* 1000;
const remaining = twentyFourHours - elapsed;

if (remaining <= 0) return 'Ready';

const hours = Math.floor(remaining / (60 _ 60 _ 1000));
const minutes = Math.floor((remaining % (60 _ 60 _ 1000)) / (60 \* 1000));

return `h m`;
}
``

#### Dependencies

- Story 8.2 (StatusBadge component)

---

### Story 8.4: Talmundo Field with Conditional Editability

**As an** HR Admin  
**I want** Talmundo field to only be editable when One is green (24+ hours)  
**So that** I enforce the correct operational sequence

#### Acceptance Criteria

1. Database adds `talmundo` BOOLEAN column to employees table
2. Talmundo field displays in employee table for HR Admin role
3. Talmundo field is disabled (grayed out, no click action) when One field is false
4. Talmundo field is disabled when One field is yellow (< 24 hours elapsed)
5. Talmundo field is enabled (clickable, editable) when One field is green (>= 24 hours)
6. Tooltip on disabled Talmundo shows: "Can only be edited after One field is green (24+ hours)"
7. When enabled and set to true, display green badge (" Complete")
8. API validation prevents editing Talmundo unless One is true and >= 24 hours elapsed
9. Employee create form shows Talmundo field as disabled by default (since One is false)
10. Form validation provides clear error message if user attempts to bypass client-side validation
11. Column Settings allows HR Admin to show/hide Talmundo column
12. Talmundo field seeds into column_config with is_masterdata=true, HR Admin only

#### Technical Notes

**Database Migration:**
``sql
ALTER TABLE employees ADD COLUMN talmundo BOOLEAN DEFAULT FALSE;

-- Add to column_config
INSERT INTO column_config (column_name, column_type, is_masterdata, role_permissions, display_order)
VALUES ('Talmundo', 'boolean', true, '{"hr_admin": {"view": true, "edit": true}}', 30);
``

**Conditional Rendering:** Update editable cell component to check One field status before enabling

#### Dependencies

- Story 8.3 (One field status logic must be implemented)

---

### Story 8.5: Crewing/Done Field Conditional Logic

**As an** HR Admin  
**I want** Crewing/Done to only be editable when all prerequisite fields are completed  
**So that** I enforce completion requirements before marking as crew-ready

#### Acceptance Criteria

1. Crewing/Done field is disabled unless ALL of the following are true: ISP, Photo, Origo, Mail, lön, Bankuppgifter, LI, Passport, Kvitto C17/18, C17 (10 fields total)
2. Visual indicator shows which fields are incomplete when Crewing/Done is disabled
3. Tooltip on disabled Crewing/Done lists incomplete prerequisite fields
4. When all prerequisites are met, Crewing/Done becomes editable
5. When Crewing/Done is set to true, display green badge (" Complete")
6. API validation enforces prerequisite check before allowing Crewing/Done update (server-side validation)
7. If any prerequisite field is later set to false, Crewing/Done field becomes disabled but value remains unchanged
8. Employee table visually indicates which employees are crew-ready (Crewing/Done = true)
9. Filtering by "Crew Ready" status works correctly
10. Export includes Crewing/Done status and prerequisite completion summary
11. Performance: prerequisite checking doesn't degrade table rendering
12. Real-time: prerequisite status updates immediately when any required field changes

#### Technical Notes

**Business Logic Service:** `src/lib/services/crewing-validation.ts`
``typescript
export function canEditCrewingDone(employee: Partial<Employee>): boolean {
const requiredFields = ['isps', 'photo', 'origo', 'mail_lon', 'lon', 'bankuppgifter', 'li', 'passport', 'kvitto_c17_18', 'c17'];
return requiredFields.every(field => employee[field] === true);
}

export function getIncompleteFields(employee: Partial<Employee>): string[] {
const requiredFields = {
isps: 'ISP',
photo: 'Photo',
origo: 'Origo',
mail_lon: 'Mail',
lon: 'lön',
bankuppgifter: 'Bankuppgifter',
li: 'LI',
passport: 'Passport',
kvitto_c17_18: 'Kvitto C17/18',
c17: 'C17'
};

return Object.entries(requiredFields)
.filter(([key]) => employee[key] !== true)
.map(([_, label]) => label);
}
``

#### Dependencies

- Story 8.2 (StatusBadge component, boolean field rendering)

---

### Story 8.6: Lönenivå Enum Field with Visual Indicator

**As an** HR Admin  
**I want** Lönenivå to accept numerical values 0-7 and show green when set  
**So that** salary level is properly tracked with clear visual confirmation

#### Acceptance Criteria

1. Database converts `loneiva` from TEXT to INTEGER with CHECK constraint (0-7, or NULL)
2. Employee form displays Lönenivå as dropdown with options: [Empty], 0, 1, 2, 3, 4, 5, 6, 7
3. Field defaults to null/empty when creating new employee
4. When non-null value is selected (0-7), display green badge
5. Empty/null value displays no badge
6. Dropdown allows quick selection (keyboard navigation works)
7. API validation enforces 0-7 range or NULL
8. Existing data migration handles invalid values (convert non-numeric to NULL)
9. Translation keys for "Lönenivå" = "Salary Level" (EN) / "Lönenivå" (SV)
10. Sorting by Lönenivå works correctly (0,1,2...7, then NULL values at end)
11. Export displays Lönenivå value or "Not Set" for NULL
12. Column Settings allows toggling Lönenivå visibility

#### Technical Notes

**Database Migration:**
``sql
-- Convert loneiva to INTEGER with constraint
ALTER TABLE employees ALTER COLUMN loneiva TYPE INTEGER USING loneiva::integer;

ALTER TABLE employees
ADD CONSTRAINT employees_loneiva_check
CHECK (loneiva >= 0 AND loneiva <= 7 OR loneiva IS NULL);

-- Clean up invalid data
UPDATE employees SET loneiva = NULL WHERE loneiva < 0 OR loneiva > 7;
``

#### Dependencies

- Story 8.2 (StatusBadge component)

---

### Story 8.7: Important Dates Capacity Management

**As an** HR Admin  
**I want** important dates to track max_spots and remaining_spots  
**So that** I prevent overbooking training dates

#### Acceptance Criteria

1. Database adds `max_spots` INTEGER and `remaining_spots` INTEGER columns to important_dates table
2. Default values based on category: ÖMC=20, Stena=99, PE3=1
3. When creating new important date, `remaining_spots` initializes to `max_spots` value
4. When employee is assigned to a date (omc_date, stena_date, or pe3_date), decrement `remaining_spots` by 1
5. When employee's date is changed or cleared, increment `remaining_spots` for old date by 1
6. Transaction handling ensures concurrency safety (use row-level locks, no negative remaining_spots allowed)
7. Important Dates table displays max_spots and remaining_spots columns (sortable)
8. Visual warning when remaining_spots reaches 0 (red badge "Full" or "Fully Booked")
9. Visual warning when remaining_spots < 5 (yellow badge "Almost Full")
10. API validation prevents assigning employee to date with remaining_spots = 0
11. Bulk operations (CSV import, termination workflows) correctly update remaining_spots atomically
12. Edge case: If date is deleted, handle employee assignments gracefully (clear employee date fields)

#### Technical Notes

**Database Migration:**
``sql
ALTER TABLE important_dates
ADD COLUMN max_spots INTEGER DEFAULT 99,
ADD COLUMN remaining_spots INTEGER DEFAULT 99;

-- Set defaults based on category
UPDATE important_dates SET max_spots = 20, remaining_spots = 20 WHERE category = 'ÖMC';
UPDATE important_dates SET max_spots = 1, remaining_spots = 1 WHERE category = 'PE3';
UPDATE important_dates SET max_spots = 99, remaining_spots = 99 WHERE category = 'Stena';

-- Add check constraint
ALTER TABLE important_dates
ADD CONSTRAINT important_dates_remaining_spots_check
CHECK (remaining_spots >= 0 AND remaining_spots <= max_spots);
``

**Business Logic Service:** `src/lib/services/date-capacity.ts`
`typescript
export async function assignEmployeeToDate(
  employeeId: string, 
  dateId: string, 
  dateType: 'omc_date' | 'stena_date' | 'pe3_date'
) {
  // Use database transaction
  // 1. Check remaining_spots > 0
  // 2. Update employee date field
  // 3. Decrement remaining_spots
  // 4. Add employee to assigned_employees array
}
`

#### Dependencies

None (foundational for date management stories)

---

### Story 8.8: Important Dates Assigned Employees List

**As an** HR Admin  
**I want** to see which employees are assigned to each date  
**So that** I can review assignments and contact employees if needed

#### Acceptance Criteria

1. Database adds `assigned_employees` TEXT[] (array) column to important_dates table
2. When employee is assigned to a date, add employee name or ID to `assigned_employees` array
3. When employee's date is removed, remove from `assigned_employees` array
4. Important Dates table displays "Assigned Employees" column showing employee count badge (e.g., "15")
5. Click on employee count opens modal/popover with full list of assigned employee names
6. Modal includes employee details: Name, Email, SSN (last 4 digits), Room Number (if applicable)
7. Export includes full list of assigned employees per date in readable format
8. Sorting by number of assigned employees works correctly
9. Real-time updates: when employees are assigned/unassigned, list updates immediately
10. Performance optimized for dates with many assigned employees (>50, use pagination in modal)
11. Search functionality within assigned employees modal
12. Option to download assigned employees list as CSV for specific date

#### Technical Notes

**Database Migration:**
`sql
ALTER TABLE important_dates ADD COLUMN assigned_employees TEXT[] DEFAULT '{}';
`

**New Component:** `src/components/dashboard/assigned-employees-modal.tsx`

#### Dependencies

- Story 8.7 (date capacity management infrastructure)

---

### Story 8.9: ÖMC Two-Day Date Format

**As an** HR Admin  
**I want** ÖMC dates to display as two-day ranges (e.g., "8-9th March")  
**So that** it reflects the actual two-day ÖMC training schedule

#### Acceptance Criteria

1. ÖMC date input accepts two-day range format (e.g., "8-9/3", "8-9th March")
2. Date picker for ÖMC dates allows selecting start and end date (must be consecutive days)
3. ÖMC dates display in format "8-9th March 2025" in important dates table
4. Validation ensures end date is exactly 1 day after start date (consecutive days only)
5. Database stores ÖMC dates as single date value (start date) with implicit +1 day for end
6. Employee assignment to ÖMC date references the full two-day range
7. Filtering and sorting by ÖMC date works correctly (sorts by start date)
8. CSV import supports two-day format parsing for ÖMC category
9. Export displays two-day format correctly (e.g., "8-9 mars" in Swedish)
10. Localization handles both English and Swedish date formats
11. Calendar views show ÖMC dates spanning two days visually
12. Validation prevents non-consecutive dates for ÖMC category

#### Technical Notes

**UI Enhancement:** Add custom date picker component for ÖMC dates that shows two consecutive days

**Display Logic:**
``typescript
function formatOMCDate(startDate: Date): string {
const start = startDate.getDate();
const end = startDate.getDate() + 1;
const month = startDate.toLocaleDateString('sv-SE', { month: 'long' });
const year = startDate.getFullYear();

return `-  `;
}
``

#### Dependencies

None (display enhancement)

---

### Story 8.10: PE3 Date Time Selection

**As an** HR Admin  
**I want** to specify time-of-day for PE3 dates (HH:MM format)  
**So that** I can schedule specific appointment times for PE3 training

#### Acceptance Criteria

1. Database adds `time_value` TIME column to important_dates table (PE3 category only)
2. PE3 date create/edit form displays time picker (HH:MM format, 24-hour) in addition to date picker
3. Time picker supports keyboard input and dropdown selection
4. Important Dates table displays PE3 dates with time (e.g., "March 15, 2025 14:30")
5. Employee assignment dropdown for PE3 shows date with time (e.g., "15/3 14:30")
6. Default time is null/empty (time is optional for PE3 dates)
7. Validation ensures valid time format (00:00 - 23:59)
8. Sorting by PE3 date considers both date and time (chronological order)
9. CSV import supports time parsing (formats: "HH:MM", "HH:MM:SS", ISO datetime)
10. Export includes time in readable format (localized)
11. Filtering by date range includes time consideration
12. Time displays in user's locale format (24h for Swedish, configurable for others)

#### Technical Notes

**Database Migration:**
`sql
ALTER TABLE important_dates ADD COLUMN time_value TIME;
`

**UI Component:** Use shadcn/ui TimePicker or custom time input component

#### Dependencies

None (additive feature)

---

### Story 8.11: Important Dates Deadline Columns

**As an** HR Admin  
**I want** to set deadline_cancel and deadline_submit for dates  
**So that** I can enforce submission and cancellation deadlines

#### Acceptance Criteria

1. Database adds `deadline_cancel` DATE and `deadline_submit` DATE columns to important_dates table
2. Important Dates create/edit form displays deadline fields with date pickers
3. Validation ensures deadline_submit is before deadline_cancel (submit deadline comes first)
4. Validation ensures both deadlines are before the actual date/event
5. Important Dates table displays deadline columns (sortable, filterable)
6. Visual warning if current date > deadline_submit (red badge "Submission Closed")
7. Visual warning if current date > deadline_cancel (red badge "Cancellation Closed")
8. API prevents employee assignment after deadline_submit date has passed
9. API prevents employee unassignment (cancellation) after deadline_cancel date has passed
10. Tooltip shows deadline information when hovering over date in employee assignment dropdown
11. Employee create/edit form shows deadline warnings prominently if applicable
12. Bulk operations respect deadline constraints

#### Technical Notes

**Database Migration:**
``sql
ALTER TABLE important_dates
ADD COLUMN deadline_cancel DATE,
ADD COLUMN deadline_submit DATE;

-- Add check constraints
ALTER TABLE important_dates
ADD CONSTRAINT deadline_submit_before_cancel
CHECK (deadline_submit <= deadline_cancel OR deadline_submit IS NULL OR deadline_cancel IS NULL);

ALTER TABLE important_dates
ADD CONSTRAINT deadlines_before_date
CHECK (deadline_cancel <= date_value::date OR deadline_cancel IS NULL);
``

#### Dependencies

None (additive feature)

---

### Story 8.12: PE3 Import with Automatic Deadline Calculation

**As an** HR Admin  
**I want** PE3 import to automatically calculate deadline dates  
**So that** I don't have to manually set deadlines for each imported PE3 date

#### Acceptance Criteria

1. Rename "Import Dates" feature to "Import PE3 Dates" (button text, modal title)
2. Import functionality automatically sets category to "PE3" (no user selection, hardcoded)
3. For each imported PE3 date batch, identify the FIRST (earliest) date in the batch
4. Calculate `deadline_cancel` as Monday of the week before the FIRST date
5. Calculate `deadline_submit` as Wednesday of the week before the FIRST date
6. Import preview displays calculated deadlines for user review before saving
7. User can override calculated deadlines during import if needed (editable fields in preview)
8. CSV format documentation updated to explain PE3-specific import and deadline calculation
9. Validation ensures all imported dates are valid PE3 dates (category enforcement)
10. Bulk deadline updates apply consistently across all dates in import batch
11. Import logs show deadline calculation logic for auditing purposes
12. Edge case: Handle dates in first week of year correctly (previous year calculation)

#### Technical Notes

**Business Logic Service:** `src/lib/services/pe3-deadline-calculator.ts`
``typescript
export function calculatePE3Deadlines(dates: Date[]): { deadlineCancel: Date; deadlineSubmit: Date } {
// Find earliest date
const firstDate = dates.sort((a, b) => a.getTime() - b.getTime())[0];

// Get previous week's Monday
const weekBefore = new Date(firstDate);
weekBefore.setDate(weekBefore.getDate() - 7);
const dayOfWeek = weekBefore.getDay();
const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
const monday = new Date(weekBefore);
monday.setDate(monday.getDate() - daysToMonday);

// Wednesday is Monday + 2 days
const wednesday = new Date(monday);
wednesday.setDate(wednesday.getDate() + 2);

return {
deadlineCancel: monday,
deadlineSubmit: wednesday
};
}
``

#### Dependencies

- Story 8.11 (deadline columns must exist)

---

### Story 8.13: Terminated Employee Repayment Tracking

**As an** HR Admin  
**I want** to track which training dates terminated employees need to repay  
**So that** I can process financial reimbursements correctly

#### Acceptance Criteria

1. Database adds `repayment_needed_omc` DATE and `repayment_needed_pe3` DATE columns to employees table
2. Repayment columns visible only to HR Admin role (column permissions configuration)
3. Repayment columns only display in employee table when "Show Terminated" filter is active
4. Column Settings allows HR Admin to toggle visibility of repayment columns
5. When marking employee as terminated (is_terminated = true):
   - If `omc_date` is set (not null), copy value to `repayment_needed_omc`
   - If `pe3_date` is set (not null), copy value to `repayment_needed_pe3`
   - Then proceed with date clearing logic (Story 8.14)
6. When unmarking termination (reactivating employee, is_terminated = false):
   - If `repayment_needed_omc` is set AND corresponding date has remaining_spots > 0, copy back to `omc_date` and decrement spots
   - If `repayment_needed_pe3` is set AND corresponding date has remaining_spots > 0, copy back to `pe3_date` and decrement spots
   - Clear repayment fields after successful restoration
7. If spots are unavailable during reactivation, leave repayment fields set and display warning to user
8. Export terminated employees includes repayment columns with date values
9. Filtering by "Needs Repayment" status works correctly (show employees with non-null repayment fields)
10. Validation prevents manual editing of repayment fields (auto-managed by termination workflow only)
11. Audit trail: log all repayment field updates for financial tracking
12. Termination modal displays repayment information clearly ("ÖMC Date 15/3 will be marked for repayment")

#### Technical Notes

**Database Migration:**
``sql
ALTER TABLE employees
ADD COLUMN repayment_needed_omc DATE,
ADD COLUMN repayment_needed_pe3 DATE;

COMMENT ON COLUMN employees.repayment_needed_omc IS 'ÖMC date requiring repayment after termination';
COMMENT ON COLUMN employees.repayment_needed_pe3 IS 'PE3 date requiring repayment after termination';

-- Add to column_config for visibility control
INSERT INTO column_config (column_name, column_type, is_masterdata, role_permissions, display_order)
VALUES
('Repayment Needed (ÖMC)', 'date', true, '{"hr_admin": {"view": true, "edit": false}}', 100),
('Repayment Needed (PE3)', 'date', true, '{"hr_admin": {"view": true, "edit": false}}', 101);
``

**Business Logic Service:** `src/lib/services/termination-workflow.ts`

#### Dependencies

- Story 8.7 (capacity management for spot restoration)

---

### Story 8.14: Termination Date Clear Logic with Spot Management

**As an** HR Admin  
**I want** all date fields cleared when marking employee as terminated  
**So that** training spots are released for reassignment to other employees

#### Acceptance Criteria

1. When marking employee as terminated (after repayment field copy in Story 8.13):
   - Clear `stena_date` (set to NULL)
   - Clear `omc_date` (set to NULL)
   - Clear `pe3_date` (set to NULL)
2. For each cleared date field, increment `remaining_spots` by 1 on the corresponding important_dates record
3. For each cleared date, remove employee from `assigned_employees` array
4. Transaction ensures all spot updates happen atomically (use database transaction, no partial updates)
5. Termination modal displays preview of actions: "This will clear 3 date assignments and release spots"
6. Visual confirmation after termination shows which dates were cleared and spots released
7. Termination modal includes warning message: "This will release spots for the following dates: [list of dates with capacities]"
8. When reactivating employee (unmarking is_terminated):
   - Attempt to restore omc_date and pe3_date from repayment fields (per Story 8.13)
   - For each restored date, decrement `remaining_spots` by 1
   - For each restored date, add employee back to `assigned_employees` array
9. Reactivation shows warning if spots are not available: "Cannot restore [date] - currently fully booked (0 spots remaining)"
10. Audit log records all date clearing and spot changes with timestamp
11. Edge case: If date was deleted while employee was terminated, handle gracefully (no error, skip restoration)
12. Bulk termination operations (if implemented) correctly update all spots atomically
13. Real-time updates: other users see spot availability changes immediately

#### Technical Notes

**Database Transaction Example:**
``sql
-- Termination transaction
BEGIN;
-- Copy to repayment fields
UPDATE employees SET
repayment_needed_omc = omc_date,
repayment_needed_pe3 = pe3_date
WHERE id = ?;

-- Get date IDs before clearing
SELECT omc_date, pe3_date, stena_date FROM employees WHERE id = ?;

-- Clear date fields
UPDATE employees SET
stena_date = NULL,
omc_date = NULL,
pe3_date = NULL,
is_terminated = true,
termination_date = ?,
termination_reason = ?
WHERE id = ?;

-- Update spot counts
UPDATE important_dates SET remaining_spots = remaining_spots + 1 WHERE id IN (?...);
UPDATE important_dates SET assigned_employees = array_remove(assigned_employees, ?) WHERE id IN (?...);
COMMIT;
``

#### Dependencies

- Story 8.7 (capacity management)
- Story 8.8 (assigned employees tracking)
- Story 8.13 (repayment tracking)

---

### Story 8.15: Hotel Required Field in Create Form

**As an** HR Admin  
**I want** to specify if an employee needs hotel accommodations during creation  
**So that** room assignment can be calculated automatically (Story 8.16)

#### Acceptance Criteria

1. Database adds `hotel_required` BOOLEAN column to employees table (default FALSE)
2. Employee create form displays "Hotel Required?" checkbox after Town/City field
3. Checkbox is unchecked by default
4. Label includes helpful text: "Check if employee needs hotel accommodation during ÖMC training"
5. When checked during creation, triggers room number assignment logic (Story 8.16)
6. Checkbox is also available in employee edit mode for updating
7. Employee table optionally displays "Hotel Required" column (HR Admin can toggle visibility via Column Settings)
8. Filtering by "Hotel Required=Yes" status works correctly
9. If hotel_required is set to false after room was assigned, `room_number_shared` is cleared (set to NULL)
10. If hotel_required is set to true after employee creation, recalculate room assignment based on current omc_date
11. Translation keys: "Hotel Required" = "Hotel Required" (EN) / "Hotell Krävs" (SV)
12. Export includes hotel_required status as "Yes"/"No"
13. CSV import supports hotel_required field (values: true/false, yes/no, 1/0)
14. Visual indicator in table: show hotel icon next to employees with hotel_required=true

#### Technical Notes

**Database Migration:**
``sql
ALTER TABLE employees ADD COLUMN hotel_required BOOLEAN DEFAULT FALSE;

-- Add to column_config
INSERT INTO column_config (column_name, column_type, is_masterdata, role_permissions, display_order)
VALUES ('Hotel Required', 'boolean', true, '{"hr_admin": {"view": true, "edit": true}}', 50);
``

**Form Location:** Insert checkbox in `add-employee-modal.tsx` between `town_district` and rank fields

#### Dependencies

None (foundational for Story 8.16)

---

### Story 8.16: ÖMC Room Assignment Algorithm

**As an** HR Admin  
**I want** room numbers automatically assigned based on business rules  
**So that** I don't have to manually manage room sharing and prevent conflicts

#### Acceptance Criteria

1. Database adds `room_number_shared` INTEGER column to employees table
2. Room assignment triggers automatically when creating new employee with `hotel_required=true`
3. **Algorithm Logic (executed server-side):**
   - **Step 1:** Query all employees with same `omc_date` value (only those with hotel_required=true)
   - **Step 2:** If no other employees found for this omc_date Assign room number 1
   - **Step 3:** If employee rank is CHEF Assign next available incremented room number (no sharing)
   - **Step 4:** If employee rank is SEV:
     - Query rooms where only 1 employee is currently assigned (not full, max 2 per room)
     - Filter for rooms where the existing employee has rank=SEV AND same gender
     - If matching room found Assign same room number (enable sharing)
     - If no matching room found Assign next available room number
4. Room number assignment happens during employee save operation (API calculates before persisting)
5. Employee table displays "Room Number (Shared)" column showing assigned room
6. Visual indicator shows if room is shared: Display "Room 5 (Shared with: John Doe)" or "Room 3 (Private)"
7. User can manually override room assignment via employee edit if needed
8. If omc_date changes, automatically recalculate room_number_shared (clear and reassign)
9. If hotel_required changes to false, clear room_number_shared
10. Edge cases handled:
    - If omc_date is NULL, room_number_shared remains NULL
    - If gender is not set, cannot share room (assign private room)
    - If rank is not set, default to SEV sharing logic
11. Concurrent creation handles race conditions (use database locks or optimistic locking)
12. Export includes room_number_shared with sharing status indicator
13. Room assignment preview shown in create form before final save (calculated in real-time)
14. Testing covers all algorithm branches:
    - First employee for date (room 1)
    - CHEF rank (private room, next number)
    - SEV rank with matching gender available (share room)
    - SEV rank with no match (private room, next number)
    - Multiple concurrent assignments

#### Technical Notes

**Database Migration:**
``sql
ALTER TABLE employees ADD COLUMN room_number_shared INTEGER;

-- Add to column_config
INSERT INTO column_config (column_name, column_type, is_masterdata, role_permissions, display_order)
VALUES ('Room Number (Shared)', 'number', true, '{"hr_admin": {"view": true, "edit": true}}', 51);
``

**Business Logic Service:** `src/lib/services/room-assignment.ts`
``typescript
export async function calculateRoomNumber(
employeeData: {
omc_date: string | null;
rank: 'SEV' | 'CHEF';
gender: 'Man' | 'Woman';
hotel_required: boolean;
}
): Promise<number | null> {
if (!employeeData.hotel_required || !employeeData.omc_date) {
return null;
}

// Query employees with same omc_date and hotel_required=true
const existingAssignments = await db
.select()
.from(employees)
.where(and(
eq(employees.omc_date, employeeData.omc_date),
eq(employees.hotel_required, true),
isNotNull(employees.room_number_shared)
));

// No existing assignments room 1
if (existingAssignments.length === 0) {
return 1;
}

// CHEF rank private room (next available number)
if (employeeData.rank === 'CHEF') {
const maxRoom = Math.max(...existingAssignments.map(e => e.room_number_shared));
return maxRoom + 1;
}

// SEV rank check for sharable room
// Group by room number, count occupants
const roomOccupancy = existingAssignments.reduce((acc, emp) => {
const roomNum = emp.room_number_shared;
if (!acc[roomNum]) acc[roomNum] = [];
acc[roomNum].push(emp);
return acc;
}, {} as Record<number, typeof existingAssignments>);

// Find room with 1 SEV occupant of same gender
for (const [roomNum, occupants] of Object.entries(roomOccupancy)) {
if (occupants.length === 1 &&
occupants[0].rank === 'SEV' &&
occupants[0].gender === employeeData.gender) {
return parseInt(roomNum);
}
}

// No sharable room found assign next available room
const maxRoom = Math.max(...Object.keys(roomOccupancy).map(Number));
return maxRoom + 1;
}
``

**Concurrency Handling:** Use PostgreSQL row-level locks or optimistic locking (version counter)

#### Dependencies

- Story 8.1 (rank and gender enum constraints)
- Story 8.15 (hotel_required field)

---

## Change Log

| Date       | Version | Description                                | Author     |
| ---------- | ------- | ------------------------------------------ | ---------- |
| 2025-11-08 | 1.0     | Epic 8 created from Sprint Change Proposal | Sarah (PO) |

---

## Testing Strategy

### Unit Tests

- One field status calculation (24-hour timer logic)
- Talmundo editability conditions
- Crewing/Done prerequisite validation
- Room assignment algorithm (all branches)
- PE3 deadline calculation
- Capacity spot increment/decrement logic

### Integration Tests

- Employee termination workflow (repayment + date clearing + spot updates)
- Employee reactivation workflow (date restoration with spot checking)
- Date assignment with capacity validation
- Concurrent room assignments (race condition testing)
- Bulk operations respecting capacity constraints

### Manual Testing

- Visual badge rendering (green/yellow states)
- Conditional field disabling (Talmundo, Crewing/Done)
- Date dropdown capacity display
- ÖMC two-day format display
- PE3 time selection
- Room assignment preview in create form

### Performance Tests

- Table rendering with 1000+ employees (badge calculations)
- Real-time status updates (One field polling)
- Concurrent date assignments (spot locking)

---

## Implementation Notes

### Phase 1: Enum Fields & Visual Indicators (Stories 8.1-8.2)

**Duration:** 1-2 weeks  
**Priority:** HIGH (foundational)

- Establishes data validation and visual system
- No dependencies, can start immediately

### Phase 2: Conditional Logic & Time-Based Status (Stories 8.3-8.6)

**Duration:** 2-3 weeks  
**Priority:** HIGH (business logic)

- Implements field dependencies and completion tracking
- Depends on Phase 1 completion

### Phase 3: Important Dates Capacity & Features (Stories 8.7-8.12)

**Duration:** 3-4 weeks  
**Priority:** MEDIUM-HIGH (operational critical)

- Adds capacity management and prevents overbooking
- Can run parallel to Phase 2 (different database tables)

### Phase 4: Termination & Room Assignment (Stories 8.13-8.16)

**Duration:** 2-3 weeks  
**Priority:** MEDIUM (complex workflows)

- Integrates termination workflow with capacity management
- Implements room assignment automation
- Depends on Phases 1 and 3

**Total Estimated Duration:** 8-12 weeks

---

## Business Rule Clarifications

### 1. Repayment Financial Workflow (Story 8.13)

**Manual Process - No System Integration**

- Repayment tracking fields are **read-only reference data** for manual financial reconciliation
- HR Admin exports terminated employee report with repayment dates
- No automated workflows or external financial system integrations required
- Fields are system-managed (auto-populated on termination) but used for manual processing

### 2. One Field 24-Hour Waiting Period (Story 8.3)

**Business Context: Talmundo System Synchronization**

- The "One" field triggers data synchronization to the external **Talmundo system**
- Talmundo requires **24 hours to complete data sync** after One field is marked true
- The yellow→green badge visually enforces this mandatory waiting period
- Talmundo field remains disabled until sync completes (prevents data inconsistency)
- **Update AC #6**: Tooltip should read: "Talmundo field locked - waiting for One system sync to complete (ready in X hours)"
- **Update Story 8.4 AC #6**: Change tooltip to: "Can only be edited after One field completes 24-hour sync to Talmundo system"

### 3. Room Assignment Manual Override (Story 8.16)

**HR Admin Override Capability Required**

- After automatic room assignment, HR Admin **must be able to manually edit** room numbers
- System provides suggested room assignment, but HR has final control
- Use case: Handle special requests, accessibility needs, or conflicts not covered by algorithm

**Additional Acceptance Criteria for Story 8.16:**

**AC #15**: HR Admin can manually edit `room_number_shared` field after automatic assignment via inline editing or employee edit form

**AC #16**: System displays assignment source indicator:

- "Room 3 (Auto-assigned)" - automatic algorithm assignment
- "Room 5 (Manual)" - manually overridden by HR Admin
- Audit trail tracks changes: "Auto-assigned: Room 3 → Manual override: Room 5 by [HR Admin name] on [date]"

**AC #17**: Manual override does NOT trigger room assignment recalculation when omc_date changes - preserves manual assignments

**AC #18**: Visual indicator in table distinguishes auto-assigned vs manual room numbers (e.g., icon or badge)

**AC #19**: Export includes assignment source (Auto/Manual) in Room Number column
