# Protected production live-isolation preparation — 2026-10-02

Production remains **paused/no-go**. Story 22.15 is **in-progress**; Epic 23 is **on-hold**.

PR #125 final reviewed head 93e22f3e6ee631de955ce3d20ee11b1b2e0c9368 merged as staging 7ff8a1b585bfbd28b3c2d85d2911408ab2b4c128. The exact merge tree e3ba7479d3d689bc4142c98f0dd337a9da4a57fd matches the reviewed head. No intervening commits were found on the final fetch. Main remains 822350986f4c023948a7bbf490ddffc371185c4a. Exact-head GitHub and both Vercel checks were green; independent review was clean; final Reviewbot response issuecomment 5949707561 reviewed 93e22f3e6e and reported no major issues. This standing-authorized staging merge adds no production action authorization.

The new source implements a fixed native/worker isolation capability, encrypted immutable prior state, read-only target/TLS/aggregate probes, actual Realtime subscription/close/upgrade probes, exact provider network denial, operator-network restoration in finally, strict redacted output and complete module admission. Its output is controls-only. The application/job pause, post-cleanup writer correlation and final independent drain remain required by the existing strict five-plane gate.

## Local draft evidence and limits

These are working-tree component results, not yet clean-commit full-suite or executable-package admission:

- Complete focused isolation set: 84 passed, 12 files, zero skips/failures, report 2.75 seconds. Native slow-drip deadline assertions added afterward passed a separate 4/4 native subset; the complete final-source focused gate will be rerun.
- TypeScript exit 0; full ESLint exit 0, zero errors and 305 warnings. Earlier draft lint exit 1 (three permissive test-type errors) is retained; those errors were fixed.
- Actual frozen hoisted dependency install: pinned pnpm 10.19.0, 724 packages, no package scripts, exit 0, 28.6 seconds. Initial incomplete metadata copy refused frozen install because workspace overrides were omitted; the reviewed workspace configuration/patch were then included without changing the lockfile.
- Actual runtime package graph inventory: ten exact packages, 488 full package files, current raw module graph accepted. This proves the independently inspected runtime layout; it is not a materialized source-bound executable package or owner adoption.
- Native actual host/core/lease/input/private-runtime compilation and installer-source-generated contract compilation pass offline. Installer refusal tests stop before private records or materialization. DPAPI test uses synthetic prior state only. ESM/CommonJS regressions reject modified or escaped modules before execution.
- Earlier draft test failures (Windows import file-URL handling and a synthetic PowerShell reflection argument wrapper) are retained in support logs and resolved. No failed run is described as passing.
- An earlier unconfigured full Vitest attempt by a subagent exited 1: 4,474 passed, 110 skipped, seven failed; 360 passed files, seven skipped, twelve failed, total 379; report 373.54 seconds. No durable raw log was captured for that attempt, so this record is limited to the agent-reported tool output. It is not full-suite evidence, does not classify those skips as historical, and did not admit gated fixture bodies. Fresh configured full suites remain pending.

No actual installer, encrypted production inputs, local backups, hosted database, hosted Management query/control, deployment, hosted setting, main merge or reopening was accessed/executed during this preparation. Local fixture resource reuse is independently validated before the full gates. Native Windows-only skips on another platform do not count as passes.

The previous dependency full suites remain exact-source historical evidence at cc65498745792c3727a8ecf6bb5b7da847b75841. They do not verify this new isolation source. All immutable migrations, manifest, strict catalog behavior, frozen intent and portable production pause remain unchanged.

## Next gate

Complete and bind clean-source full suites, package materialization, quality/build/pause checks and final source review. Prepare the exact reviewed private package/admission without publishing private identifiers. Obtain the separate exact installation/control approval before hosted isolation changes. Then prove full five-plane isolation and target admission before separately gated 48-filter cleanup and fourteen reviewed forward executes. Strict catalog 16/16, canonical 69 and preservation precede owner adoption and separate 55-row history repair. Main, deployment, settings restoration and reopening remain separate explicit decisions.

[Capability and future private record contract](../../../src/lib/release/production-isolation.md)
