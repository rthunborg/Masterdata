# Project Brief: HR Masterdata Management System

**Session Date:** October 26, 2025  
**Facilitator:** Business Analyst Mary  
**Project Type:** Internal HR Tool - MVP Web Application

---

## Executive Summary

The HR Masterdata Management System is a web-based application designed to replace the current Excel-based workflow for managing employee and candidate data. The system provides a unified interface where HR maintains a central masterdata repository while external parties (Sodexo, ÖMC, Payroll, Toplux) can view relevant employee information and manage their own department-specific data columns. The solution emphasizes ease of use for non-technical users, role-based access control, and real-time data synchronization, all while maintaining zero running costs through free-tier cloud infrastructure.

**Primary Value Proposition:** Transform a fragile, VB-script-dependent Excel file into a secure, scalable, user-friendly web application that maintains data consistency while giving external parties autonomy over their own data columns.

---

## Problem Statement

### Current State Pain Points

The HR team currently distributes an Excel workbook containing VB scripts that synchronize data from a central "Masterdata" sheet to department-specific sheets (Payroll, Sodexo, ÖMC, Toplux). This approach suffers from several critical issues:

1. **Data Consistency Challenges**: The one-way sync from masterdata to department sheets works via VB scripts, but the reverse is not automated. External parties can modify their sheets, but these changes risk overwriting or conflicts.

2. **Access Control Limitations**: Excel's sharing and permission model is inadequate for managing granular access control. There's no easy way to ensure external parties only see and edit their designated columns.

3. **Technical Fragility**: VB scripts are brittle, difficult to maintain, and break easily when the file structure changes or when users have different Excel versions.

4. **Collaboration Friction**: File-based sharing creates versioning issues, concurrent editing problems, and distribution headaches.

5. **Non-Technical User Burden**: HR staff (low technical skills) must manage complex Excel configurations and troubleshoot VB script issues.

### Impact

- **Time Waste**: HR spends unnecessary hours managing file distribution, fixing broken scripts, and resolving data conflicts
- **Error Risk**: Manual processes and script failures create risk of data corruption or loss
- **Scalability Barrier**: Current system doesn't scale as organization adds new external parties or employees
- **Security Concerns**: Sensitive employee data in shared Excel files lacks proper access controls and audit trails

### Why Now

The current Excel-based system is reaching its breaking point. As the organization grows and more external parties need access, the technical debt and operational overhead make it urgent to implement a proper solution before data integrity issues cause serious business impact.

---

## Proposed Solution

### Core Concept

A lightweight web application with a unified spreadsheet-like interface where:

- **HR controls masterdata**: Create, update, and archive employee records with full CRUD capabilities
- **External parties access their views**: Each external party sees a customized view showing relevant masterdata fields (read-only) plus their own editable columns
- **Real-time synchronization**: Changes to masterdata by HR instantly propagate to all external party views
- **Isolated data ownership**: External parties manage their own columns independently without affecting masterdata or other parties' data

### Key Differentiators

1. **Unified Interface Philosophy**: Unlike separate applications per party, all users work in the same intuitive table interface with role-based column visibility
2. **Zero-Cost Infrastructure**: Leveraging free-tier cloud services (Supabase, Vercel) to eliminate ongoing operational costs
3. **HR-Centric Design**: Admin interface specifically designed for non-technical users with visual role preview capabilities
4. **Column Categorization**: External parties can organize their columns into logical categories (e.g., "Recruitment Team", "Warehouse Team")

### Why This Will Succeed

- **Familiar Interface**: Spreadsheet-like UI reduces learning curve for Excel users
- **Technical Team Available**: In-house technical expertise across full stack enables custom development
- **Clear Scope**: MVP focus on pure data management avoids feature bloat
- **Proven Technologies**: Modern serverless stack with real-time capabilities is well-suited for this use case

---

## Target Users

### Primary User Segment: HR Administrators

**Profile:**

- 2-3 HR staff members responsible for employee data management
- Low technical skills - comfortable with Excel but not with databases or programming
- Need to frequently add, update, and archive employee/candidate records
- Manage ~10 total system users across all external parties

**Current Behaviors:**

