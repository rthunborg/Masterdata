/**
 * Script to fix employee-table.test.tsx:
 * 1. Remove duplicate comments: null properties
 * 2. Add missing stena_date, omc_date, pe3_date fields after updated_at
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'tests/unit/components/employee-table.test.tsx'
);
let content = fs.readFileSync(filePath, 'utf8');

// Pattern: Find Employee mocks with duplicate comments fields
// Match from is_archived through both comments occurrences to updated_at
const pattern =
  /(\s+is_archived: false,\s+repayment_needed_omc: null,\s+repayment_needed_pe3: null,\s+comments: null,\s+one: null,\s+one_marked_at: null,\s+talmundo: null,\s+isps: null,\s+photo: null,\s+origo: null,\s+loneiva: null,\s+mail_lon: null,\s+bankuppgifter: null,\s+li: null,\s+passport: null,\s+kvitto_c17_18: null,\s+c17: null,\s+crewing_done: null,\s+comments: null,\s+created_at: "[^"]+",\s+updated_at: "[^"]+",)(\s+})/g;

// Replacement: Remove second comments, add date fields
const replacement = (match, employeeProps, closing) => {
  // Remove the second "comments: null," occurrence
  const fixed = employeeProps.replace(
    /(crewing_done: null,\s+)(comments: null,\s+)(created_at:)/,
    '$1$3'
  );

  // Add date fields after updated_at
  const withDates = fixed.replace(
    /(updated_at: "[^"]+",)/,
    `$1
        stena_date: null,
        omc_date: null,
        pe3_date: null,`
  );

  return withDates + closing;
};

const fixedContent = content.replace(pattern, replacement);

if (fixedContent !== content) {
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log('✅ Fixed employee-table.test.tsx:');
  console.log('  - Removed duplicate comments properties');
  console.log('  - Added stena_date, omc_date, pe3_date fields');
} else {
  console.log('❌ No matches found - pattern may need adjustment');
}
