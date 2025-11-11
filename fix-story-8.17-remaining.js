const fs = require('fs');

const fixes = [
  // Fix employees.test.ts - rank type issue
  {
    file: 'tests/integration/api/employees.test.ts',
    line: 598,
    search: /rank: response\.body\.rank,/,
    replace: `rank: response.body.rank as "SEV" | "CHEF",`
  },
  
  // Fix date-capacity-concurrency.test.ts - Promise type issue
  {
    file: 'tests/integration/date-capacity-concurrency.test.ts',
    line: 469,
    search: /const result = await dateCapacityService\.getDateCapacityStatus\(\{\s+id: 'date-1',\s+\}\);/s,
    replace: `const result = await dateCapacityService.getDateCapacityStatus('date-1');`
  },
  
  // Fix edit-column.test.ts - remove db_column_name from SessionUser
  {
    file: 'tests/integration/edit-column.test.ts',
    line: 112,
    search: /db_column_name: 'first_name',\s+/,
    replace: ''
  },
  
  // Fix column-settings-table.test.tsx - add missing properties (2 instances)
  {
    file: 'tests/unit/components/column-settings-table.test.tsx',
    line: 38,
    search: /(is_visible: true,\s+display_order: 0,\s+created_at: '2025-01-01T00:00:00Z',\s+updated_at: '2025-01-01T00:00:00Z',)/,
    replace: `$1\n      db_column_name: 'first_name',\n      category_color: null,`
  },
  {
    file: 'tests/unit/components/column-settings-table.test.tsx',
    line: 55,
    search: /(is_visible: true,\s+display_order: 1,\s+created_at: '2025-01-01T00:00:00Z',\s+updated_at: '2025-01-01T00:00:00Z',)/,
    replace: `$1\n      db_column_name: 'custom_field_1',\n      category_color: null,`
  },
  
  // Fix column-config-repository.test.ts - add missing properties (10 instances)
  {
    file: 'tests/unit/repositories/column-config-repository.test.ts',
    multiReplace: [
      { line: 39, after: 'updated_at:', add: '\n      db_column_name: \'test_column\',\n      category_color: null,' },
      { line: 54, after: 'updated_at:', add: '\n      db_column_name: \'test_date\',\n      category_color: null,' },
      { line: 253, after: 'updated_at:', add: '\n      db_column_name: \'custom_category_column\',\n      category_color: null,' },
      { line: 298, after: 'updated_at:', add: '\n      db_column_name: \'custom_null_category\',\n      category_color: null,' },
      { line: 361, after: 'updated_at:', add: '\n      db_column_name: \'updated_column\',\n      category_color: null,' },
      { line: 394, after: 'updated_at:', add: '\n      db_column_name: \'changed_column\',\n      category_color: null,' },
      { line: 441, after: 'updated_at:', add: '\n      db_column_name: \'bulk_update_1\',\n      category_color: null,' },
      { line: 472, after: 'updated_at:', add: '\n      db_column_name: \'bulk_update_2\',\n      category_color: null,' },
      { line: 515, after: 'updated_at:', add: '\n      db_column_name: \'deleted_column\',\n      category_color: null,' },
    ]
  },
  
  // Fix column-config-repository.test.ts - add params to function calls (2 instances)
  {
    file: 'tests/unit/repositories/column-config-repository.test.ts',
    line: 324,
    search: /column_name: 'custom_column_1',\s+column_type: 'text',\s+role: UserRole\.SODEXO,/,
    replace: `column_name: 'custom_column_1',\n          db_column_name: 'custom_column_1',\n          column_type: 'text',\n          is_masterdata: false,\n          role: UserRole.SODEXO,`
  },
  {
    file: 'tests/unit/repositories/column-config-repository.test.ts',
    line: 350,
    search: /column_name: 'custom_column_2',\s+column_type: 'text',\s+role: UserRole\.SODEXO,/,
    replace: `column_name: 'custom_column_2',\n          db_column_name: 'custom_column_2',\n          column_type: 'text',\n          is_masterdata: false,\n          role: UserRole.SODEXO,`
  },
  
  // Fix employee-repository.test.ts - rank type and missing properties
  {
    file: 'tests/unit/repositories/employee-repository.test.ts',
    line: 494,
    search: /rank: 'Updated Rank'/,
    replace: `rank: 'SEV' as const`
  },
  {
    file: 'tests/unit/repositories/employee-repository.test.ts',
    line: 504,
    search: /(updated_at: '2025-01-01T00:00:00Z',)/,
    replace: `$1\n          repayment_needed_omc: null,\n          repayment_needed_pe3: null,\n          one: null,\n          one_marked_at: null,\n          talmundo: null,\n          isps: null,\n          photo: null,\n          origo: null,\n          loneiva: null,\n          mail_lon: null,\n          bankuppgifter: null,\n          li: null,\n          passport: null,\n          kvitto_c17_18: null,\n          c17: null,\n          crewing_done: null,`
  },
  
  // Fix important-date-service.test.ts - add missing properties
  {
    file: 'tests/unit/services/important-date-service.test.ts',
    line: 123,
    search: /(remaining_spots: 0,)/,
    replace: `$1\n          is_active: true,\n          assigned_employees: [],`
  },
  
  // Fix change-detection.test.ts - stena_date undefined issue (3 instances)
  {
    file: 'tests/unit/utils/change-detection.test.ts',
    line: 17,
    search: /stena_date: undefined,/,
    replace: `stena_date: null,`
  },
  {
    file: 'tests/unit/utils/change-detection.test.ts',
    line: 109,
    search: /stena_date: undefined,/g,
    replace: `stena_date: null,`
  },
  {
    file: 'tests/unit/utils/change-detection.test.ts',
    line: 180,
    search: /stena_date: undefined,/g,
    replace: `stena_date: null,`
  }
];

console.log('Starting Story 8.17 remaining fixes...\n');

fixes.forEach((fix, index) => {
  try {
    const filePath = fix.file;
    console.log(`\n[${index + 1}/${fixes.length}] Processing: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found, skipping`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    if (fix.multiReplace) {
      // Handle multiple replacements in same file
      fix.multiReplace.forEach(mr => {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(mr.after) && i + 1 >= mr.line - 10 && i + 1 <= mr.line + 10) {
            lines[i] = lines[i] + mr.add;
            console.log(`  ✓ Added properties near line ${i + 1}`);
            break;
          }
        }
        content = lines.join('\n');
      });
    } else if (fix.search) {
      if (content.match(fix.search)) {
        content = content.replace(fix.search, fix.replace);
        console.log(`  ✓ Applied fix near line ${fix.line}`);
      } else {
        console.log(`  ⚠️  Pattern not found near line ${fix.line}`);
      }
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ File updated`);
    } else {
      console.log(`  ℹ️  No changes made`);
    }
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
});

console.log('\n✅ Script complete!');
console.log('\nNext steps:');
console.log('1. Run: pnpm tsc --noEmit');
console.log('2. Verify remaining errors');
console.log('3. Continue with manual fixes if needed');