- Manually maintain Excel masterdata sheet
- Send updated files to external parties
- Troubleshoot VB script issues when they break
- Field questions about data access and permissions

**Needs & Pain Points:**

- Need simple, intuitive interface for managing employee data
- Must easily configure which external parties can see/edit which columns
- Want to preview how each role sees the interface to avoid configuration mistakes
- Need confidence that data changes sync correctly without manual intervention

**Goals:**

- Reduce time spent on data management administrative tasks
- Eliminate technical troubleshooting burden
- Maintain complete control over masterdata integrity
- Easy onboarding of new employees and external party users

### Secondary User Segment: External Party Data Managers

**Profile:**

- Representatives from Sodexo, ÖMC, Payroll, and Toplux (6-7 total users)
- Low technical skills - need simple, focused interface
- Access system approximately weekly to view/update their department-specific data
- Each party has different data requirements and column sets

**Current Behaviors:**

- Receive Excel files from HR
- Fill in their department-specific columns
- Return files or work with version conflicts
- Occasionally need to reference employee masterdata (name, SSN, email, etc.)

**Needs & Pain Points:**

- Need to see relevant employee masterdata fields for context
- Want autonomy to manage their own columns without HR intervention
- Must be able to search/sort/filter to find specific employees quickly
- Need assurance their data is isolated from other parties

**Goals:**

- Quick, easy access to their data view whenever needed
- Ability to organize columns into meaningful categories for their workflow
- Confidence that masterdata changes (e.g., name corrections) are always current

---

## Goals & Success Metrics

### Business Objectives

- **Eliminate Excel Distribution Overhead**: Reduce HR administrative time on data management by 70% within 3 months of deployment
- **Zero Operational Costs**: Maintain $0 monthly running costs through free-tier infrastructure (domain registration only one-time cost)
- **User Adoption**: Achieve 100% user adoption (all 10 users actively using system) within 2 weeks of launch
- **Data Integrity**: Zero data loss or corruption incidents in first 6 months

### User Success Metrics

- **Time to Complete Tasks**: External parties can update their data in <5 minutes per session
- **HR Configuration Time**: HR can configure permissions for new external party in <10 minutes
- **Error Reduction**: 90% reduction in data conflicts or sync errors compared to Excel baseline
- **User Satisfaction**: 80%+ satisfaction rating from both HR and external party users

### Key Performance Indicators (KPIs)

- **System Uptime**: 99%+ availability on free-tier infrastructure
- **Data Sync Latency**: Masterdata changes visible to all users within <2 seconds
- **Login Success Rate**: 95%+ successful logins without support requests
- **Support Ticket Volume**: <2 support requests per month after first month
- **MVP Delivery Timeline**: Launch MVP within 8-12 weeks from project kickoff

---

## MVP Scope

### Core Features (Must Have)

1. **User Authentication & Role Management**

   - Login system with username/password
   - 5 role types: HR Admin, Sodexo, ÖMC, Payroll, Toplux
   - HR can manually create/deactivate user accounts (~10 total users)
   - _Rationale: Simple manual management appropriate for small user base_

2. **Masterdata Management (HR Only)**

   - Create new employee/candidate records
   - Edit all masterdata fields (name, SSN, email, phone, rank, gender, dates, etc.)
   - Archive employees (soft delete - not visible but recoverable)
   - Search and filter employee list
   - Sort by any column
   - _Rationale: HR must have complete control and intuitive editing capabilities_

3. **Unified Table Interface**

   - Spreadsheet-like grid view for all users
   - Role-based column visibility (users only see columns they have permission for)
   - Clear visual distinction between read-only masterdata and editable columns
   - Responsive design for desktop browsers
   - _Rationale: Familiar Excel-like experience reduces learning curve_

4. **External Party Data Management**

   - Each external party can view relevant masterdata fields (read-only)
   - Each party can create and edit their own custom columns
   - Column organization into categories (e.g., "Recruitment Team", "Warehouse Team")
   - Data isolation - parties cannot see each other's custom columns
   - _Rationale: Autonomy for external parties while protecting data boundaries_

