# Protected production dry-run-only component — 2026-09-22

## Status and scope

PR #112's preceding protected-toolchain component is complete: reviewed final head `e4ab223` merged as staging `8aec314`, with the required GitHub/Vercel checks and Codex review clean. Its earlier local test receipt remains historical evidence for that component.

The next component is **in progress and testing**. There is no final source head, approved package digest, test receipt, review result, hosted target proof, private-input read, database connection, migration operation, deployment, setting change, main merge, or reopening action recorded by this document.

The proposed local-only dry-run path is deliberately narrow:

- an installer materializes an immutable local package from a reviewed package manifest and fixed file list;
- the compiled host owns fixed paths for the private-input root and separately supplied project-link record, retains protected read leases, creates a fresh restricted working directory with only the manifest and thirteen proposed forward migrations, and starts only the fixed worker;
- the worker emits a fresh nonce, accepts one signed exact packet, and can request only the reviewed Supabase CLI dry-run command shape; and
- the result is a redacted planning receipt that marks apply, repair, and cleanup unauthorized.

The private-input interface is local-memory only. It is intended to validate a fixed production/session-pooler/verify-full capture schema, current-user DPAPI protection, record hashes, certificate path/hash metadata and an independent project-link match before producing its minimal wrapper environment. It does not expose a supported general credential API or authorize a network operation by itself.

## Authorization and trust boundary

The package digest must first be recorded in an independently reviewed release record for the exact candidate. The installer is then invoked by the trusted release operator with that record; a caller-supplied digest is not authority on its own. The installer does not establish a production release decision, target admission, or a production write authorization. A future implementation must retain that distinction in the command/runbook and must not describe a structurally valid package receipt as approval.

The trusted current user, local Administrators and SYSTEM remain inside the stated Windows trust boundary. The module scanner and manifest snapshot constrain reviewed file paths, declared static/dynamic imports and file hashes; they do not establish full semantic equivalence, prove every runtime/native dependency, defend against those trusted principals, or replace the wrapper's executable/version/hash, certificate, TLS and three-way target checks. Any unrecognized module, reparse point, unexpected file, writer conflict or packet shape is intended to fail closed.

## Fixture and evidence limits

The planned native fixtures use generated synthetic DPAPI blobs, synthetic certificate bytes, a synthetic project reference and a constrained fake CLI. They must not open the real private input record, certificate, approved project-link record, hosted database, Vercel, or a production deployment. A passing synthetic result only tests the local boundary and failure handling. It cannot prove the real package, the real production profile, migration transaction/history behavior, traffic isolation, data preservation, or a hosted action.

No test result is entered here until the root verification records its exact command, source identity, passed/skipped/failed counts, duration, resource-guard cleanup and retained failures. Linux classification for Windows-only native tests, when applicable, remains non-passing evidence.

## Remaining gates

1. Complete and review exact-head native/local test evidence, including negative packet, command, lease, manifest and receipt-redaction cases.
2. Prove the thirteen-file CLI transaction/history and uncertain-failure matrix against the representative production-profile fixture. A clean canonical chain is insufficient.
3. Recollect fresh production target/TLS/observed-state evidence through the reviewed wrappers, then complete five-plane technical isolation: application and jobs, Data API, Realtime, direct clients and database/pooler access.
4. Obtain a separate exact cleanup approval before changing the 48 orphaned filters; re-prove prerequisites afterward.
5. Resolve the seven strict catalog groups and build independently supported, signed lineage for each of the 55 repair-ledger rows.
6. Complete reviewed implementation, exact prerequisites and strict proof before any standing-authorized required forward migration apply. Separately gate any hosted settings/isolation action, history repair, staging-to-main merge, production deployment and reopening. Preserve the production pause until the explicit reopening decision.

Story 22.15 remains in-progress, Epic 23 remains on hold, and production remains paused/no-go.