# Epic 3: Role-Based Column Visibility & External Party Views

**Epic Goal**: Implement the dynamic column permission system and role-based table views so that external parties (Sodexo, ÖMC, Payroll, Toplux) can log in and see customized views showing only the masterdata columns HR has configured for their role. This epic establishes the foundation for isolated data access and prepares for custom column functionality in the next epic.

## Story 3.1: Column Configuration Data Model & Seeding

As a **developer**,  
I want **the column_config table populated with masterdata column definitions and initial role permissions**,  
so that **the system knows which columns exist and which roles can view them**.

### Acceptance Criteria

1. Database seed script or migration creates entries in column_config table for all masterdata columns: First Name, Surname, SSN, Email, Mobile, Town District, Rank, Gender, Hire Date, Termination Date, Termination Reason, Comments
2. Each column entry includes: column_name (matches database column), column_type (e.g., 'text', 'date', 'email'), is_masterdata (true), category (null for masterdata)
3. ole_permissions field (JSONB) populated with initial permissions structure: { "hr_admin": {"view": true, "edit": true}, "sodexo": {"view": true, "edit": false}, "omc": {"view": true, "edit": false}, "payroll": {"view": true, "edit": false}, "toplux": {"view": true, "edit": false} } for commonly shared columns like Name, Email
4. Some columns (e.g., SSN, Termination Date) configured with restricted view permissions (only HR Admin can view)
5. Seed script is idempotent (can be run multiple times without duplicating data)
6. Column configuration is queryable via API route /api/columns (GET) returning all column definitions
7. API route validates user is authenticated before returning column config
8. Column config API is testable via CLI (e.g., curl /api/columns -H 'Authorization: Bearer <token>')

## Story 3.2: Dynamic Table Columns Based on Role Permissions

As an **external party user**,  
I want **to see only the columns I have permission to view when I log in**,  
so that **I'm not overwhelmed with irrelevant data and the interface respects my access level**.

### Acceptance Criteria

1. Table component fetches current user's role from session and queries column configuration for columns where
   ole_permissions[user_role].view = true
2. Table dynamically renders only columns the user has permission to view (column list varies by role)
3. For HR Admin role, all masterdata columns are visible
4. For external party roles (Sodexo, ÖMC, Payroll, Toplux), only configured-visible columns are displayed (initially: Name, Email, Phone, Hire Date per seed configuration)
5. Columns without view permission are completely absent from the table (not just hidden with CSS)
6. Column order is consistent and follows logical grouping (masterdata columns first, alphabetical or by configuration order)
7. Table header labels use human-readable names (e.g., "Hire Date" not "hire_date")
8. Logging in as different roles shows different column sets (verified through manual testing with multiple role accounts)
9. Performance is acceptable: column filtering and rendering completes in <300ms
10. If a role has zero visible columns (misconfiguration), display error message: "No columns configured for your role. Please contact HR."

## Story 3.3: Read-Only vs Editable Column Visual Indicators

As an **external party user**,  
I want **to clearly see which columns I can edit versus which are read-only**,  
so that **I don't waste time trying to edit fields I don't have permission to change**.

### Acceptance Criteria

1. Table cells for columns where user has edit: false permission are visually distinguished as read-only (e.g., lighter background color, lock icon, or no hover effect)
2. Table cells for columns where user has edit: true permission show editable affordance (cursor changes to pointer or text cursor on hover, subtle background change)
3. For external parties viewing masterdata columns (read-only), cell click does nothing or shows tooltip: "This field is read-only. Contact HR to update."
4. For HR Admin, all masterdata columns remain editable as implemented in Epic 2
5. Visual distinction is consistent and follows design system (color palette, iconography)
6. Accessibility: read-only state is communicated to screen readers via appropriate ARIA attributes
7. Column headers for read-only columns optionally include a lock icon or badge indicating read-only status
8. User can still select and copy text from read-only cells for reference

## Story 3.4: External Party Login and Dashboard Access

As an **external party user (Sodexo, ÖMC, Payroll, Toplux)**,  
I want **to log in and see the employee table with my permitted columns**,  
so that **I can view current employee masterdata relevant to my work**.

### Acceptance Criteria

1. HR Admin can create user accounts for external parties through admin interface (or via database seed for testing) with roles: sodexo, omc, payroll, toplux
2. External party user can log in using their assigned email/password credentials
3. After login, external party user is redirected to /dashboard showing the employee table
4. Table displays only columns the external party has view permissions for (per column configuration)
5. All displayed masterdata columns are read-only (clicking cells shows read-only indicator or no action)
6. External party user cannot access /admin/\* routes (middleware redirects to dashboard or shows 403 error)
7. External party user sees their role name displayed somewhere in the UI (e.g., header: "Logged in as: Sodexo User")
8. Logout functionality works correctly for external party users
9. External party user cannot create, archive, or delete employees (buttons/actions hidden or disabled)
10. Manual testing completed with at least 2 different external party role accounts verifying correct column visibility
11. Dashboard includes toast notification container (Sonner Toaster component) for receiving change notifications from real-time sync (implemented in Epic 4)

---