5. **Real-time Data Synchronization**

   - Masterdata changes by HR instantly propagate to all external party views
   - Changes visible within 2 seconds without page refresh
   - _Rationale: Eliminates stale data issues from Excel file distribution_

6. **Admin Configuration Interface (HR)**

   - Manage column permissions (which roles can see/edit which columns)
   - Create new columns and assign to roles
   - Define column categories
   - Live preview mode - "View as Sodexo", "View as ÖMC", etc. to see exactly what each role sees
   - _Rationale: Non-technical HR users need visual, intuitive permission management_

7. **Basic Search & Filter**
   - Text search across visible columns
   - Column header click-to-sort (ascending/descending)
   - _Rationale: Essential for usability with growing employee list_

### Out of Scope for MVP

- Advanced filtering (multi-column, saved filters)
- Data export to CSV/Excel
- Audit logs and change history
- Bulk import/upload functionality
- Mobile app or mobile-optimized views
- Email notifications
- Document attachments
- Comment/note fields
- Workflow automation or approval processes
- Integration with external systems (payroll software, etc.)
- User self-registration
- Password reset functionality (HR manages passwords initially)
- Multi-language support

### MVP Success Criteria

**The MVP is considered successful when:**

1. All 10 users (HR + external parties) can log in and access their respective views
2. HR can create, edit, and archive employees through the web interface
3. External parties can view current masterdata and edit their own columns
4. Changes to masterdata by HR appear in external party views within 2 seconds
5. HR can configure column permissions and preview each role's view
6. System runs on free-tier infrastructure with zero monthly costs
7. Users report the system is easier to use than the Excel workflow

---

## Post-MVP Vision

### Phase 2 Features

**Enhanced Usability:**

- Advanced filtering with saved filter presets
- Bulk edit capabilities for updating multiple records
- CSV export for reporting and analysis
- Keyboard shortcuts for power users

**Audit & Compliance:**

- Complete audit log of all data changes (who, what, when)
- Change history view per employee record
- Ability to rollback changes

**User Management:**

- Self-service password reset
- Email-based login/magic links
- Role templates for quickly adding new external parties

**Collaboration:**

- Comment/note fields on employee records
- @mentions and notifications
- Activity feed for recent changes

### Long-term Vision (1-2 Years)

Transform from pure data management to a **comprehensive HR operations platform**:

- **Workflow Automation**: Onboarding checklists, approval workflows for data changes
- **Document Management**: Store and link contracts, certificates, training documents to employee records
- **Reporting & Analytics**: Pre-built reports, custom dashboards, data visualization
- **Integration Hub**: Connect with payroll systems, time tracking, benefits platforms
- **Mobile Experience**: Native mobile apps or PWA for on-the-go access
- **AI-Powered Insights**: Automated data validation, anomaly detection, predictive analytics

### Expansion Opportunities

- **Multi-tenancy**: Adapt for use by multiple organizations (SaaS offering)
- **Industry-Specific Variants**: Construction, healthcare, retail-specific masterdata templates
- **Marketplace**: Third-party integrations and plugins
- **White-label**: License platform to HR consultancies

---

## Technical Considerations

### Platform Requirements

- **Target Platforms**: Web application (desktop browsers as primary)
- **Browser Support**: Modern browsers (Chrome, Firefox, Edge, Safari - last 2 versions)
- **Performance Requirements**:
  - Page load <2 seconds
  - Data sync latency <2 seconds
  - Support for up to 1,000 employee records initially
  - Scalable to 10,000+ records in future

### Technology Preferences

**Frontend:**

- React or Svelte for UI framework
- Modern component library (e.g., shadcn/ui, Material UI, or similar)
- TypeScript for type safety
- TanStack Table or AG Grid for spreadsheet-like interface
- Tailwind CSS for styling

**Backend:**

- Next.js with API routes (serverless functions)
- Alternative: Separate Node.js/Express backend if needed
- TypeScript throughout

**Database:**

- Supabase (PostgreSQL + real-time + authentication built-in)
- Leverages free tier: 500MB database, unlimited API requests, real-time subscriptions
- Row-level security for data access control

**Hosting/Infrastructure:**

