const fs = require('fs');
const path = require('path');

// These properties need to go after is_archived
const missingAfterIsArchived = `repayment_needed_omc: null,
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

// Pattern for objects with stena/omc/pe3 dates after comments
// Match: is_archived: false, comments: null, stena_date: ..., omc_date: ..., pe3_date: ..., created_at:
const patternWithDates =
  /(is_archived:\s*false,)\s*(comments:\s*null,)\s*(stena_date:\s*null,\s*omc_date:\s*null,\s*pe3_date:\s*null,)\s*(created_at:)/g;

const files = [
  'tests/integration/api/employees-import-relaxed-validation.test.ts',
  'tests/integration/api/employees-import.test.ts',
  'tests/integration/components/employee-table-permissions.test.tsx',
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/talmundo-conditional-edit.test.ts',
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

  // Count matches
  const matches = content.match(patternWithDates);
  const matchCount = matches ? matches.length : 0;

  // Replace: insert missing props after is_archived, keep comments and date fields
  content = content.replace(
    patternWithDates,
    `$1\n        ${missingAfterIsArchived}\n        $3\n        $4`
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    totalFixed += matchCount;
    console.log(`✓ Fixed ${filePath} (${matchCount} Employee mocks updated)`);
  } else {
    console.log(`  No changes in ${filePath}`);
  }
});

console.log(`\n✅ Done! Fixed ${totalFixed} additional Employee mocks`);
