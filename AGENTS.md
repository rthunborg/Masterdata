# Project: hr-masterdata

HR Masterdata Management System for Stena Line seasonal recruitment. Single-stack Next.js 16 application with Supabase (PostgreSQL) backend. Replaces Excel-based HR data with a centralized web app featuring RBAC, real-time sync, and external party access (Sodexo, ÖMC, Payroll, Toplux, Crewing). Swedish copy. Tech: TypeScript 5.9, React 19, Tailwind CSS 4, Radix UI, Zustand, TanStack Query, Zod, Vitest, Playwright.

## Project Index (Reference Only)

DO NOT read these files unconditionally. Use this index to know where to look ONLY if you are missing specific context to complete your current task:

| Document | Path | What it tells you |
|----------|------|-------------------|
| **Product Requirements** | `docs/prd.md` | User journeys, FRs, NFRs, scope, phasing |
| **Architecture** | `docs/architecture.md` | Tech decisions, project structure, patterns, boundaries |
| **Epics & Stories** | `docs/epics.md` | Implementation breakdown and FR coverage map |
| **Sprint Status** | `docs/sprint-artifacts/epic-21-sprint-status.yaml` | Current epic/story progress |
| **Story Files** | `docs/sprint-artifacts/` | Individual story acceptance criteria and technical details |

## How We Work (BMAD Workflow)

This project uses the BMAD framework (Breakthrough Method of Agile AI-Driven Development).

1. **Check sprint status** — Read `docs/sprint-artifacts/epic-21-sprint-status.yaml` to understand what's done, in-progress, and next.
2. **Read the story file** — Before implementing, read the specific story `.md` in `docs/sprint-artifacts/`. It contains acceptance criteria, technical notes, and scope boundaries.
3. **Implement exactly to spec** — Follow the story's acceptance criteria. Do not add features not specified in the story.
4. **Verify against DoD** — Every story must meet: RBAC enforcement via Supabase RLS, WCAG 2.1 AA contrast, Swedish i18n coverage, and Zod schema validation.
5. **Mark done** — Update `docs/sprint-artifacts/epic-21-sprint-status.yaml` when a story is complete.

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

## Agent Team Orchestration (The BMAD Runner Tool)

You are the **Lead Agent**. Your job is to orchestrate specialized BMAD sub-agents in a CONTINUOUS LOOP.
**CRITICAL RULE:** You MUST NOT use `TeamCreate`, `TaskCreate`, or `AgentCreate`.

Instead, you have a custom orchestration tool. Follow this exact sequence for EVERY pending story:

1. **Write the Task Brief (Context Diet):** Use the `Write` tool to create a uniquely named task file: `_bmad-output/task-<agent>-<story-id>.txt` (e.g., `task-dev-E1S2.txt`).
   **CRITICAL:** You MUST use the `Read` tool to open the corresponding persona file from `_bmad/bmm/agents/` (e.g., `_bmad/bmm/agents/dev.md`, `_bmad/bmm/agents/pm.md`, or `_bmad/bmm/agents/qa.md`). You MUST copy the ENTIRE contents of that persona file and paste it at the very top of your task file BEFORE adding the specific story instructions. Do not hallucinate or summarize the persona. Tell them to read ONLY their specific target file.
   **MANDATORY TEST INSTRUCTIONS:** Every task brief for a Dev agent MUST include the following directive: *"You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0."*
2. **Spawn the Visual Pane (STRICTLY SEQUENTIAL):** Use the `Bash` tool to execute our native runner script, passing the task file AND a descriptive agent name:
   `bash scripts/bmad-agent-runner.sh _bmad-output/task-dev-21.1.txt "Dev-21.1"`
   **CRITICAL:** You MUST run only ONE agent at a time. Do NOT use parallel tool calling. Wait for the `Bash` tool to return success before spawning the next agent.
3. **Enforce Boundaries:** All code lives under `src/`. API routes go in `src/app/api/`, components in `src/components/`, and shared logic in `src/lib/`. No standalone backend service — this is a single Next.js app with Supabase.
4. **Test Gate (Lead Agent Verification):** After a Dev agent reports a story as complete, you (the Lead Agent) MUST independently run the test suites before accepting the result:
   ```bash
   npx vitest run 2>&1; echo "EXIT:$?"
   npx playwright test 2>&1; echo "EXIT:$?"
   ```
   - If BOTH exit with `EXIT:0` → proceed to mark done.
   - If ANY exit non-zero → do NOT mark done. Re-spawn the Dev agent with a fix-only task brief that includes the failing test output and instructs them to fix all failures without introducing new ones. Repeat until green.
5. **Mark Done & Continue:** Only after the test gate passes, update `sprint-status.yaml`. Then IMMEDIATELY loop back to step 1 for the next pending story. Do not ask the user for permission. Only pause if there are no stories left, or if a critical error occurs.