- **Frontend**: Vercel free tier (unlimited deployments, 100GB bandwidth/month)
- **Backend**: Vercel serverless functions (or included with Next.js)
- **Database**: Supabase free tier
- **Domain**: Purchase custom domain (~$10-15/year) or use free subdomain
- **Total monthly cost**: $0

### Architecture Considerations

**Repository Structure:**

- Monorepo approach with Next.js app
- `/app` - Next.js pages and API routes
- `/components` - Reusable UI components
- `/lib` - Utilities, Supabase client, types
- `/styles` - Global styles and Tailwind config

**Database Schema:**

- `employees` table - Masterdata (HR-controlled fields)
- `sodexo_data` table - Sodexo-specific columns (linked by employee_id)
- `omc_data` table - ÖMC-specific columns
- `payroll_data` table - Payroll-specific columns
- `toplux_data` table - Toplux-specific columns
- `users` table - System users and roles
- `column_config` table - Column permissions and metadata
- Supabase RLS policies enforce row-level permissions

**Security/Compliance:**

- Row-level security (RLS) in Supabase for data access control
- HTTPS enforced (via Vercel)
- Secure password hashing (Supabase Auth)
- SQL injection prevention (parameterized queries)
- GDPR considerations - data export capability in Phase 2

---

## Constraints & Assumptions

### Constraints

**Budget:**

- **Development**: Internal team (no external development costs)
- **Infrastructure**: $0 monthly operating costs (free tiers only)
- **One-time costs**: Domain registration (~$10-15/year) - optional

**Timeline:**

- **Target MVP Launch**: 8-12 weeks from project kickoff
- **Development Resources**: Part-time allocation from existing technical team

**Resources:**

- **Development Team**: In-house technical staff (exact allocation TBD)
- **User Testing**: 10 total users available for UAT
- **Project Management**: Internal project management capacity

**Technical:**

- Must run on free-tier infrastructure (Vercel + Supabase limits)
- No mobile app development capacity for MVP
- Desktop browser-first approach

### Key Assumptions

- Free tiers of Supabase and Vercel will support 10 users and ~1,000 employee records adequately
- HR team can manage manual user creation for ~10 users (no self-service needed)
- External parties access system primarily from desktop computers
- Weekly update frequency by external parties won't create concurrency issues
- In-house technical team has React/TypeScript/Node.js expertise
- Internet connectivity is reliable for all users
- Users have modern browsers installed
- Email is available for sending login credentials to new users
- Data doesn't need to be exported regularly (no Excel export in MVP)
- Current Excel data can be migrated manually or via simple import script

---

## Risks & Open Questions

### Key Risks

- **Free Tier Limitations**: If usage exceeds Supabase/Vercel free tiers, costs could suddenly appear
  - _Mitigation_: Monitor usage closely; both platforms have generous free tiers that should handle 10 users comfortably
- **Data Migration Complexity**: Existing Excel data might have inconsistencies or format issues
  - _Mitigation_: Conduct data audit before migration; create data cleaning scripts if needed
- **User Adoption Resistance**: Users comfortable with Excel might resist change
  - _Mitigation_: Involve users early in design/testing; emphasize pain points solved; provide training
- **Real-time Performance**: Supabase real-time might have latency issues
  - _Mitigation_: Test thoroughly with realistic data volumes; fallback to polling if needed
- **Technical Skill Gap**: If team lacks specific technology experience, development could be delayed

  - _Mitigation_: Conduct technical spike/proof-of-concept early; identify knowledge gaps and address proactively

- **Scope Creep**: Users may request features beyond MVP during development
  - _Mitigation_: Clear MVP definition; disciplined backlog management; document Phase 2 features explicitly

### Open Questions

