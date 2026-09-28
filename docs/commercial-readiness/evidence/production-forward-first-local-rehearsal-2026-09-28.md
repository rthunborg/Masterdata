# Production Forward-First Local Rehearsal — 2026-09-28

## Scope

This is a redacted local synthetic rehearsal only. It accessed no hosted
database, private input, backup, Vercel setting, or production target. It is
not a migration approval, a history-repair approval, a production admission,
or evidence that an older migration historically executed.

The migration source was the clean source-pinned commit
`88cf3efcf7fdb8cdbfd00d850da6082b0f6fdd65`. The exercise used the reviewed
Supabase CLI 2.115.0 and a guard-owned local PostgreSQL fixture. Target
connection material, resource identifiers, database names, raw output, and
row data are deliberately omitted.

## Result

`npx vitest run tests/integration/epic-22/story-22.15/production-cli-matrix.test.ts`
completed with exit code 0:

- 8 passed, 0 skipped, 0 failed.
- Test duration: 321.726 seconds.
- Runner duration: 322.92 seconds.
- The eight tests comprise the required-admission assertion and seven
  transaction/history cases.

The successful synthetic post-cleanup case established that the pinned CLI can
apply the isolated ordered 13-version subset when migration history is absent,
then use 55 serial source-bound repair commands to reach exactly 68 history
versions. All 55 repair child outcomes were successful. Independent local
observation found the catalog and preservation fingerprints unchanged across
the repair phase.

The six safety cases completed with their intended outcomes: three stopped
before the guarded current effect, one exposed a committed but unrecorded
current effect, one established rollback without a record, and one remained
uncertain after timeout. None authorizes retry or continuation.

## Limits and next gates

The synthetic fixture is not a production representation. It cannot prove
production cleanup, data preservation, isolation, target binding, or history
semantics beyond the tested CLI/fixture combination. All 55 adoption-ledger
rows remain `UNPROVED` and unsigned until fresh live post-forward strict 16/16,
canonical 68-migration, preservation, and owner-adoption gates complete.

The owner reports that the newest local backup was restore-tested and retained
for rollback. That owner attestation is not independently verified restore
evidence and no backup material is recorded here.
