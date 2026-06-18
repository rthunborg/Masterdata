# Project: hr-masterdata

HR Masterdata Management System for Stena Line seasonal recruitment. Single-stack Next.js 16 application with Supabase (PostgreSQL) backend. Replaces Excel-based HR data with a centralized web app featuring RBAC, real-time sync, and external party access (Sodexo, ÖMC, Payroll, Toplux, Crewing). Swedish copy. Tech: TypeScript 5.9, React 19, Tailwind CSS 4, Radix UI, Zustand, TanStack Query, Zod, Vitest, Playwright.

## Project Index (Reference Only)

DO NOT read these files unconditionally. Use this index to know where to look ONLY if you are missing specific context to complete your current task:

| Document | Path | What it tells you |
|----------|------|-------------------|
| **Product Requirements** | `docs/prd.md` | User journeys, FRs, NFRs, scope, phasing |
| **Architecture** | `docs/architecture.md` | Tech decisions, project structure, patterns, boundaries |
| **Epics & Stories** | `docs/epics.md` | Implementation breakdown and FR coverage map |
| **Sprint Status** | `docs/sprint-artifacts/sprint-status.yaml` | Active epic pointer and current sprint/story progress |
| **Story Files** | `docs/sprint-artifacts/` | Individual story acceptance criteria and technical details |

## How We Work (BMAD Workflow)

This project uses the BMAD framework (Breakthrough Method of Agile AI-Driven Development).

## Local Docker / WSL Rules

- Run Docker-heavy commands from WSL/Linux filesystem paths such as `/home/rasmus/repos/hr-masterdata`; avoid `/mnt/c/...` and `/mnt/d/...` for database-heavy workflows.
- Use the project files: `compose.yaml` for persistent local Compose services, `compose.test.yaml` for disposable test Compose services, and `supabase/config.toml` for the local Supabase CLI stack.
- Do not start ad hoc containers with fixed `container_name` values or hard-coded host ports. Keep resources project-scoped with `COMPOSE_PROJECT_NAME=hr-masterdata` or the Supabase project id `hr-masterdata`.
- Use service names inside Compose networks, for example `mailpit:1025`; use `127.0.0.1` only from host-run processes.
- Stop Compose services with `docker compose down`; reset Compose volumes with `docker compose down -v`.
- Stop only this repo's Supabase stack with `supabase stop --project-id hr-masterdata`; reset local Supabase data with `supabase db reset` or `supabase stop --project-id hr-masterdata --no-backup`.
- Do not create global Docker networks, global volumes, Docker Desktop settings, WSL settings, or daemon-level changes unless explicitly asked.

1. **Check sprint status** — Read `docs/sprint-artifacts/sprint-status.yaml`, then open its `current_focus.active_epic_status_file` to understand what's done, in-progress, ready-for-dev, and next.
2. **Read the story file** — Before implementing, read the specific story `.md` in `docs/sprint-artifacts/`. It contains acceptance criteria, technical notes, and scope boundaries.
3. **Implement exactly to spec** — Follow the story's acceptance criteria. Do not add features not specified in the story.
4. **Verify against DoD** — Every story must meet: RBAC enforcement via Supabase RLS, WCAG 2.1 AA contrast, Swedish i18n coverage, and Zod schema validation.
5. **Mark status changes everywhere** — Whenever any story status changes (`ready-for-dev`, `in-progress`, `review`, `done`, `blocked`, or equivalent), update every status surface listed in **Sprint Artifact Synchronization (Mandatory)** before reporting the change.

### Sprint Artifact Synchronization (Mandatory)

Story status is duplicated across human-facing planning docs and BMAD tool-facing generated artifacts. A story status change is not complete until all applicable copies are updated and verified.

For every story status change, update these files in the same turn:

1. **Story file:** `docs/sprint-artifacts/story-<id>.md`
   - Update `## Status`.
   - Update allowed story sections such as Tasks/Subtasks, Dev Agent Record, File List, Change Log, and notes about any test-gate waiver or blocker.
2. **Active epic status file:** Read `docs/sprint-artifacts/sprint-status.yaml`, then update the file referenced by `current_focus.active_epic_status_file`.
   - Update the story row status, assignee, dates, blockers, notes, test counts, and progress summary counts.
