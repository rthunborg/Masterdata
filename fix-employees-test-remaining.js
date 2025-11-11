const fs = require('fs');

const filePath = 'tests/integration/api/employees.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log(
  'Fixing remaining issues in tests/integration/api/employees.test.ts...'
);

// Fix 1: Add missing comments property to Employee mock at line 65
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (
    i === 64 &&
    lines[i].includes('crewing_done: null,') &&
    !lines[i + 1].includes('comments')
  ) {
    lines.splice(i + 1, 0, '      comments: null,');
    console.log('Added comments to Employee mock at line 65');
    break;
  }
}
content = lines.join('\n');

// Fix 2: Remove ALL remaining duplicate date properties
// Pattern: Find lines with stena_date, omc_date, pe3_date after comments: null
content = content.replace(
  /(comments: null,)\n(\s+stena_date: null,\n\s+omc_date: null,\n\s+pe3_date: null,)/g,
  '$1'
);
console.log('Removed duplicate date properties');

// Fix 3: Add missing comments to EmployeeFormData objects at specific lines
// Pattern: crewing_done: null followed by closing brace in EmployeeFormData
content = content.replace(
  /(crewing_done: null,)\n(\s+};)/g,
  '$1\n        comments: null,\n$2'
);
console.log('Added missing comments to EmployeeFormData objects');

// Fix 4: Fix line 597 - rank type error
content = content.replace(
  /rank: mockUpdated\.rank,/,
  'rank: mockUpdated.rank as "SEV" | "CHEF",'
);

// Fix 5: Fix line 838 & 1057 - termination/reactivation API mocks
// These need to mock the repository to return the wrapped structure
content = content.replace(
  /vi\.mocked\(employeeRepository\.terminate\)\.mockResolvedValue\(mockEmployee\);/,
  'vi.mocked(employeeRepository.terminate).mockResolvedValue({ employee: mockEmployee, clearedDates: [], releasedSpots: 0 });'
);

content = content.replace(
  /vi\.mocked\(employeeRepository\.reactivate\)\.mockResolvedValue\(mockEmployee\);/,
  'vi.mocked(employeeRepository.reactivate).mockResolvedValue({ employee: mockEmployee, warnings: [] });'
);

console.log('Fixed termination/reactivation API mocks');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed tests/integration/api/employees.test.ts');
