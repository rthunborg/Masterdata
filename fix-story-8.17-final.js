/**
 * Story 8.17 - Final cleanup script
 * Handles all remaining specific error patterns
 */

const fs = require('fs');
const path = require('path');

let totalFixes = 0;

// Fix 1: Remove all duplicate 'comments' properties across all files
function removeDuplicateComments(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Pattern: Find comments: appearing twice in same object
  const lines = content.split('\n');
  const fixedLines = [];
  const seenCommentsInObject = {};
  let objectDepth = 0;
  let objectStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Track object depth
    if (trimmed.includes('{') && !trimmed.includes('}')) objectDepth++;
    if (trimmed.includes('}') && !trimmed.includes('{')) {
      objectDepth--;
      if (objectDepth === 0) {
        seenCommentsInObject[objectStart] = false;
      }
    }
    
    // Detect 'comments:' line
    if (trimmed.startsWith('comments:')) {
      if (seenCommentsInObject[objectStart]) {
        console.log(`  ✓ Removed duplicate 'comments' at line ${i + 1} in ${path.basename(filePath)}`);
        totalFixes++;
        continue; // Skip this line
      } else {
        if (objectDepth > 0 && objectStart === -1) {
          objectStart = i;
        }
        seenCommentsInObject[objectStart] = true;
      }
    }
    
    fixedLines.push(line);
  }
  
  content = fixedLines.join('\n');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix 2: Add missing properties to specific Employee mocks
function fixSpecificEmployeeMocks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  if (filePath.includes('crewing-done-conditional') || filePath.includes('talmundo-conditional-edit')) {
    // These files need the 15-19 remaining properties
    const pattern = /(pe3_date:\s*null,)\s*\n\s*(is_terminated:)/g;
    content = content.replace(pattern, `$1
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
    crewing_done: null,
    comments: null,
    $2`);
  }
  
  if (content !== original) {
    console.log(`  ✓ Fixed Employee mocks in ${path.basename(filePath)}`);
    totalFixes++;
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix 3: Add properties to ColumnConfig mocks
function fixColumnConfigMocks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Pattern: After role_permissions, add db_column_name and category_color
  const pattern = /(role_permissions:\s*\{[^}]+\},)\s*\n\s*(category:|display_order:|is_visible:)/g;
  
  content = content.replace(pattern, (match, p1, p2) => {
    if (!match.includes('db_column_name:')) {
      return `${p1}\n    db_column_name: null,\n    category_color: null,\n    ${p2}`;
    }
    return match;
  });
  
  if (content !== original) {
    console.log(`  ✓ Added db_column_name/category_color to ${path.basename(filePath)}`);
    totalFixes++;
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix 4: Fix ImportantDate mocks that still need properties
function fixRemainingImportantDateMocks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Pattern 1: ImportantDateFormData missing properties
  const formPattern = /(date_value:\s*["'][^"']+["'],)\s*\n\s*notes:\s*null,\s*\n\s*\}/g;
  content = content.replace(formPattern, `$1
    notes: null,
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    max_spots: 0,
    remaining_spots: 0,
  }`);
  
  // Pattern 2: ImportantDate missing assigned_employees
  const assignedPattern = /(remaining_spots:\s*\d+,)\s*\n\s*(is_active:\s*true,)\s*\n\s*(created_at:)/g;
  content = content.replace(assignedPattern, `$1\n    $2\n    assigned_employees: [],\n    $3`);
  
  // Pattern 3: Add all 7 properties for objects with only basic fields
  const basicPattern = /(notes:\s*(?:null|["'][^"']*["']),)\s*\n\s*is_active:\s*true,\s*\n\s*(created_at:)/g;
  content = content.replace(basicPattern, `$1
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    max_spots: 0,
    remaining_spots: 0,
    assigned_employees: [],
    $2`);
  
  if (content !== original) {
    console.log(`  ✓ Fixed ImportantDate mocks in ${path.basename(filePath)}`);
    totalFixes++;
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix 5: Fix column-settings-table allColumns prop
function fixColumnSettingsTable() {
  const filePath = path.join(process.cwd(), 'tests/unit/components/column-settings-table.test.tsx');
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Replace allColumns={columns} with allColumns={mockColumns}
  content = content.replace(/allColumns=\{columns\}/g, 'allColumns={mockColumns}');
  
  if (content !== original) {
    console.log(`  ✓ Fixed allColumns props in column-settings-table.test.tsx`);
    totalFixes++;
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Main execution
console.log('🔧 Story 8.17 - Final Cleanup Script');
console.log('='.repeat(60));

const allTestFiles = [
  'tests/integration/api/employees.test.ts',
  'tests/integration/api/important-dates.test.ts',
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/talmundo-conditional-edit.test.ts',
  'tests/integration/date-capacity-concurrency.test.ts',
  'tests/unit/hooks/use-employees.test.ts',
  'tests/unit/components/add-employee-modal.test.tsx',
  'tests/unit/components/add-important-date-modal.test.tsx',
  'tests/integration/story-7.4-column-ux.test.ts',
  'tests/unit/components/column-settings-table.test.tsx',
  'tests/unit/repositories/column-config-repository.test.ts',
];

console.log('\n📝 Removing duplicate comments properties...');
allTestFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    removeDuplicateComments(filePath);
  }
});

console.log('\n📝 Fixing specific Employee mocks...');
[
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/talmundo-conditional-edit.test.ts',
].forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fixSpecificEmployeeMocks(filePath);
  }
});

console.log('\n📝 Fixing ColumnConfig mocks...');
[
  'tests/integration/story-7.4-column-ux.test.ts',
  'tests/unit/components/column-settings-table.test.tsx',
  'tests/unit/repositories/column-config-repository.test.ts',
].forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fixColumnConfigMocks(filePath);
  }
});

console.log('\n📝 Fixing remaining ImportantDate mocks...');
[
  'tests/integration/api/important-dates.test.ts',
  'tests/integration/date-capacity-concurrency.test.ts',
  'tests/unit/components/add-important-date-modal.test.tsx',
].forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fixRemainingImportantDateMocks(filePath);
  }
});

console.log('\n📝 Fixing column-settings-table allColumns...');
fixColumnSettingsTable();

console.log('\n' + '='.repeat(60));
console.log(`✅ Total fixes applied: ${totalFixes}`);
console.log('\n💡 Run: pnpm tsc --noEmit to check remaining errors');
