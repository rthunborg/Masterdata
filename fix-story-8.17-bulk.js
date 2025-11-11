/**
 * Story 8.17: Bulk fix remaining type errors
 * Handles Employee, ImportantDate, ColumnConfig mocks systematically
 */

const fs = require('fs');
const path = require('path');

const changes = {
  employee: 0,
  importantDate: 0,
  columnConfig: 0,
  other: 0,
};

// Add missing properties to ImportantDate mocks
function fixImportantDateMocks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern: ImportantDate objects missing the 7 required properties
  const patterns = [
    // Pattern 1: Has date_value, notes but missing time_value, deadline_submit, etc.
    {
      find: /(date_value:\s*["'][^"']+["'],\s*\n\s*notes:\s*(?:null|["'][^"']*["']),\s*\n\s*)(created_at:)/g,
      replace: '$1time_value: null,\n    deadline_submit: null,\n    deadline_cancel: null,\n    is_active: true,\n    max_spots: 0,\n    remaining_spots: 0,\n    assigned_employees: [],\n    $2',
    },
    // Pattern 2: Has notes, is_active but missing other properties
    {
      find: /(notes:\s*(?:null|["'][^"']*["']),\s*\n\s*is_active:\s*true,\s*\n\s*)(created_at:)/g,
      replace: '$1time_value: null,\n    deadline_submit: null,\n    deadline_cancel: null,\n    max_spots: 0,\n    remaining_spots: 0,\n    assigned_employees: [],\n    $2',
    },
    // Pattern 3: Has max_spots, remaining_spots but missing time_value, deadline_submit, deadline_cancel, assigned_employees
    {
      find: /(remaining_spots:\s*\d+,\s*\n\s*is_active:\s*true,\s*\n\s*)(created_at:)/g,
      replace: '$1time_value: null,\n    deadline_submit: null,\n    deadline_cancel: null,\n    assigned_employees: [],\n    $2',
    },
  ];

  patterns.forEach((pattern, idx) => {
    if (pattern.find.test(content)) {
      content = content.replace(pattern.find, pattern.replace);
      modified = true;
      changes.importantDate++;
      console.log(`  ✓ Applied ImportantDate pattern ${idx + 1} in ${path.basename(filePath)}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
  }
  
  return modified;
}

// Add missing properties to ColumnConfig mocks
function fixColumnConfigMocks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern: ColumnConfig objects missing db_column_name and category_color
  const pattern = /(role_permissions:\s*\{[^}]+\},\s*\n\s*)(category:)/g;
  
  if (pattern.test(content)) {
    const newContent = content.replace(pattern, (match, p1, p2) => {
      // Check if db_column_name already exists nearby
      const contextBefore = content.substring(Math.max(0, content.indexOf(match) - 300), content.indexOf(match));
      const contextAfter = content.substring(content.indexOf(match), Math.min(content.length, content.indexOf(match) + 300));
      
      if (!contextBefore.includes('db_column_name:') && !contextAfter.includes('db_column_name:')) {
        changes.columnConfig++;
        return `${p1}db_column_name: null,\n    category_color: null,\n    ${p2}`;
      }
      return match;
    });
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`  ✓ Added db_column_name/category_color to ColumnConfig mocks in ${path.basename(filePath)}`);
      modified = true;
    }
  }
  
  return modified;
}

// Fix remaining Employee mocks in repository tests
function fixEmployeeRepositoryMocks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Pattern: Employee mocks missing stena_date, omc_date, pe3_date
  // Looking for: hire_date followed directly by termination_date/is_terminated
  const employeePattern = /(hire_date:\s*["'][^"']+["'],)\s*\n\s*(termination_date:)/g;
  content = content.replace(employeePattern, '$1\n    stena_date: null,\n    omc_date: null,\n    pe3_date: null,\n    $2');
  
  // Pattern: EmployeeFormData missing all 19 properties
  const formDataPattern = /(hire_date:\s*["'][^"']+["'],)\s*\n\s*(is_terminated:)/g;
  content = content.replace(formDataPattern, `$1
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    $2`);
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    changes.employee++;
    console.log(`  ✓ Fixed Employee mocks in ${path.basename(filePath)}`);
    return true;
  }
  
  return false;
}

// Fix specific files with targeted approaches
const fixes = [
  {
    files: [
      'tests/unit/repositories/employee-repository.test.ts',
      'tests/unit/services/employee-service.test.ts',
      'tests/unit/hooks/use-employees.test.ts',
      'tests/unit/components/add-employee-modal.test.tsx',
      'tests/unit/utils/column-mapping.test.ts',
    ],
    handler: fixEmployeeRepositoryMocks,
  },
  {
    files: [
      'tests/integration/api/important-dates.test.ts',
      'tests/integration/date-capacity-concurrency.test.ts',
      'tests/unit/components/editable-date-cell.test.tsx',
      'tests/unit/components/important-dates-table.test.tsx',
      'tests/unit/services/important-date-service.test.ts',
      'tests/unit/utils/important-date-resolver.test.ts',
    ],
    handler: fixImportantDateMocks,
  },
  {
    files: [
      'tests/unit/repositories/column-config-repository.test.ts',
      'tests/integration/story-7.4-column-ux.test.ts',
      'tests/unit/components/column-settings-table.test.tsx',
    ],
    handler: fixColumnConfigMocks,
  },
];

console.log('🚀 Story 8.17: Bulk Type Error Fixes');
console.log('=' .repeat(60));

fixes.forEach(({ files, handler }) => {
  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`\n📝 Processing: ${file}`);
      handler(filePath);
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  });
});

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`  Employee mocks: ${changes.employee} files`);
console.log(`  ImportantDate mocks: ${changes.importantDate} patterns`);
console.log(`  ColumnConfig mocks: ${changes.columnConfig} files`);
console.log(`  Other fixes: ${changes.other} files`);
console.log('\n✅ Bulk fixes complete!');
console.log('💡 Run: pnpm tsc --noEmit to check progress');
