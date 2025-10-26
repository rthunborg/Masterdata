# Epic 1: Foundation & Authentication Infrastructure

**Epic Goal**: Establish the foundational project infrastructure including repository setup, Next.js application scaffold, Supabase database configuration, and a complete user authentication system with role-based access control. By the end of this epic, users can log in with role assignment, and the application is deployed to Vercel with basic health check/landing page demonstrating the full deployment pipeline works.

## Story 1.1: Project Initialization & Repository Setup

As a **developer**,  
I want **a properly initialized Next.js TypeScript project with Git repository and CI/CD pipeline**,  
so that **the team has a consistent development environment and automated deployment**.

### Acceptance Criteria

1. Next.js 14+ project initialized with TypeScript, Tailwind CSS, and App Router configuration
2. Git repository created with .gitignore configured for Next.js, node_modules, and environment variables
3. Project includes README.md with setup instructions, technology stack description, and development commands
4. Package.json configured with scripts for dev, build, test, and lint
5. ESLint and Prettier configured for code quality and consistent formatting
6. Vercel project created and linked to Git repository with automatic deployments on push to main branch
7. Environment variable structure documented (.env.example file) for Supabase keys and API URLs
8. Project successfully builds locally (
   pm run build) and deploys to Vercel showing default Next.js page

## Story 1.2: Supabase Project Setup & Database Schema

As a **developer**,  
I want **a Supabase project configured with initial database schema for users and employees**,  
so that **authentication and data storage infrastructure is ready for application development**.

### Acceptance Criteria

1. Supabase project created with PostgreSQL database provisioned
2. users table created with columns: id (UUID), email (text), role (enum: hr_admin, sodexo, omc, payroll, toplux), is_active (boolean), created_at (timestamp)
3. employees table created with columns: id (UUID), first_name (text), surname (text), ssn (text), email (text), mobile (text), rank (text), gender (text), town_district (text), hire_date (date), termination_date (date, nullable), termination_reason (text, nullable), is_terminated (boolean, default false), is_archived (boolean), comments (text, nullable), created_at (timestamp), updated_at (timestamp)
4. column_config table created with columns: id (UUID), column_name (text), column_type (text), role_permissions (jsonb), is_masterdata (boolean), category (text, nullable), created_at (timestamp)
5. important_dates table created with columns: id (UUID), week_number (integer), year (integer), category (text), date_description (text), date_value (text), notes (text, nullable), created_at (timestamp), updated_at (timestamp)
6. Row-level security (RLS) enabled on all tables with initial policies created: users can only read their own user record, no public access to employees or column_config yet, all authenticated users can read important_dates but only hr_admin can modify
7. Supabase connection tested from local development environment using environment variables
8. Database migration files version controlled in project repository (e.g., supabase/migrations/)
9. Supabase Auth configured with email/password provider enabled

## Story 1.3: Authentication Service & Login UI

As a **user**,  
I want **to log in to the application with my username and password**,  
so that **I can access the system with my assigned role permissions**.

### Acceptance Criteria

1. Login page UI created at /login route with email and password input fields, login button, and error message display area
2. Login form includes client-side validation: email format validation, password minimum length (8 characters), required field validation
3. Supabase Auth integration implemented: login function calls Supabase Auth API with email/password
4. Successful login retrieves user role from users table based on authenticated user's ID and stores in session
5. Failed login displays clear, non-technical error message ("Invalid email or password")
6. Successful login redirects to /dashboard route (placeholder page showing "Welcome [Role]" message)
7. Unauthenticated users attempting to access protected routes are redirected to /login
8. Session persistence configured with 8-hour timeout
9. Logout functionality implemented (button on dashboard) that clears session and redirects to login
10. Login and logout flows testable via UI interaction and manual testing

## Story 1.4: Role-Based Access Control Middleware

As a **developer**,  
I want **middleware that enforces role-based access to routes and API endpoints**,  
so that **users can only access functionality permitted by their role**.

### Acceptance Criteria

1. Next.js middleware created to check authentication status on all routes except /login and redirect to login if unauthenticated
2. Middleware retrieves user role from session and attaches to request context
3. Server-side route protection implemented: /admin/\* routes only accessible to hr_admin role
4. API route protection implemented: helper function or middleware validates user role before executing API logic
5. Unauthorized access attempts (wrong role) return 403 Forbidden with clear error message
6. Role validation is testable via API route testing (e.g., curl requests with different role tokens)
7. TypeScript types defined for user roles (enum or union type) used consistently across application
8. Documentation added to README explaining role permissions and protected routes

## Story 1.5: Health Check Deployment & Smoke Test

As a **developer**,  
I want **a deployed application with a health check endpoint and simple landing page**,  
so that **I can verify the full deployment pipeline and infrastructure work correctly**.

### Acceptance Criteria

1. API route created at /api/health that returns JSON: { status: "ok", timestamp: <current_time>, version: "0.1.0" }
2. Landing page created at / route (public, unauthenticated) showing: application name, brief description, link to login page
3. Application successfully deploys to Vercel with no build errors
4. Production URL accessible and displays landing page correctly
5. /api/health endpoint accessible and returns expected JSON response
6. Supabase database connection verified from production environment (environment variables correctly configured in Vercel)
7. Smoke test checklist completed: landing page loads, health endpoint responds, login page loads, authentication against Supabase succeeds
8. Deployment status documented in README (production URL, deployment status badge if applicable)

---
