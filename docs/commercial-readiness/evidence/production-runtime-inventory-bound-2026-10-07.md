# Runtime inventory bound verification — 2026-10-07

Implementation: `123d77cfbfd89e83b92b766e05061df800a577a2`. Reviewed staging base: `570e78ecaf89d01532c11c31d80602af77d3c2da`; main: `822350986f4c023948a7bbf490ddffc371185c4a`. PR #130 is merged with its reviewed tree. This is the local-verification snapshot before final PR review and merge; it is not production admission.

The complete public SDK inventory has 488 entries and is already compact at 72,548 bytes. Its installer preflight rejected the former 65,536-byte bound before materialization. Only the public inventory preflight and copy reads now allow 262,144 bytes. Private records remain capped at 65,536 bytes; exact schema/hash/source/target checks, no-reparse leases and the 512-entry file-map bound remain intact. The later module manifest already has a separate 262,144-byte/1,024-entry limit; no broader reader was changed.

| Gate | Measured result |
| --- | --- |
| Focused native installer | 4 passed, 0 skipped/failed; file duration 1,664.76318359375 ms. Pre-commit bytes subsequently committed; the exact-source full suite independently passed the same cases. |
| Red regression | 3 passed, 1 expected failure, 0 skipped before the reader fix. |
| Full `npx vitest run` | 4,798 passed, 0 skipped/failed, 389 files, exit 0; report 2,076.89s, wrapper 2,118,857ms. |
| Exact `npx playwright test` | 163 passed, 47 historical skips, 0 failures/errors, 210 cases, exit 0; report 1,517.057047s, wrapper 1,531,731ms. |
| TypeScript | `npx tsc --noEmit`, exit 0; elapsed time not recorded. |
| Lint | `npx eslint`, exit 0, 0 errors, 304 existing warnings; elapsed time not recorded. |
| Isolated staging build | `npx next build --webpack`, exit 0, 109,805ms; source unchanged. |

All three full-run/build receipts confirm exact-source identity and no tracked source changes. The inventory regression uses actual installer helper, preflight and copy blocks, tests a realistic 488-entry acceptance and five refusal variants, and verifies copied bytes without invoking the installer. Historical SQL, manifest, catalog and pause code are unchanged. The frozen intent hash remains `6dcb94e4ef41a7ded3a91ae8eb11cb991b822d16657fbdfefe5d5b50f62924bc`; three YAML files parse and all five canonical next-action copies match.

Every one of the 47 skipped Playwright identities matched the preserved historical JUnit by exact ordinal comparison. E2E/configuration bytes are unchanged from tested source `006611cc796078ce34dd2ec1e80ba1d62c72d2d7`. Skips are not passes; the complete identity list and log/JUnit hashes are in the [JSON receipt](production-runtime-inventory-bound-2026-10-07.json). Browser monitors emitted FID/CLS threshold warnings; this result does not prove performance targets.

All seven actual pinned-CLI fault/recovery cases and nine reconciliation integration cases passed locally. Each CLI case began after fresh guard/selected-container identity renewal, with the runner's strict 15-minute admission intact. The initial suite-level renewal gap exceeded 15 minutes before those cases; no continuous all-suite freshness chain is claimed. This is synthetic local rehearsal, not hosted isolation, cleanup, adoption or repair authority.

Fresh read-only production observations at the prior reviewed staging source retain the approved 104-routine initial metadata classification, zero unknown additional login/backend remainders and a separate zero enabled statement-trigger count. They do not prove routine semantics or isolation. Three platform GETs passed; known Auth hooks are disabled, Realtime remains unsuspended and private-only status is unreported. Reviewed native key/network GET checks passed, but write permission is unproved. Their source, times, hashes and limits are retained in the JSON; none silently admits changed-source executable records.

Private byte-identical Git/package copies satisfied native leases without changing system permissions. The proposed prefix passed six lease groups against its prior source-bound artifact, not actual new-source installation or compilation. The owner's approved encrypted-runtime proposal remains bound to its original source/producer/envelope. Fresh source-bound executable admission is still required after reviewed merge.

Stop requests for the completed owned drivers and fixture resources were accepted; `CloseActor` and one subsequent `List` succeeded. Acknowledgments are not shutdown-completion proof. Containers, data and checkouts are retained; no user-owned resource was adopted or stopped.

Production remains **paused/no-go**; Story 22.15 **in-progress**, Epic 23 **on-hold**. Required next gates are exact-final-head review/checks and the standing-authorized reviewed staging merge, fresh source-bound private/executable admission, five-plane isolation, separately gated 48-filter cleanup, fourteen reviewed forwards, strict catalog 16/16/canonical 69/preservation and owner adoption before separate 55-row repair. Seven documented strict catalog groups remain unresolved; this is not a fresh full catalog count. Main merge, deployment, settings restoration and reopening remain separate decisions. No hosted write, hosted setting change, deployment, restoration or reopening occurred. Secure local restore-tested backups remain owner-attested; no backup files were accessed and no agent restore proof is invented.
