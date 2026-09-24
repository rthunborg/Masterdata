# Production pause artifact

This tracked source builds the static production-pause artifact. It is intentionally
separate from the Next.js application and contains no deployment identifiers,
project linkage, credentials, deployment state, or customer data.

`production-pause-lock.json` remains `paused` until the owner explicitly authorizes
reopening production. While it is paused, normal Vercel production builds are ignored
and a forced Next.js application build fails. Preview deployments, including staging,
remain available.

The nightly backup/staging-refresh workflow also reads this lock in a separate
job before its Production job can receive credentials. It rejects a manually
selected branch or tag before checkout, checks the current default branch, and
pins the Production job checkout to that gate's exact SHA. Scheduled and manual
runs remain blocked while paused, including backup storage pruning and staging
refresh. A separate checkout-free, secret-free failure-alert job opens or
appends the existing `backup-failure` issue when the gate or backup job actually
fails; intentional pause and unapproved-ref skips do not alert. This source
guard only applies to workflow revisions containing it;
the entire active old-main workflow must be separately disabled during the
release window, covering scheduled runs and manual dispatch. Verify the hosted
workflow state is disabled and no run remains queued or active. A staging merge
does not change the default-branch workflow.

Build the artifact only from a reviewed checkout:

```powershell
node src/maintenance/build.mjs
npx vitest run src/maintenance
```

The generated artifact is confined to the ignored `output/production-pause` directory.
It contains only static assets and Build Output configuration, has no functions, and
declares no cron jobs. The build deletes that exact generated directory before writing
the allowlisted tree so stale functions or linkage metadata cannot be deployed.

Do not commit generated output, `.vercel` linkage files, or a deployment-state record.
Before any production-target command, obtain the owner approval required by the cutover
runbook and independently verify the target, aliases, cron definitions, and artifact
contents. A direct platform-admin action or a manual prebuilt production upload can
bypass repository build guards, so it remains a separate explicit approval gate.

When reopening has been explicitly approved, change the lock through a reviewed change
with a bounded `reopeningDecision` record of that authorization, and restore the reviewed application cron entries recorded in
`application-crons-when-reopened.json`. Recheck deployment behavior before assigning
production domains.

Custom Vercel environments use VERCEL_ENV=preview with a named VERCEL_TARGET_ENV (for example staging). Both build guards share the deployment-class and lock policy; naming a custom target never overrides a production marker.
