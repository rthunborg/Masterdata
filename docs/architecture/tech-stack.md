# Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3+ | Type-safe frontend development | Catches errors at compile-time, excellent IDE support, required by PRD (NFR14) |
| **Frontend Framework** | React | 18.2+ | UI component library | Industry standard, excellent ecosystem, Next.js integration |
| **Meta Framework** | Next.js | 14.1+ | Fullstack React framework | App Router for unified frontend/backend, built-in API routes, SSR/SSG, image optimization, Vercel integration |
| **UI Component Library** | shadcn/ui + Radix UI | Latest | Accessible component primitives | Copy-paste components, full customization, WCAG AA compliant, no runtime overhead |
| **CSS Framework** | Tailwind CSS | 3.4+ | Utility-first styling | Rapid UI development, consistent design system, small bundle size, excellent shadcn/ui integration |
| **Table Library** | TanStack Table | 8.11+ | Spreadsheet-like data grid | Headless design, virtual scrolling, sorting/filtering, 1,000+ row performance |
| **State Management** | React Hooks + Zustand | 4.4+ | Client-side state | Hooks for local state, Zustand for global state (auth, user context), avoids Redux complexity |
| **Backend Language** | TypeScript | 5.3+ | Type-safe backend development | Shared types with frontend, same as frontend for consistency |
| **Backend Framework** | Next.js API Routes | 14.1+ | Serverless API endpoints | Integrated with frontend, automatic deployment, serverless execution |
| **API Style** | REST | - | HTTP JSON APIs | Simple, well-understood, meets PRD requirements without GraphQL complexity |
| **Database** | PostgreSQL (Supabase) | 15+ | Relational database | ACID compliance, JSONB for flexible schemas, excellent full-text search, RLS support |
| **Real-time** | Supabase Realtime | Latest | WebSocket subscriptions | Built-in real-time updates, <2s latency (FR11), based on PostgreSQL logical replication |
| **Cache** | Vercel Edge Cache | - | CDN and API caching | Automatic static asset caching, optional API route caching |
| **File Storage** | Supabase Storage | Latest | CSV file uploads | S3-compatible object storage, integrates with RLS, free tier sufficient |
| **Authentication** | Supabase Auth | Latest | User auth and session mgmt | Email/password provider, JWT sessions, 8-hour timeout, secure password hashing (NFR8) |
| **Frontend Testing** | Vitest + React Testing Library | Vitest 1.1+, RTL 14+ | Component and unit tests | Fast execution, Jest-compatible, React-specific testing utilities |
| **Backend Testing** | Vitest | 1.1+ | API route and service tests | Same test runner as frontend, TypeScript support, fast |
| **E2E Testing** | Playwright | 1.40+ (post-MVP) | End-to-end browser tests | Reliable, cross-browser, excellent debugging |
| **Build Tool** | Next.js built-in | 14.1+ | Webpack/Turbopack bundling | Zero config, optimized for Next.js |
| **Bundler** | Turbopack | Latest (Next.js 14+) | Fast development bundling | 10x faster than Webpack in dev mode |
| **Package Manager** | pnpm | 8.14+ | Dependency management | Faster than npm, efficient disk usage, strict dependency resolution |
| **IaC Tool** | Supabase CLI + Vercel CLI | Latest | Infrastructure as code | Database migrations via Supabase CLI, deployment via Vercel CLI |
| **CI/CD** | GitHub Actions + Vercel | - | Automated testing and deployment | Free for open source, integrates with Vercel, automated preview deploys |
| **Monitoring** | Vercel Analytics (post-MVP) | - | Performance monitoring | Core Web Vitals, edge function metrics |
| **Error Tracking** | Console.error (MVP), Sentry (post-MVP) | - | Error logging | Basic logging for MVP, Sentry integration later |
| **Linting** | ESLint | 8.56+ | Code quality | Next.js config, TypeScript support |
| **Formatting** | Prettier | 3.1+ | Code formatting | Consistent code style |
| **Type Checking** | TypeScript Compiler | 5.3+ | Static type checking | Strict mode enabled per PRD |


---
