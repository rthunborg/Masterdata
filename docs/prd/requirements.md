# Requirements

## Functional

**FR1:** The system must provide a secure login interface with username/password authentication supporting 5 distinct role types: HR Admin, Sodexo, ÖMC, Payroll, and Toplux.

**FR2:** HR Admin users must be able to manually create, activate, and deactivate user accounts with assigned roles through an admin interface.

**FR3:** HR Admin users must be able to create new employee/candidate records with all masterdata fields including name, SSN, email, phone, rank, gender, hiring date, termination date, and other HR-controlled attributes.

**FR4:** HR Admin users must be able to edit all masterdata fields for existing employee/candidate records with changes persisted immediately.

**FR5:** HR Admin users must be able to archive (soft delete) employee records, making them invisible in the main view but recoverable if needed.

**FR5a:** HR Admin users must be able to mark employees as "Terminated/Drop out" with termination date and reason comment, distinguishing them from active employees while retaining full record history.

**FR5b:** HR Admin users must be able to bulk import employee masterdata from CSV files with column mapping to populate the database from existing Excel data.

**FR5c:** HR Admin users must be able to maintain a reference calendar of important operational dates (e.g., Stena dates, ÖMC dates by week) visible to all users for scheduling coordination.

**FR6:** The system must provide a unified spreadsheet-like table interface as the primary view for all users displaying employee records with role-based column visibility.

**FR7:** The table interface must visually distinguish between read-only masterdata columns and editable custom columns through clear visual indicators (e.g., background color, icons, or borders).

**FR8:** External party users (Sodexo, ÖMC, Payroll, Toplux) must be able to view specific masterdata fields (determined by HR configuration) as read-only reference data.

**FR9:** External party users must be able to create, edit, and manage their own custom data columns linked to employee records without affecting masterdata or other parties' data.

**FR10:** External party users must be able to organize their custom columns into logical categories (e.g., "Recruitment Team", "Warehouse Team") for better workflow organization.

**FR11:** Changes to masterdata fields by HR Admin must automatically propagate to all external party views in real-time (visible within 2 seconds) without requiring page refresh.

**FR12:** The system must enforce complete data isolation between external parties so that each party can only view and edit their own custom columns, not those of other parties.

**FR13:** HR Admin must be able to configure column-level permissions specifying which roles can view (read-only) and which can edit specific columns through an admin configuration interface.

**FR14:** HR Admin must be able to create new columns, assign them to specific roles, and define whether they are read-only or editable for those roles.

**FR15:** HR Admin must have a "View As" preview mode allowing them to see exactly what each role (Sodexo, ÖMC, Payroll, Toplux) sees in their table interface to verify permissions are configured correctly.

**FR16:** The table interface must provide text-based search functionality that searches across all visible columns for the current user's role.

**FR17:** The table interface must support click-to-sort on any column header with toggle between ascending and descending order.

**FR18:** The table interface must display archived employees separately or hide them by default with an option to view archived records.

**FR19:** The system must support responsive design optimized for desktop browsers (Chrome, Firefox, Edge, Safari - last 2 versions).

**FR20:** All data changes (create, update, archive) must be persisted immediately to the database with appropriate error handling and user feedback on success or failure.

**FR21:** External party users must receive visual notifications when masterdata changes cause employee records to enter, leave, or be modified within their current filtered/sorted view, ensuring awareness of data changes affecting their workflow.

**FR22:** The system must restrict gender selection to enum values "Man" (Male) or "Woman" (Female) when creating or editing employees.

**FR23:** The system must restrict rank selection to enum values "SEV" or "CHEF" when creating or editing employees.

**FR24:** The following boolean masterdata fields must display a green visual indicator when set to true: ISP, Photo, Origo, Mail, lön, Bankuppgifter, LI, Passport, Kvitto C17/18, and C17.

**FR25:** The One boolean field must display a yellow visual indicator for 24 hours after being set to true, then transition to green.

**FR26:** The Talmundo boolean field must only be editable when the One field is true AND marked as green (24+ hours elapsed).

