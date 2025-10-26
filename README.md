# HR Masterdata Management System

A modern, real-time HR masterdata management platform built with Next.js, TypeScript, and Supabase. This system enables HR administrators to manage employee information with role-based access control and custom column configurations for external parties.

## Features

- **Real-time Employee Data Management** - Create, read, update, and archive employee records with instant updates
- **Role-Based Access Control** - HR Admin, External Party, and Read-Only roles with granular permissions
- **Custom Column Configuration** - External parties can define custom fields for employee tracking
- **Important Dates Calendar** - Track birthdays, anniversaries, and custom milestones
- **CSV Import/Export** - Bulk data operations for efficient data management
- **Responsive Design** - Mobile-friendly interface built with Tailwind CSS and shadcn/ui

## Technology Stack

### Frontend

- **Next.js 16.0** - React meta-framework with App Router
- **TypeScript 5.9** - Type-safe development with strict mode
- **React 19.2** - UI component library
- **Tailwind CSS 4.1** - Utility-first styling framework
- **shadcn/ui** - Accessible component library (to be added in later stories)

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - PostgreSQL database with real-time subscriptions (to be configured in Story 1.2)
- **Row-Level Security (RLS)** - Database-level access control

### Development Tools

- **pnpm 10.19** - Fast, disk-efficient package manager
- **ESLint 9.38** - Code linting with Next.js configuration
- **Prettier 3.6** - Code formatting
- **Vitest 4.0** - Fast unit testing framework
- **React Testing Library 16.3** - Component testing utilities

### Deployment

- **Vercel** - Frontend and API hosting (to be configured in Task 8)
- **GitHub Actions** - CI/CD pipeline (optional)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17+ or 20+ ([Download](https://nodejs.org/))
- **pnpm** 8.14+ (installed globally: `npm install -g pnpm`)
- **Git** 2.0+ ([Download](https://git-scm.com/))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hr-masterdata
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the environment template and populate with your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials (will be provided in Story 1.2):

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `pnpm dev`        | Start development server with hot reload       |
| `pnpm build`      | Build production bundle                        |
| `pnpm start`      | Run production server locally                  |
| `pnpm lint`       | Run ESLint to check code quality               |
| `pnpm type-check` | Run TypeScript compiler without emitting files |
| `pnpm test`       | Run unit tests with Vitest                     |
| `pnpm test:watch` | Run tests in watch mode                        |
| `pnpm format`     | Format code with Prettier                      |

## Project Structure

```
hr-masterdata/
├── src/
│   ├── app/                 # Next.js App Router (routes and pages)
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── api/             # API routes (to be added)
│   ├── components/          # React components (to be added)
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Shared libraries (to be added)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── services/        # Frontend API services
│   │   ├── server/          # Server-only code
│   │   └── utils/           # Utility functions
│   └── styles/
│       └── globals.css      # Global styles and Tailwind imports
├── public/                  # Static assets
├── tests/                   # Test files (to be added)
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── .env.example             # Environment variable template
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── vitest.config.ts         # Vitest test configuration
└── package.json             # Dependencies and scripts
```

## Deployment

This project is configured for deployment on Vercel.

**Production URL:** (To be added after deployment)

### Deploy to Vercel

1. Install Vercel CLI: `pnpm add -g vercel`
2. Link project: `vercel link`
3. Deploy: `vercel --prod`

Or connect your GitHub repository to Vercel for automatic deployments on push to `main`.

## Contributing

This is a private project. For development guidelines, see:

- [Coding Standards](docs/architecture/coding-standards.md)
- [Development Workflow](docs/architecture/development-workflow.md)
- [Tech Stack](docs/architecture/tech-stack.md)

## License

Proprietary - All rights reserved
