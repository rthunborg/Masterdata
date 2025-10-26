# Next Steps

## UX Expert Prompt

Please review the HR Masterdata Management System PRD and create a comprehensive UX architecture document. Focus on:

- Detailed wireframes for the unified table interface with inline editing
- HR Admin configuration panel designs (user management, column permissions)
- Role preview mode UX and visual indicators for read-only vs editable states
- Design system specifications (color palette for status indicators, component library usage with shadcn/ui)
- Interaction patterns for spreadsheet-like editing (keyboard navigation, cell focus states)
- Responsive layout considerations for desktop-first design
- Accessibility implementation (WCAG AA compliance, keyboard navigation, ARIA labels)

Use this PRD as the foundation for UX decisions and ensure designs support the defined user workflows for both HR Admins and external party users.

## Architect Prompt

Please review the HR Masterdata Management System PRD and create a comprehensive technical architecture document. Focus on:

- Complete database schema design (tables, indexes, RLS policies, JSONB structure for custom columns)
- API endpoint specification (routes, methods, request/response contracts, authentication/authorization)
- Next.js application architecture (component hierarchy, state management, real-time subscription patterns)
- Supabase integration patterns (Auth, database client, real-time subscriptions, RLS policy implementation)
- Type system design (TypeScript interfaces for employees, users, column config, role permissions)
- Security implementation (RLS enforcement, API route protection, session management)
- Testing strategy (unit test targets, integration test approach, local testability requirements)
- Deployment architecture (Vercel configuration, environment variables, CI/CD pipeline)
- Performance optimization considerations (query optimization, real-time connection management, table rendering for large datasets)

Use this PRD as the requirements specification and translate functional/non-functional requirements into concrete technical design decisions.
