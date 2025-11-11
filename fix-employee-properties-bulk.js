const fs = require('fs');
const path = require('path');

// Missing Employee properties to add after is_archived: false,
const missingProps = `repayment_needed_omc: null,
        repayment_needed_pe3: null,
        comments: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,`;

// Pattern: Find is_archived: false, followed by optional comments, then created_at (missing props in between)
const pattern1 =
  /(is_archived:\s*false,)\s*(comments:\s*(?:null|"[^"]*"),)\s*(created_at:)/g;
const pattern2 = /(is_archived:\s*false,)\s*(created_at:)/g;

const files = [
  'tests/integration/api/employees-import-relaxed-validation.test.ts',
  'tests/integration/api/employees-import.test.ts',
  'tests/integration/api/employees.test.ts',
  'tests/integration/components/employee-table-permissions.test.tsx',
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/date-capacity-concurrency.test.ts',
  'tests/integration/realtime-sync.test.tsx',
  'tests/integration/talmundo-conditional-edit.test.ts',
  'tests/unit/components/add-employee-modal.test.tsx',
  'tests/unit/components/employee-table.test.tsx',
  'tests/unit/hooks/use-employees.test.ts',
  'tests/unit/repositories/employee-repository.test.ts',
  'tests/unit/services/employee-service.test.ts',
  'tests/unit/utils/column-mapping.test.ts',
];

let totalFixed = 0;

files.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Count matches before replacement
  const matches1 = content.match(pattern1);
  const matches2 = content.match(pattern2);
  const matchCount =
    (matches1 ? matches1.length : 0) + (matches2 ? matches2.length : 0);

  // Add missing properties - handle case with comments field
  content = content.replace(
    pattern1,
    `$1\n        ${missingProps}\n        $2\n        $3`
  );

  // Add missing properties - handle case without comments field (add comments too)
  content = content.replace(
    pattern2,
    `$1\n        ${missingProps}\n        $2`
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    totalFixed += matchCount;
    console.log(`✓ Fixed ${filePath} (${matchCount} Employee mocks updated)`);
  } else {
    console.log(`  No changes needed in ${filePath}`);
  }
});

console.log(
  `\n✅ Done! Fixed ${totalFixed} Employee mock objects across ${files.length} files`
);
