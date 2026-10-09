# ExcelJS Node compatibility patch

`exceljs@4.4.0.patch` is a locally maintained patch for the application's Node-only employee XLSX export. It replaces ExcelJS's two UUID-v4 calls in its conditional-format extension transform with `node:crypto.randomUUID()`, preserving uppercase, braced identifiers. The version-scoped pnpm override removes the unused `uuid` dependency; the pnpm lockfile binds the patch hash. Install with the repository's pinned pnpm 10.19.0 and the frozen lockfile.

This is not an upstream-supported ExcelJS upgrade. The distributed `exceljs/dist/*` browser/ES5 bundles are not patched or supported by this dependency closure. Do not import them or add client-side ExcelJS usage without a separate bundle/upstream remediation and compatibility review. The application uses the bare `exceljs` Node entry only in `src/app/api/employees/export/route.ts`, whose runtime is explicitly `nodejs`. A regression test guards this boundary.

`randomUUID()` requires Node 14.17 or newer; Next 16's Node 20.9 minimum exceeds that requirement. The local patch therefore narrows ExcelJS's legacy-runtime compatibility to this application's supported runtime. An ExcelJS version change requires re-reviewing the patch and dependency override together.

Regression coverage: actual XLSX extension generation and reopening, distinct UUID-v4 x14 identifiers, source/import boundary, and the existing real employee-export round trip. Recheck the production dependency audit and full release suites after dependency changes.
