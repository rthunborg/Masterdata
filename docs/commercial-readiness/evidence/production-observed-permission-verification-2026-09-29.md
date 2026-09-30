# Verified run 3 - local verification

This public record is derived only from redacted local gate receipts and logs. The retained run-2 full-Vitest failure and the early run-3 nine-file preflight failure remain non-passing historical evidence. It records local verification; it does not authorize production access, staging merge, deployment, or any hosted action.

- Source: 00fd3081982ce41918f8656f21bd64c923cde901 (clean and unchanged for every source-00fd gate receipt)
- Focused PostgreSQL-oracle batch: 77/77 across 5 files in 1501 ms
- Full Vitest: 4516/4516 in 1433510 ms, from 2026-09-29T16:13:21.214Z through 2026-09-29T16:37:14.724Z; matrix 8/8
- Playwright: 163 passed, 47 historical skips, 0 failed, 0 errors in 1037487 ms. Individual-skip proof is bound by the skipped-identity and result-tuple hashes in the public JSON.
- Quality: build 19460 ms; TypeScript 13096 ms; ESLint 0 errors and 304 warnings in 39017 ms
- Fixture chronology: initial template-58 history-free state was repaired in 23853 ms; the current local template-63 history-free forward completed in 1928 ms. This does not claim that the canonical PostgreSQL target is currently at version 58.
- Historical failures: run 2 full Vitest exited 1 after 1430634 ms (9 failed files; 1 failed tests); the early nine-file run-3 preflight exited 1 after 55110 ms (1 failed file; 40 passed tests).
- Historical preflight initialization stopped before database access; its receipt has no native exit value, while the root-observed process exit was 1.
- Production diagnostics: five non-admitting attempts remain non-admitting; three read-only platform GET observations retain realtimePrivateOnly=UNKNOWN and readiness assessed as false.

Evidence SHA-256: bf03bfac2811b35d3d1add66379d23163df7646e0be3abd4d103f7d3f475a871

Suggested status and next action are in the companion external file.
