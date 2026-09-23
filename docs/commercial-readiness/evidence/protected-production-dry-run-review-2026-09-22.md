# PR #113 local BMAD review triage

Reviewed implementation: 7bc00317e790dc3226367ee7a333b805b9d59be1, base 8aec3140677e436392f85a1b5fb8026e06f23437. Four independent layers completed: blind review, edge cases, verification gaps, acceptance audit. The edge review returned a valid empty finding list. This is not the final external Codex review.

Findings were checked against the complete installer, host, loader, package builder, inherited inventory and wrapper contracts, native fixtures and active evidence. No human decision is needed. The user's standing instruction authorizes the following patches without a new confirmation.

| Finding | Severity and disposition | Evidence / action |
| --- | --- | --- |
| Caller-supplied package digest is not independently approved by installer | Dismiss | Independently reviewed release record and trusted release operator are explicitly outside the installer boundary; arbitrary hashes are explicitly not approval. Do not claim self-attested approval. |
| Independent link path not restricted to one record location | Dismiss | Independently approved path/hash is a trusted install input, held by ACL/hash lease and required to match the decrypted production reference. It cannot select a different runtime target. |
| Embedded signing key and generated launcher lack a separate approval-record reader | Dismiss | Trusted installer emits launcher and package hashes; immutable host embeds reviewed file map, checks own location, leases itself and dependencies. Current user/Admin/SYSTEM are explicitly trusted. This is not a defense against the release operator. |
| Duplicate package-manifest properties | Dismiss | Only exact externally approved digest from the canonical reviewed builder is admitted. The builder serializes unique keys. Arbitrary caller-generated packages are not approved artifacts; private decrypted JSON does separately reject duplicate keys. |
| Relative package directory accepted | Dismiss | Each file is canonicalized, bounded, checked for ancestor reparse points and digest-bound before materialization. Installation target is fixed; source path spelling is not authority. |
| Offline output-parent replacement race | Dismiss | Offline package contains no private data or operation authority. Installer independently checks all retained bytes, exact inventory and external digest before executing compilation. Trusted current user remains in boundary. |
| Runtime closure omits inherited wrapper imports | Dismiss | Existing protected inventory validates exact wrapper/catalog/target modules and PapaParse. New closure checks worker/admission imports. Captured PapaParse bytes are now directly bound to those approved hashes before materialization. |
| Fresh working-directory ACLs not checked | Dismiss | Host acquires ProtectedFileLease on every work file and checks inventory after copying, before passing the signed packet. Lease verifies ACL/owner/ancestors. |
| Certificate record dates not used as certificate validation | Dismiss | Loader explicitly checks captured metadata/hash only. Connection uses reviewed wrapper and verify-full TLS; synthetic certificate fixture is not real CA or live TLS proof. Operational target/TLS verification remains outstanding. |
| Input reads before lease permit swap/restore | Dismiss | Captured hashes are verified by the held lease; files are reread and compared before DPAPI decrypt. Replacing and restoring different bytes cannot satisfy both checks. |
| No-hosted-access wording confused capability and verification | Medium, patch | Explain that installed launcher can load real fixed-root inputs and perform the constrained hosted dry run; no actual private/hosted access occurred during synthetic verification. |
| Current evidence contradicts focused/full receipts (acceptance audit duplicates) | Medium, patch | Replace stale no-receipt claims with exact source-bound full results after the active Playwright completes. Preserve earlier failed attempts and superseded results as history. |
| PR #112 pending-review snapshot reads as current | Medium, patch | Mark the spec paragraph historical and superseded by the reviewed merge recorded immediately afterward. |
| Synthetic CLI/certificate do not prove production execution | Dismiss | This is an explicitly synthetic boundary component; production-profile, real target/TLS, transaction/history, isolation and hosted execution remain separate outstanding gates. No readiness claim follows. |
| Invalid decrypted passwords lack native regression cases | Medium, patch | Test empty, placeholder and NUL/CR/LF payloads with valid fresh encryption/integrity metadata; require rejection before an environment can be returned. |
| Nonzero launcher arguments lack native regression case | Medium, patch | Invoke synthetic compiled host with an argument, require refusal and prove no fake CLI call. |

Five patches, eleven dismissed findings after merging the two acceptance-audit duplicates into the evidence item. No deferred pre-existing defect or owner decision. Runtime behavior did not need a change after 7bc0031; additional tests and evidence must still pass before final-head review.

## Follow-up resolution

All five patches are resolved in the final local evidence. Test/evidence head 602a3cd9d9c964a494bb4bcd8cc636a65e31f6cb passed full Vitest 3,769/3,769 with zero skips/failures, TypeScript and zero-error lint; production implementation remains byte-identical to 7bc0031, whose exact full Playwright passed 163 with 47 classified skips and zero failures/errors. The verification-gap reviewer rechecked the test-only delta and found both gaps resolved. Exact final-head external review remains a separate merge prerequisite, recorded on PR #113.
