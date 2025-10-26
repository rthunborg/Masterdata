# Technical Assumptions

## Repository Structure

**Monorepo** - Single repository containing the full-stack Next.js application with integrated frontend and backend:

- Simplified deployment and version management
- Shared TypeScript types between frontend and backend
- Single dependency management (package.json)
- Appropriate for small-to-medium team and project scope

## Service Architecture

**Serverless Monolith with Next.js** - The application will use Next.js App Router with integrated API routes deployed as serverless functions on Vercel:

- **Frontend**: Next.js React components with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes as serverless functions handling business logic and Supabase database interactions
- **Database**: Supabase (PostgreSQL) with real-time subscriptions, row-level security (RLS), and built-in authentication
- **Real-time**: Supabase real-time subscriptions for live data updates (alternative: polling fallback if latency issues)

**Rationale**: This architecture maximizes free-tier benefits (Vercel + Supabase), minimizes operational complexity, supports rapid MVP development, and leverages modern serverless patterns for scalability and zero-cost idle periods.

## Testing Requirements

**Unit + Integration Testing** for MVP:

- **Unit Tests**: Core business logic functions, utility functions, data transformation logic using Vitest or Jest
- **Integration Tests**: API routes testing with database interactions using test database environment
- **Component Tests**: Critical UI components (table, edit forms) using React Testing Library
- **Manual Testing**: E2E user workflows through UAT with actual users
- **Local Testability**: Backend API routes must be testable via CLI tools (curl, Postman) or test scripts independently of frontend
- **Test Coverage Goal**: 70%+ for business logic, critical paths must have tests

**Deferred to Post-MVP**: Full E2E automation (Playwright/Cypress), visual regression testing, performance testing automation

## Additional Technical Assumptions and Requests

- **TypeScript Strict Mode**: Enable strict TypeScript configuration for maximum type safety and catching errors early
- **Supabase RLS as Primary Security**: Row-level security policies in Supabase must be the primary enforcement mechanism for data access, not just backend API logic
- **Database Schema Evolution**: Use Supabase migrations for schema changes, version controlled in repository
- **Environment Variables**: Sensitive configuration (Supabase keys, API URLs) managed via environment variables, not committed to repository
- **Error Logging**: Implement basic error logging (console for MVP, Sentry or similar in post-MVP) to track production issues
- **Spreadsheet UI Library**: Evaluate TanStack Table first (lightweight, flexible) before considering AG Grid (more features but complex licensing) for the table interface
- **State Management**: Use React hooks (useState, useContext) and Supabase real-time subscriptions for state management; avoid Redux/Zustand unless complexity demands it
- **Data Migration Strategy**: Create a simple import script or admin tool to migrate existing Excel data into database during initial deployment
- **Session Management**: Leverage Supabase Auth for session management with configurable session timeout (suggest 8 hours for balance of security and convenience)
- **Concurrent Edit Handling**: Implement optimistic UI updates with last-write-wins conflict resolution; display warning if user's data is stale (future: operational transform or CRDT)
- **Column Definition Storage**: Store column metadata (name, type, role permissions, category) in a column_config table to support dynamic column management by HR Admin
- **Development Environment**: Use Docker or local Supabase CLI for local development database to match production PostgreSQL environment

---
