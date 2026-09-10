# Production pause release safeguards

> **Current execution record — 2026-09-10 15:14 UTC.** PR #98 approved head ac38f8e874b61948809c5dfdb09ca2df054da254 merged to staging 62a52e32aae8302d6c6be4b35ec39da298c5061c with an identical tree. Authorized correction 20260910115024 applied at 2026-09-10T15:12:39.328Z; immediate history was 66/66 with no pending or remote-only versions. Strict post_apply catalog passes 15/15, security advisors report 0 WARN+ within pinned CLI coverage, performance retains only 3 classified multiple_permissive_policies WARN, and repayment aggregates/all four permission hashes are unchanged. Hosted direct-role/RPC acceptance and owner staging verification remain open. Production requires fresh inventory, signed history-proof ledger, backup and separately authorized history repair/isolation/settings/deployment; the owner has supplied standing authorization for required future migration applies, subject to reviewed prerequisites. Production remains paused; reopening and staging/main merges require separate authorization. Story 22.15 remains in-progress; Epic 23 on hold. [Completed reconciliation evidence](evidence/staging-reconciliation-completed-2026-09-10.md). This record supersedes earlier statements that PR #98 review, its merge, the correction apply or migration-apply authorization are pending; earlier dated entries remain historical.


Status: preparation only, 2026-09-09. Story 22.15 remains in-progress; Epic 23 remains on hold. Production stays paused until a separate explicit owner reopening decision.

## Versioned controls

The tracked source under src/maintenance replaces dependence on an untracked workstation copy. The current static production deployment is unchanged. The committed production-pause-lock.json has state paused. A normal Vercel production Git build is ignored; the active next.config.mjs independently refuses a forced production application build. Staging/preview remains an application test environment. Missing, malformed or conflicting deployment-target signals fail closed when Vercel markers are present. Local builds remain available for testing; they do not authorize uploading their output.

Root vercel.json has an empty cron array. The old schedules are recorded in the inert application-crons-when-reopened.json and cannot schedule jobs by themselves. The portable static artifact has no functions, no application code, no linkage record, and no cron definitions. Ordered routes return the pause page for page GET/HEAD requests and HTTP 503 for API routes (including cron endpoints) and POST/PUT/PATCH/DELETE/OPTIONS requests. The API response has Retry-After and no-store headers. No secret or deployed target identifier belongs in this directory.

Build with node src/maintenance/build.mjs from the reviewed checkout. The builder removes only its checked generated output directory, rejects linked ancestors, and verifies the final exact file allowlist. Stale functions or metadata cannot survive the rebuild. Tests cover the real default Windows output path, junction rejection, routed API/mutation/page requests, target-marker failures, pause lock and cron configuration. These local routing assertions are not proof of a new hosted artifact; actual platform responses must be checked after any separately approved deployment.

## Before a future staging-to-main merge

1. Record the exact reviewed staging SHA, passing tests and final review. Verify the lock remains paused, both build guards remain active, and root crons remain empty in the proposed merge tree.
2. Recheck the private current production deployment identity, aliases, auto-domain assignment and active cron definitions. Record redacted booleans/hashes and UTC times. Stop on any unexplained change.
3. Obtain explicit owner approval for that exact main merge. A staging merge approval never authorizes main.
4. Confirm the merge did not replace the production target or recreate jobs. If a production build was unexpectedly accepted, stop and report; do not promote or repair settings without approval.

## Separate deployment gate

No deployment is needed to complete this preparation or preserve the present pause. If the owner later requests replacing the static pause artifact, first build and inspect the exact reviewed output and present the target, alias/cron impact, response checks, and rollback plan privately for approval. Production-targeted uploads can change default aliases or cron definitions even when custom-domain auto-assignment is disabled. Treat deploy, promote, rollback and prebuilt uploads as hosted actions, including uploads without ordinary custom-domain promotion. Never assume a flag makes such an upload harmless.

Repository guards do not control platform administrators, promotion of an older preview, or locally generated prebuilt output. Those paths remain explicit approval gates and require artifact and target inspection. Do not upload a staging application build to production while paused. Prefer retaining the existing pause and running application smoke in staging. A later production operator-only smoke environment requires its own reviewed isolation design and deployment authorization; the current paused lock cannot be bypassed for convenience.

After an approved static deployment, verify the recorded target/aliases, nested page and login GET/HEAD routes, API GET/OPTIONS, page POST and API mutation requests, no functions and zero active cron definitions. Record exact artifact/commit hashes and results without private identifiers. A failure keeps production paused and requires a separate owner decision about rollback.

## Reopening gate

Database reconciliation, a passing PR, staging merge or main merge does not authorize reopening. After the owner separately authorizes reopening, prepare a reviewed change with a bounded reopeningDecision record and state reopening-authorized, review the application schedules against current requirements, and restore only explicitly approved jobs. Recheck production data/security readiness, notification delivery, environment binding, deployment behavior and rollback before requesting the exact application deployment/domain-assignment approval. Do not infer reopening from the owner's willingness to accept data loss as a recovery tradeoff.

The owner's reported local production backup and requested usage pause are planning context. Neither is a tested restore proof or technical isolation of direct Data API, Realtime, external consumers or older deployments. The database cutover runbook retains its separate inventory, backup, isolation, repair and apply approvals.

## Platform references checked 2026-09-09

Vercel's [ignoreCommand contract](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand) defines build skipping; [Build Output routing](https://vercel.com/docs/build-output-api/configuration#routes) defines ordered method/status routing. [Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs) explains schedule lifecycle. Repository safeguards complement the fresh private deployment-state inspection; they do not replace it.

Named custom preview environments are supported: VERCEL_ENV=preview determines the deployment class while VERCEL_TARGET_ENV can name staging or another custom environment. A production value in either marker remains blocked; custom target names without a recognized base environment, malformed markers, and conflicting built-in classes remain rejected. Both entrypoints share the same target and lock policy. See [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_target_env).