- **Data Migration Strategy**: How will existing Excel data be imported? Manual entry or automated script?
- **User Onboarding**: What training/documentation will users need? Video tutorials, written guides, or live sessions?
- **Password Management**: How will initial passwords be communicated? What's the reset process for MVP?
- **Session Timeout**: What's appropriate session length for security vs. convenience?
- **Backup Strategy**: How frequently should database backups occur? (Supabase does automatic backups, but what's recovery process?)
- **Browser Support**: Do any users have legacy browser constraints we need to accommodate?
- **Concurrent Editing**: What happens if two users edit the same cell simultaneously?
- **Column Addition**: Can external parties add new columns themselves, or must HR do it?
- **Data Validation**: What field-level validations are needed (e.g., SSN format, email format)?
- **Archiving vs Deletion**: What's the long-term retention policy for archived employees?

### Areas Needing Further Research

- **Supabase Real-time Performance**: Conduct load testing with realistic concurrent users and data volume
- **Spreadsheet UI Libraries**: Evaluate AG Grid vs TanStack Table vs custom solution for the best balance of features and complexity
- **Authentication UX**: Research best practices for low-tech user authentication (magic links vs traditional login)
- **Permission Model**: Design detailed permission schema to support future column-level and row-level permissions
- **Data Export Requirements**: Interview external parties to understand if CSV export is truly not needed for MVP
- **Compliance Requirements**: Verify if there are any regulatory compliance needs (GDPR, data retention, etc.)

---

## Appendices

### A. Research Summary

**Brainstorming Session Findings (October 26, 2025):**

Conducted structured brainstorming using:

- First Principles Thinking - Identified core problems (data consistency, access control)
- Resource Constraints - Explored zero-cost technical solutions
- Assumption Reversal - Discovered unified interface approach
- SCAMPER - Refined feature set and UX decisions

**Key Insights:**

- External party data is isolated - no cross-party visibility needed (simplified architecture)
- Column categorization feature emerged as important UX enhancement
- Live role preview identified as critical for HR admin confidence
- MVP scope discipline - resisted feature creep (export, notifications, mobile)

**Current State Analysis:**

- 4 external parties: Sodexo, ÖMC, Payroll, Toplux
- Each party has different masterdata field requirements
- Each party manages independent custom columns
- ~10 total users across all roles
- Weekly update frequency typical

### B. Stakeholder Input

**HR Team:**

- Low technical skills - need extremely intuitive interface
- Concerned about configuration mistakes - hence live preview feature
- Want to minimize time on administrative tasks
- Need confidence in data integrity and sync

**External Parties:**

- Also low technical skills
- Need autonomy over their data
- Don't need to see other parties' data
- Weekly access pattern - not real-time critical

### C. References

- **Supabase Documentation**: https://supabase.com/docs (authentication, real-time, RLS)
- **Vercel Free Tier**: https://vercel.com/pricing (100GB bandwidth, unlimited serverless functions)
- **Next.js Documentation**: https://nextjs.org/docs
- **TanStack Table**: https://tanstack.com/table (spreadsheet-like UI)
- **Shadcn/ui Components**: https://ui.shadcn.com (modern React components)

---

## Next Steps

### Immediate Actions

1. **Technical Spike/Proof of Concept** - Build a minimal prototype to validate:

   - Supabase real-time performance with sample data
   - Spreadsheet-like UI with TanStack Table or AG Grid
   - Row-level security configuration for role-based access
   - Timeline: 1 week

2. **Data Audit** - Review existing Excel file to:

   - Identify data quality issues
   - Define data migration strategy
   - Document all current columns and their purposes
   - Timeline: 3-4 days

3. **Detailed Technical Design** - Create architecture document including:

   - Complete database schema
   - API endpoints specification
   - Component hierarchy
   - State management approach
   - Timeline: 1 week

4. **User Story Mapping** - Work with PM to:

   - Break down MVP features into user stories
   - Prioritize development sequence
   - Estimate effort for each story
   - Timeline: 2-3 days

5. **Project Kickoff** - Assemble development team and:
   - Review project brief
   - Assign roles and responsibilities
   - Set up development environment
   - Establish sprint cadence
   - Timeline: 1 day

### PM Handoff

This Project Brief provides the full context for the **HR Masterdata Management System**. Please start in **PRD Generation Mode**, review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.

**Key Priorities for PRD:**

- Detailed user stories for each core feature
- Precise acceptance criteria
- UI/UX wireframes or mockups for unified table interface and admin panel
- Technical specifications for database schema and API design
- Test scenarios for real-time sync and permission enforcement
- Migration plan for existing Excel data

---

_Document created using BMAD-METHOD™ brainstorming and project brief framework_  
_Date: October 26, 2025_
