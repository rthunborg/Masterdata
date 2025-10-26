# Epic 5: Admin Configuration & Role Preview

**Epic Goal**: Provide HR Admin with comprehensive administrative capabilities including user account management, column permission configuration, and the critical "View As" role preview feature that allows HR to verify what each external party sees. This epic completes the MVP by delivering the admin tooling necessary for HR to confidently manage the system.

## Story 5.1: User Account Management Interface

As an **HR Admin**,  
I want **to create, view, and deactivate user accounts with assigned roles**,  
so that **I can manage access for HR staff and external party representatives**.

### Acceptance Criteria

1. Admin navigation includes "User Management" link accessible only to HR Admin role
2. User Management page (/admin/users) displays table of all users from users table showing: Email, Role, Active Status, Created Date
3. "Add User" button opens modal with form: Email (required, email format), Password (required, minimum 8 characters), Role (dropdown: hr_admin, sodexo, omc, payroll, toplux), Active (checkbox, default true)
4. Submitting form calls /api/admin/users (POST) which creates user in Supabase Auth and corresponding record in users table
5. Success message displayed: "User [Email] created successfully. Initial password: [password]" (note: in production, password should be sent via email, but manual copy is acceptable for MVP)
6. User table includes "Deactivate" action for active users and "Activate" action for inactive users
7. Deactivating user sets is_active = false in users table and revokes Supabase Auth session (user cannot log in)
8. Activating user sets is_active = true and allows login
9. HR Admin cannot deactivate their own account (validation prevents self-deactivation)
10. User management operations are testable via API routes with hr_admin role authentication
11. Form includes basic validation and displays errors clearly

## Story 5.2: Column Permission Configuration Interface

As an **HR Admin**,  
I want **to configure which roles can view and edit specific columns through a visual interface**,  
so that **I can control data access granularly without writing code or SQL**.

### Acceptance Criteria

1. Admin navigation includes "Column Settings" link accessible only to HR Admin role
2. Column Settings page (/admin/columns) displays table of all columns from column_config showing: Column Name, Type, Category, Masterdata/Custom, and Permission toggles for each role
3. For each column row, display checkboxes or toggles for each role (HR Admin, Sodexo, ÖMC, Payroll, Toplux) with two states: View, Edit
4. HR Admin role is always View=true, Edit=true for masterdata columns (checkboxes disabled/grayed out)
5. Toggling permission checkbox updates
   ole_permissions JSONB in column_config table via API call /api/admin/columns/[id] (PATCH)
6. Permission changes take effect immediately in all user sessions (real-time or next page load)
7. Interface prevents invalid states (e.g., Edit permission requires View permission - toggling Edit on automatically enables View)
8. Visual grouping or filtering options: "Show only Masterdata Columns", "Show only Custom Columns", filter by role
9. Changes persist to database and remain after page refresh
10. Bulk action option: "Apply to all external parties" checkbox for quick permission setting across Sodexo, ÖMC, Payroll, Toplux
11. Success feedback displayed when permissions updated

## Story 5.3: View As Role Preview Mode

As an **HR Admin**,  
I want **to switch to a preview mode showing exactly what each external party role sees**,  
so that **I can verify column permissions are configured correctly before users access the system**.

### Acceptance Criteria

1. HR Admin dashboard includes role selector dropdown in header or toolbar: "View As: HR Admin | Sodexo | ÖMC | Payroll | Toplux"
2. Selecting a role from dropdown switches the table view to display only columns that role has permission to view
3. In preview mode, visual banner or indicator displays: "Viewing as [Role Name] - Preview Mode" with prominent "Exit Preview" button
4. Column visibility, read-only states, and custom columns match exactly what a user logged in as that role would see
5. In preview mode, edit actions are disabled (or simulated read-only) to prevent accidental data modification while previewing
6. Switching between different roles in preview mode updates the table view instantly (client-side rendering)
7. "Exit Preview" button returns HR Admin to their normal view with all columns and edit capabilities
8. Preview mode state is client-side only (does not affect database or other users)
9. HR Admin can test search and sort functionality in preview mode to experience external party workflows
10. Manual testing checklist: verify preview mode matches actual external party login for at least 2 roles

## Story 5.4: Delete/Hide Custom Columns

As an **HR Admin**,  
I want **to delete or hide custom columns that are no longer needed**,  
so that **I can maintain a clean column structure and remove obsolete data fields**.

### Acceptance Criteria

1. Column Settings page includes "Delete" action for custom columns (is_masterdata = false)
2. Masterdata columns cannot be deleted (Delete button disabled or hidden with tooltip: "Masterdata columns cannot be deleted")
3. Clicking "Delete" on custom column displays confirmation dialog: "Are you sure you want to delete '[Column Name]'? All data in this column will be permanently removed."
4. Confirming delete removes column definition from column_config and removes column key from JSONB data fields in party-specific tables
5. Deleted column disappears from all user views immediately
6. Alternative "Hide" option: sets column to hidden state (view permission false for all roles) without deleting data, allowing future unhiding
7. Delete action is irreversible (data loss warning included in confirmation dialog)
8. External parties cannot delete columns (only HR Admin has access to this functionality)
9. API endpoint /api/admin/columns/[id] (DELETE) handles column deletion with role validation
10. Audit consideration: deleted columns could optionally be soft-deleted (archived) rather than hard-deleted for data recovery (implementation choice)

## Story 5.5: MVP Smoke Test & Documentation

As an **HR Admin**,  
I want **comprehensive documentation and a smoke test checklist**,  
so that **the system is ready for user acceptance testing and production deployment**.

### Acceptance Criteria

1. README.md updated with complete sections: Project Overview, Features, Technology Stack, Setup Instructions, Deployment Guide, User Roles & Permissions
2. User guide document created covering: Login, HR Admin workflows (create employee, edit data, archive, user management, column configuration), External Party workflows (view data, edit custom columns, add custom columns)
3. Smoke test checklist document created with test cases for: Authentication, HR CRUD operations, Column permissions, Real-time sync, Role preview, User management
4. All smoke test cases executed manually and results documented (pass/fail)
5. Known issues or limitations documented in README or separate ISSUES.md file
6. API documentation created listing all endpoints, methods, required authentication, request/response formats (can be simple markdown table)
7. Environment variable setup documented (.env.example file with all required variables and descriptions)
8. Deployment verification checklist: Production URL accessible, Database connected, Authentication working, All roles can log in, Real-time sync functional
9. Performance benchmarks documented: page load time, real-time latency, table rendering for 1,000 records
10. Handoff to UAT: All MVP success criteria from project brief reviewed and verified as implemented

---
