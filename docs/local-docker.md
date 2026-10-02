# Local Docker And WSL

This repo is a Next.js app backed by Supabase. The real local database dependency is the Supabase CLI Docker stack because the app and Playwright tests require Auth, PostgREST, Realtime, and Postgres. The project Compose files provide local SMTP capture for app emails.

## Prerequisites

- Docker Desktop with WSL2 enabled.
- Node.js and pnpm installed.
- Supabase CLI available as `supabase`.
- For Docker-heavy work, keep the repo under the Linux filesystem, for example `/home/rasmus/repos/hr-masterdata`, not `/mnt/c/...` or `/mnt/d/...`.

## Ports

| Service | Default host port | Override |
| --- | ---: | --- |
| Supabase API/Kong | `15421` | `supabase/config.toml` |
| Supabase Postgres | `15422` | `supabase/config.toml` |
| Supabase Studio | `15423` | `supabase/config.toml` |
| Supabase Inbucket UI | `15424` | `supabase/config.toml` |
| Supabase Inbucket SMTP | `15425` | `supabase/config.toml` |
| Supabase Inbucket POP3 | `15426` | `supabase/config.toml` |
| Supabase Analytics | `15427` | `supabase/config.toml` |
| Mailpit SMTP | `11025` | `.env` `MAILPIT_SMTP_PORT` |
| Mailpit Web UI | `18025` | `.env` `MAILPIT_WEB_PORT` |
| Mailpit test SMTP | `11026` | `.env` `MAILPIT_TEST_SMTP_PORT` |
| Mailpit test Web UI | `18026` | `.env` `MAILPIT_TEST_WEB_PORT` |
| Playwright app server | `13100` | `.env.test` or shell `E2E_PORT` |

Supabase CLI publishes its local ports itself. The project config uses high ports to avoid the default `54321`/`54322` collisions across repositories.

## Start Development Infrastructure

If an older local Supabase stack is already running on `54321`/`54322`, restart it once so Docker recreates the port bindings from `supabase/config.toml`:

```bash
pnpm supabase:stop
pnpm supabase:start
```

```bash
cp .env.example .env.local
pnpm install
pnpm supabase:start
pnpm docker:up
pnpm dev
```

Use `pnpm supabase:start:full` when you need Studio and the optional Supabase services. The default `pnpm supabase:start` excludes heavier optional services and keeps Auth, REST, Realtime, Postgres, Kong, and local auth email support.

Local app SMTP goes to Mailpit:

- SMTP endpoint for host-run app: `127.0.0.1:11025`
- Web UI: `http://127.0.0.1:18025`

Inside a Compose network, use `mailpit:1025` instead of localhost.

## Run Tests

For unit and mocked integration tests:

```bash
pnpm test
pnpm test:integration
```

For Playwright E2E tests, start local Supabase first. The test setup refuses production Supabase resources.

```bash
pnpm supabase:start
pnpm supabase:reset
$env:E2E_PORT="13100"; pnpm test:e2e
```

In WSL/bash:

```bash
E2E_PORT=13100 pnpm test:e2e
```

The app email service is disabled during Playwright by `playwright.config.ts`. Use `compose.test.yaml` only when a focused test needs disposable SMTP capture:

```bash
pnpm docker:test:up
pnpm docker:test:down
```

## Teardown And Reset

Stop Compose-managed Mailpit:

```bash
pnpm docker:down
```

Delete the persistent Mailpit volume:

```bash
pnpm docker:reset
```

Stop this repo's Supabase CLI stack:

```bash
pnpm supabase:stop
```

Reset the local Supabase database to tracked migrations:

```bash
pnpm supabase:reset
```

Delete this repo's Supabase local volumes:

```bash
supabase stop --project-id hr-masterdata --no-backup
```

Do not use `supabase stop --all` on this machine unless explicitly asked; it can stop other repositories' local Supabase stacks.

## Persistence Model

- `compose.yaml` uses a Docker named volume for Mailpit messages so manual local email inspection survives restarts.
- `compose.test.yaml` uses `tmpfs` for Mailpit data so test SMTP state is disposable.
- The Supabase CLI stack uses Docker named volumes for local database state. Use `pnpm supabase:reset` to recreate schema/data from migrations, or `supabase stop --project-id hr-masterdata --no-backup` for a full local DB reset.

## Agent Rules

- Run Docker-heavy commands from WSL/Linux paths such as `/home/rasmus/repos/hr-masterdata`.
- Use the project Compose files and Supabase CLI config; do not start ad hoc containers with fixed names or fixed host ports.
- Use Compose service names inside Compose networks, for example `mailpit:1025`.
- Do not create external Docker networks, global named volumes, daemon settings, or Docker Desktop/WSL settings unless explicitly requested.
