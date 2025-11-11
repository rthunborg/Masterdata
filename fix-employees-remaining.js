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

// Count issues before
let beforeDuplicates = (
  content.match(
    /crewing_done: null,\s+stena_date: null,\s+omc_date: null,\s+pe3_date: null,/g
  ) || []
).length;
let beforeMissing = (content.match(/crewing_done: null,\s+\}/g) || []).length;

// Fix: Remove ALL duplicate stena_date, omc_date, pe3_date after crewing_done
// Pattern 1: crewing_done followed by duplicates then closing brace
content = content.replace(
  /crewing_done: null,(\s+)stena_date: null,(\s+)omc_date: null,(\s+)pe3_date: null,(\s+)\}/g,
  'crewing_done: null,$1comments: null,$4}'
);

// Pattern 2: crewing_done followed by duplicates but more content after
content = content.replace(
  /crewing_done: null,(\s+)stena_date: null,(\s+)omc_date: null,(\s+)pe3_date: null,(\s+)(\w)/g,
  'crewing_done: null,$1comments: null,$4$5'
);

// Pattern 3: crewing_done: null followed by } without comments
content = content.replace(
  /crewing_done: null,(\s+)\}/g,
  'crewing_done: null,\n        comments: null,$1}'
);

// Count issues after
let afterDuplicates = (
  content.match(
    /crewing_done: null,\s+stena_date: null,\s+omc_date: null,\s+pe3_date: null,/g
  ) || []
).length;
let afterMissing = (content.match(/crewing_done: null,\s+\}/g) || []).length;

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed remaining employees.test.ts issues:');
console.log(
  `  - Removed ${beforeDuplicates - afterDuplicates} sets of duplicate properties`
);
console.log(
  `  - Added ${beforeMissing - afterMissing} missing comments properties`
);