**FR27:** The Crewing/Done boolean field must only be editable when ALL of the following fields are true: ISP, Photo, Origo, Mail, lön, Bankuppgifter, LI, Passport, Kvitto C17/18, and C17. When set to true, display green visual indicator.

**FR28:** The Lönenivå field must accept enum numerical values 0-7, default to null/empty, and display green visual indicator when non-null.

**FR29:** Important dates must track assigned employees in a visible list column showing which employees are assigned to each date.

**FR30:** Important dates must have max_spots and remaining_spots columns, with defaults: ÖMC=20, Stena=99, PE3=1. Remaining spots decrement when employees are assigned and increment when unassigned.

**FR31:** When creating/editing employee date assignments, only show dates with remaining_spots > 0, and display remaining spots in dropdown values (e.g., "8-9th March (15 spots)").

**FR32:** ÖMC dates must support two-day date format (e.g., "8-9th March").

**FR33:** PE3 dates must allow time specification in HH:MM format.

**FR34:** Important dates must have deadline_cancel and deadline_submit columns for scheduling deadlines.

**FR35:** The Import Dates feature must be renamed "Import PE3 Dates" and automatically set category to PE3, calculate deadline_cancel as Monday of week before first PE3 date, and calculate deadline_submit as Wednesday of week before first PE3 date.

**FR36:** Employees table must have repayment_needed_omc and repayment_needed_pe3 date columns, visible only to HR Admin, shown only when "Show Terminated" filter is active.

**FR37:** When marking an employee as terminated, copy omc_date to repayment_needed_omc, copy pe3_date to repayment_needed_pe3, clear all date fields (stena_date, omc_date, pe3_date), and update remaining_spots for cleared dates accordingly.

**FR38:** When unmarking an employee as terminated, restore omc_date and pe3_date from repayment fields (if spots available), clear repayment fields, and update remaining_spots accordingly.

**FR39:** Employee creation form must display hotel_required boolean field after city/town field, defaulting to false.

**FR40:** When creating an employee with hotel_required=true, automatically assign room_number_shared based on algorithm: If first employee for this omc_date assign room 1; If rank=CHEF assign next incremented room number; If rank=SEV find existing room with only 1 SEV occupant of same gender OR assign next available room.

## Non Functional

**NFR1:** The system must leverage Supabase and Vercel free-tier services exclusively to maintain zero monthly operational costs (excluding optional domain registration).

**NFR2:** The system must achieve 99%+ uptime availability on free-tier infrastructure.

**NFR3:** Page load time for the main table interface must be under 2 seconds for up to 1,000 employee records.

**NFR4:** Real-time data synchronization latency must be under 2 seconds from when HR makes a masterdata change to when it appears in external party views.

**NFR5:** The system must support 10 concurrent users without performance degradation.

**NFR6:** The database schema must be designed to scale to 10,000+ employee records for future growth.

**NFR7:** The system must enforce HTTPS for all connections to protect sensitive employee data in transit.

**NFR8:** User passwords must be securely hashed using industry-standard algorithms (provided by Supabase Auth).

**NFR9:** The system must prevent SQL injection through use of parameterized queries and ORM/query builder patterns.

**NFR10:** Row-level security (RLS) policies in Supabase must enforce that users can only access data permitted by their role.

**NFR11:** The user interface must be intuitive enough for users with low technical skills (comfortable with Excel but not databases) to use without extensive training.

**NFR12:** The spreadsheet-like interface must provide familiar Excel-like interactions (click to edit cells, arrow key navigation, etc.) to minimize learning curve.

**NFR13:** All user-facing error messages must be clear, non-technical, and provide actionable guidance.

**NFR14:** The codebase must use TypeScript throughout for type safety and maintainability.

**NFR15:** The system architecture must support future enhancements including audit logs, bulk operations, and advanced filtering without requiring major refactoring.

**NFR16:** Change notifications must be non-intrusive (toast/banner style), dismissible, and provide clear context about what changed without interrupting user workflow.

---