3. **High-level sprint status:** `docs/sprint-artifacts/sprint-status.yaml`
   - Update it when the active epic pointer, active epic status, next actions, or cross-epic planning state changes.
4. **BMAD implementation status:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
   - Update `development_status` for the matching story key (for example `22-1-protect-or-remove-public-diagnostic-endpoints`).
   - This file is required because BMAD review workflows scan it for stories in `review`.
5. **BMAD implementation story artifact, if present:** any matching story file under `_bmad-output/implementation-artifacts/`
   - Keep its status and completion notes aligned with the `docs/sprint-artifacts/` story file.

Verification rules:

- Do not rely on `git status` to prove these updates happened. `docs/` and `_bmad-output/` may be ignored by Git.
- After updating status, explicitly re-read or search the affected files and confirm the same story has the same status everywhere.
- If a gate is waived or environment-blocked, record that fact in every relevant story/status artifact instead of silently marking the gate as passed.
- If any required status surface is missing or cannot be updated, report the missing file as a blocker and do not claim the story was fully moved.

### Test Requirements (Mandatory for All Code Changes)

Every code change — whether new feature, refactor, or bugfix — MUST satisfy ALL of the following before a story can be considered complete:

1. **New tests required.** Any new functionality MUST include corresponding unit tests (Vitest) and/or integration/e2e tests (Playwright) that cover its acceptance criteria. No code-only commits without tests.
2. **Existing tests updated.** If a change modifies behavior that existing tests rely on, those tests MUST be updated to reflect the new behavior. Letting old tests break is not acceptable — fix them as part of the same story.
3. **Full test suite passes.** Before marking a story as done, the FULL test suite must pass:
   - Unit tests: `npx vitest run`
   - E2E tests (if applicable): `npx playwright test`
   - If either command returns a non-zero exit code, the story is **NOT done**. Fix failures before proceeding.
4. **Linting clean.** If linters are configured, they must also pass with zero errors.

**If tests fail, the implementing agent must fix them before reporting completion.** The Lead Agent will independently verify by running the test commands before accepting any story as done.

## Agent Team Orchestration (Codex Subagents)

You are the **Lead Agent**. Your job is to orchestrate specialized BMAD work using Codex built-in subagents when that is useful, or to execute the work directly when a subagent would not add value.

Story work should start from the BMAD story/status artifacts and use Codex built-in subagents where delegation is useful.

For every pending story:

1. **Prepare Context:** Read the sprint status, active epic status file, and target story file. If delegating to a Codex subagent, provide only the relevant story file, acceptance criteria, Dev Notes, status synchronization requirements, and test requirements.
2. **Use Installed BMAD Personas:** Prefer the project-local BMAD agent skill files under `.agents/skills/` as persona context, for example `.agents/skills/bmad-agent-dev/SKILL.md` for the Dev agent. If the expected project-local skill is missing, reinstall BMAD for this project before continuing.
3. **Enforce Boundaries:** All code lives under `src/`. API routes go in `src/app/api/`, components in `src/components/`, and shared logic in `src/lib/`. No standalone backend service — this is a single Next.js app with Supabase.
4. **Dev-Agent Test Directive:** Every Dev agent task, whether handled by a Codex subagent or directly by the Lead Agent, must include this directive: *"You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0."*
5. **Test Gate (Lead Agent Verification):** After implementation is reported complete, the Lead Agent MUST independently run the required tests before accepting the result:
   ```bash
   npx vitest run 2>&1; echo "EXIT:$?"
   npx playwright test 2>&1; echo "EXIT:$?"
   ```
   - If BOTH exit with `EXIT:0` → proceed to mark done or review according to the active workflow.
   - If ANY exit non-zero → do NOT mark done. Fix the failures directly or delegate a fix-only Codex subagent task with the failing output. Repeat until green.
   - For docs-only stories with no code changes and estimated tests of `0`, automated tests may be waived only when the story explicitly allows it. Record the waiver and run the targeted quality checks required by the story.
6. **Mark Status & Continue:** Only after the applicable test or waiver gate passes, update every required status artifact from **Sprint Artifact Synchronization (Mandatory)**. Then continue to the next pending story unless there are no stories left or a critical blocker occurs.
