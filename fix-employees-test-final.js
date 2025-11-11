const fs = require('fs');

const filePath = 'tests/integration/api/employees.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing tests/integration/api/employees.test.ts...');

// Fix 1: Add missing comments property to Employee mock at line ~65
content = content.replace(
  /(\s+crewing_done: null,\n)(\s+created_at: "2025-01-01T00:00:00Z",\n\s+updated_at: "2025-01-01T00:00:00Z",\s+},\n\s+{)/,
  '$1      comments: null,\n$2'
);

// Fix 2-7: Remove duplicate stena_date, omc_date, pe3_date at the end of EmployeeFormData objects
// These appear after comments: null and before the closing brace
const duplicateDatePattern = /(\s+comments: null,)\n(\s+stena_date: null,\n\s+omc_date: null,\n\s+pe3_date: null,\n)(\s+};)/g;
content = content.replace(duplicateDatePattern, '$1\n$3');

console.log('Removed duplicate date properties from EmployeeFormData objects');

// Fix 8-11: Add missing comments property to EmployeeFormData objects that are missing it
// Pattern: crewing_done: null followed immediately by closing brace (within EmployeeFormData)
const missingCommentsPattern = /(\s+crewing_done: null,)\n(\s+};)/g;
content = content.replace(missingCommentsPattern, '$1\n        comments: null,\n$2');

console.log('Added missing comments property to EmployeeFormData objects');

// Fix 12-14: Handle termination API response structure issues
// The termination endpoint returns { employee: Employee, clearedDates, releasedSpots }
// but tests expect direct Employee properties
// Lines 838, 1057 - These are function call arguments, need manual review

// Fix 15: Add missing properties to EmployeeFormData in update tests
// These EmployeeFormData objects at lines ~1231, 1297, 1370, 1437, 1505 need full property sets

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed tests/integration/api/employees.test.ts');
console.log('Manual fixes still needed:');
console.log('- Line 838: termination API response structure');
console.log('- Line 1057: termination API response structure'); 
console.log('- EmployeeFormData objects may still need verification');
