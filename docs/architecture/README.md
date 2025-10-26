# Architecture Documentation

This directory contains the sharded architecture documentation for the HR Masterdata Management System. These files complement the main [architecture.md](../architecture.md) by providing focused, always-loaded references for development.

## Core Architecture Files

###  [tech-stack.md](./tech-stack.md)
**Purpose:** Complete technology stack specification with versions and rationale

**Contents:**
- Frontend technologies (React, Next.js, TanStack Table, Tailwind CSS)
- Backend technologies (Next.js API Routes, TypeScript)
- Database & infrastructure (PostgreSQL, Supabase, Vercel)
- Development & testing tools (Vitest, pnpm, ESLint)
- Build & CI/CD pipeline
- Technology decision rationale and alternatives considered

**When to reference:** 
- Starting a new feature (what libraries to use)
- Updating dependencies (what versions are approved)
- Evaluating new technology (see why current stack was chosen)

---

###  [coding-standards.md](./coding-standards.md)
**Purpose:** Coding standards, patterns, and best practices for consistent development

**Contents:**
- 8 critical fullstack rules (type sharing, service layer, RLS-first security)
- Naming conventions for all code elements
- File organization patterns
- Code style guidelines (TypeScript, React, API routes)
- Testing standards and structure
- Documentation requirements
- Git commit message format
- Performance, security, and accessibility guidelines

**When to reference:**
- Writing any code (follow established patterns)
- Code review (validate adherence to standards)
- Resolving naming debates (check conventions table)
- Setting up tests (use standard structure)

---

###  [source-tree.md](./source-tree.md)
**Purpose:** Complete file and directory structure specification

**Contents:**
- Full directory tree with 100+ file paths
- Key directory purposes and responsibilities
- File naming patterns and conventions
- Import path aliases configuration
- Critical files for development
- Git ignore patterns
- Development workflow file changes (adding features, pages, tables)

**When to reference:**
- Starting project implementation (where to create files)
- Adding new features (follow standard file organization)
- Navigating codebase (understand directory structure)
- Setting up imports (use path aliases)

---

## Dev Agent Configuration

Per core-config.yaml, these three files are configured as devLoadAlwaysFiles:

\\\yaml
devLoadAlwaysFiles:
  - docs/architecture/coding-standards.md
  - docs/architecture/tech-stack.md
  - docs/architecture/source-tree.md
\\\

**This means dev agents should always load these files when working on code to ensure:**
- Consistent technology usage
- Adherence to coding standards
- Correct file organization

---

## Relationship to Main Architecture

The main [architecture.md](../architecture.md) provides:
- Complete system architecture overview
- Data models with TypeScript interfaces
- API specification (25+ endpoints)
- Database schema with RLS policies
- Sequence diagrams for core workflows
- Security and performance requirements
- Testing strategy and deployment architecture

**These sharded files provide:**
- Quick reference for day-to-day development
- Focused documentation for specific concerns
- Always-loaded context for AI development agents

---

## Quick Reference

| Need to... | Consult |
|-----------|---------|
| Know what version of React to use | [tech-stack.md](./tech-stack.md) |
| Understand naming conventions | [coding-standards.md](./coding-standards.md) |
| Know where to create a new component | [source-tree.md](./source-tree.md) |
| See how to structure an API route | [coding-standards.md](./coding-standards.md) |
| Find database schema | [../architecture.md](../architecture.md) |
| See API endpoint specifications | [../architecture.md](../architecture.md) |
| Understand data models | [../architecture.md](../architecture.md) |
| Review security requirements | [../architecture.md](../architecture.md) |

---

**Last Updated:** October 26, 2025  
**Architecture Version:** 1.0
