# Protected toolchain draft: native injection blocker — 2026-09-21

Status: incomplete draft, not release-ready. Story 22.15 remains in-progress; Epic 23 remains on-hold. Production remains paused/no-go.

Source staging is `5a67cd26ad4c3900c219c8c363cb856aa179c92c` (reviewed PR #111 merge). Main is unchanged at `822350986f4c023948a7bbf490ddffc371185c4a`. This draft has not been pushed, reviewed, merged or used with any hosted target.

## Draft scope and trust boundary

The draft adds an offline fixed-module inventory, a package-digest-bound Windows installer, a compiled fixed-path launcher, and an inherited-pipe version-verification worker. It only offers `--version` through the existing reviewed Supabase CLI wrapper. It has no DPAPI loader, credential handoff, target, database command, isolation attestation or production apply mode. Existing private entry-point denials and production non-dry-run refusal remain unchanged.

The package digest must come from an independently reviewed package record. Arbitrary caller-provided digests do not prove approval. The current operating-system user, local Administrators, SYSTEM and the Windows runtime are trusted. This draft does not establish origin against a malicious current user or administrator. The package is not an application deployment or a completed protected production runner.

## Verification and retained failures

- Independent focused inventory/private-denial/admission tests: 36 passed, zero failed/skipped, exit 0, 34.75 seconds, on the draft working tree.
- TypeScript: exit 0. Scoped ESLint and whitespace checks: exit 0.
- Latest native fixture attempt with reviewed Node 24.19.0: one failed setup suite; all 23 cases were setup-failure skips, not Windows-platform skips and not passes; exit 1, 6.66 seconds. The host refused at native module admission before CLI dispatch.
- Earlier native fixture attempts exposed PowerShell exit-code capture and CodeDOM source-array binding issues, corrected locally. An overly specific draft Node-version predicate was removed: the externally reviewed package digest binds the exact runtime bytes. The preceding Node 22 attempt and all failed attempts remain failures, not substitute evidence.
- Full Vitest, exact full Playwright, build and final review have not passed for this draft. Prior PR #111 results do not satisfy these gates.

A bounded, synthetic worker inspection confirmed `windhawk.dll`, several Windhawk mod DLLs, and `.whl` runtime libraries loaded outside the expected installation and System32. No private target data was accessed. The draft correctly refused; no extra library was allowlisted and no user-owned program or setting was changed. The pre-launch native dependency/search policy, launcher process containment details and complete positive Windows fixture still require review and proof before this component can be accepted. A post-start module check is a refusal gate, not proof that unknown code never executed.

## Required environment decision

Windhawk documents a Process exclusion list in Settings → Advanced settings → More advanced settings, with path patterns. A narrowly scoped proposed exclusion is `%USERPROFILE%\.hr-masterdata-toolchain-*\*`, covering only these retained synthetic/dedicated toolchain installations. Preserve every existing exclusion and all other application settings. The owner must decide whether to apply that local application-setting change or use a clean supported Windows test environment. The agent has not changed it.

After the decision, recreate/relaunch the bounded fixture and verify that the injected modules are absent; do not infer success from the setting alone. Continue implementation review, negative tests, full local suites and exact-head review before any PR acceptance. No unrelated application, Docker Desktop, Windows-wide injection policy or production setting should be altered as a workaround.

[Windhawk official injection/exclusion documentation](https://github.com/ramensoftware/windhawk/wiki/Injection-targets-and-critical-system-processes).

The production isolation proposal still requires separate authorization: retained page/API/job pause, Data API and Realtime shutdown, operator-only PostgreSQL/pooler ingress, non-operator rejection probes, operator TLS/target proof, and all other consumers accounted for. No such hosted change was made. The 48-filter cleanup, 55-row unsigned proof ledger, reviewed bootstrap, history repair, main merge, deployment and reopening gates remain open.
