/**
 * Fix remaining Employee and EmployeeFormData mocks missing 17+ properties
 */

const fs = require('fs');
const path = require('path');

const employeeTemplate = `
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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

const filesToFix = [
  'tests/integration/api/employees.test.ts',
  'tests/integration/api/employees-import.test.ts',
];

let totalFixes = 0;

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} - not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileFixCount = 0;

  // Pattern 1: Employee mocks ending with is_archived: false,\n comments: null,\n created_at:
  const pattern1 =
    /(is_archived: false,\s+)(comments: null,\s+)(created_at: "[^"]+",\s+updated_at: "[^"]+",)/g;
  const before1 = content;
  content = content.replace(pattern1, (match, p1, p2, p3) => {
    return (
      p1 +
      employeeTemplate +
      `
        comments: null,
        ` +
      p3 +
      `
        stena_date: null,
        omc_date: null,
        pe3_date: null,`
    );
  });
  if (content !== before1) {
    const count = (before1.match(pattern1) || []).length;
    fileFixCount += count;
    console.log(`  - Fixed ${count} Employee mocks (pattern 1)`);
  }

  // Pattern 2: EmployeeFormData ending with is_archived: false,\n comments:
  const pattern2 =
    /(is_archived: false,\s+)(comments: (?:null|"[^"]+"),\s*$)/gm;
  const before2 = content;
  content = content.replace(pattern2, (match, p1, p2) => {
    return (
      p1 +
      employeeTemplate +
      `
        ` +
      p2
    );
  });
  if (content !== before2) {
    const count = (before2.match(pattern2) || []).length;
    fileFixCount += count;
    console.log(`  - Fixed ${count} EmployeeFormData mocks (pattern 2)`);
  }

  // Pattern 3: Objects with stena_date/omc_date/pe3_date but missing 17 properties
  // Match is_archived: false, followed immediately by stena_date/omc_date/pe3_date
  const pattern3 =
    /(is_archived: false,\s+)((?:stena_date|omc_date|pe3_date): null,)/g;
  const before3 = content;
  content = content.replace(pattern3, (match, p1, p2) => {
    return (
      p1 +
      employeeTemplate +
      `
        ` +
      p2
    );
  });
  if (content !== before3) {
    const count = (before3.match(pattern3) || []).length;
    fileFixCount += count;
    console.log(`  - Fixed ${count} objects with date fields (pattern 3)`);
  }

  if (fileFixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${fileFixCount} issues in ${file}`);
    totalFixes += fileFixCount;
  } else {
    console.log(`ℹ️  No changes in ${file}`);
  }
}

console.log(`\n✅ Total: ${totalFixes} fixes`);
