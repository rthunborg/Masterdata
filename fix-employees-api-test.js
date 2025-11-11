const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'tests',
  'integration',
  'api',
  'employees.test.ts'
);
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add missing comments property after crewing_done in second employee mock (around line 99)
// This is for emp-2 in mockEmployees array
content = content.replace(
  /crewing_done: null,\s+created_at: "2020-01-01T00:00:00Z",\s+updated_at: "2020-01-01T00:00:00Z",(\s+)\},(\s+)\];/,
  `crewing_done: null,
        comments: null,
        created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",$1},$2];`
);

// Fix 2: Remove duplicate stena_date, omc_date, pe3_date properties
// These appear multiple times - remove the ones after comments: null
const duplicatePattern =
  /comments: null,\s+stena_date: null,\s+omc_date: null,\s+pe3_date: null,(\s+)\};/g;
content = content.replace(duplicatePattern, 'comments: null,$1};');

// Fix 3: Add missing comments property to other EmployeeFormData/Employee mocks
// Find patterns where there's crewing_done but no comments before closing or next property
const patterns = [
  // Pattern: crewing_done followed by created_at without comments
  {
    find: /crewing_done: null,(\s+)created_at:/g,
    replace: 'crewing_done: null,\n        comments: null,$1created_at:',
  },
  // Pattern: crewing_done followed by } without comments
  {
    find: /crewing_done: null,(\s+)\}/g,
    replace: 'crewing_done: null,\n        comments: null,$1}',
  },
];

patterns.forEach(({ find, replace }) => {
  content = content.replace(find, replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed employees.test.ts:');
console.log('  - Added missing comments properties');
console.log('  - Removed duplicate stena_date, omc_date, pe3_date properties');
