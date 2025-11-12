/**
 * Story 8.17 Phase 1: Fix Employee Mock Properties
 * Adds missing properties to Employee and EmployeeFormData mocks
 * Removes duplicate 'comments' properties
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Complete properties to add for Employee mocks
const EMPLOYEE_MISSING_PROPS = `  stena_date: null,
  omc_date: null,
  pe3_date: null,`;

// Complete properties to add for EmployeeFormData mocks
const EMPLOYEE_FORM_MISSING_PROPS = `  stena_date: null,
  omc_date: null,
  pe3_date: null,
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

// Files to process for Employee mock fixes
const FILES_TO_PROCESS = [
  'tests/integration/api/employees.test.ts',
  'tests/integration/api/employees-import.test.ts',
  'tests/integration/realtime-sync.test.tsx',
  'tests/unit/repositories/employee-repository.test.ts',
  'tests/unit/services/employee-service.test.ts',
  'tests/unit/hooks/use-employees.test.ts',
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/talmundo-conditional-edit.test.ts',
  'tests/unit/components/add-employee-modal.test.tsx',
  'tests/unit/utils/column-mapping.test.ts',
  'tests/unit/validation/employee-schema.test.ts',
];

function fixEmployeeMocks(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let changeCount = 0;

  // Pattern 1: Add stena_date, omc_date, pe3_date to Employee mocks
  // (objects that have hire_date and updated_at but missing these 3 date fields)
  const employeeMockPattern =
    /(hire_date:\s*['"'][^'"']+['"'],)\s*((?:termination_date|is_terminated|is_archived|termination_reason))/g;

  let match;
  let newContent = content;
  const matches = [];

  while ((match = employeeMockPattern.exec(content)) !== null) {
    matches.push({
      index: match.index,
      match: match[0],
      hire_date: match[1],
      next: match[2],
    });
  }

  // Process in reverse to maintain indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    // Check if already has these properties nearby
    const contextBefore = content.substring(
      Math.max(0, m.index - 200),
      m.index
    );
    const contextAfter = content.substring(
      m.index,
      Math.min(content.length, m.index + 400)
    );

    if (
      !contextAfter.includes('stena_date:') &&
      !contextBefore.includes('stena_date:')
    ) {
      const replacement = `${m.hire_date}\n${EMPLOYEE_MISSING_PROPS}\n  ${m.next}`;
      newContent =
        newContent.substring(0, m.index) +
        replacement +
        newContent.substring(m.index + m.match.length);
      changeCount++;
      console.log(
        `  ✓ Added stena_date/omc_date/pe3_date to Employee mock at position ${m.index}`
      );
    }
  }

  // Pattern 2: Add all 19 properties to EmployeeFormData mocks
  // (objects that have hire_date and comments/is_terminated but missing the 19 nullable fields)
  const formDataPattern =
    /(hire_date:\s*['"'][^'"']+['"'],)\s*((?:termination_date|is_terminated|is_archived))/g;

  content = newContent;
  newContent = content;
  const formMatches = [];

  while ((match = formDataPattern.exec(content)) !== null) {
    formMatches.push({
      index: match.index,
      match: match[0],
      hire_date: match[1],
      next: match[2],
    });
  }

  for (let i = formMatches.length - 1; i >= 0; i--) {
    const m = formMatches[i];
    const contextBefore = content.substring(
      Math.max(0, m.index - 300),
      m.index
    );
    const contextAfter = content.substring(
      m.index,
      Math.min(content.length, m.index + 500)
    );

    // Check if this is EmployeeFormData (no id field nearby, but has hire_date)
    const hasId =
      contextBefore.includes('id:') ||
      contextAfter.substring(0, 100).includes('id:');
    const hasUpdatedAt = contextAfter.includes('updated_at:');
    const needsFullProps = !hasId && !hasUpdatedAt;

    if (
      needsFullProps &&
      !contextAfter.includes('repayment_needed_omc:') &&
      !contextBefore.includes('repayment_needed_omc:')
    ) {
      const replacement = `${m.hire_date}\n${EMPLOYEE_FORM_MISSING_PROPS}\n  ${m.next}`;
      newContent =
        newContent.substring(0, m.index) +
        replacement +
        newContent.substring(m.index + m.match.length);
      changeCount++;
      console.log(
        `  ✓ Added 19 properties to EmployeeFormData mock at position ${m.index}`
      );
    }
  }

  // Pattern 3: Remove duplicate 'comments' properties
  const duplicateCommentsPattern =
    /(comments:\s*(?:null|['"'][^'"']*['"']),)\s*\n\s*(.*?\n\s*.*?\n\s*)+(comments:\s*(?:null|['"'][^'"']*['"']),)/g;

  content = newContent;
  const commentsMatches = [...content.matchAll(duplicateCommentsPattern)];

  if (commentsMatches.length > 0) {
    console.log(
      `  ⚠️  Found ${commentsMatches.length} duplicate 'comments' properties`
    );

    for (let i = commentsMatches.length - 1; i >= 0; i--) {
      const m = commentsMatches[i];
      // Keep the first occurrence, remove the second
      const replacement = m[0].replace(m[3], '');
      newContent =
        newContent.substring(0, m.index) +
        replacement +
        newContent.substring(m.index + m[0].length);
      changeCount++;
      console.log(
        `  ✓ Removed duplicate 'comments' property at position ${m.index}`
      );
    }
  }

  if (newContent !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ ${filePath}: ${changeCount} changes applied`);
    return changeCount;
  } else {
    console.log(`⏭️  ${filePath}: No changes needed`);
    return 0;
  }
}

// Special handling for talmundo-conditional-edit.test.ts
// It already has 'one' and 'isps', needs only 15 additional properties
function fixTalmundoFile() {
  const filePath = 'tests/integration/talmundo-conditional-edit.test.ts';
  console.log(`\n📝 Processing (special): ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // This file needs these 15 properties (excludes one and isps which it already has)
  const TALMUNDO_MISSING_PROPS = `  repayment_needed_omc: null,
  repayment_needed_pe3: null,
  one_marked_at: null,
  talmundo: null,
  photo: null,
  origo: null,
  loneiva: null,
  mail_lon: null,
  bankuppgifter: null,
  li: null,
  passport: null,
  kvitto_c17_18: null,
  c17: null,
  crewing_done: null,
  comments: null,`;

  // Find the employee mock and add properties after isps
  const pattern = /(isps:\s*null,)\s*\n\s*(is_terminated:)/;

  if (pattern.test(content)) {
    const newContent = content.replace(
      pattern,
      `$1\n${TALMUNDO_MISSING_PROPS}\n  $2`
    );
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ ${filePath}: Added 15 missing properties`);
    return 1;
  } else {
    console.log(`⏭️  ${filePath}: Pattern not found or already fixed`);
    return 0;
  }
}

// Main execution
console.log('🚀 Story 8.17 Phase 1: Employee Mock Property Fixes');
console.log('='.repeat(60));

let totalChanges = 0;

FILES_TO_PROCESS.forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    totalChanges += fixEmployeeMocks(filePath);
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

// Special handling for talmundo file
totalChanges += fixTalmundoFile();

console.log('\n' + '='.repeat(60));
console.log(`✅ Phase 1 Complete: ${totalChanges} total changes applied`);
console.log('\n💡 Next: Run type check to verify improvements');
