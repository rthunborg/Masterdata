#!/usr/bin/env node
/**
 * Comprehensive script to fix all test mock objects
 * - Adds missing Employee properties (Story 8.13, 8.14, 7.1, 8.3-8.5)
 * - Adds missing ColumnConfig properties (Story 7.4+)
 * - Adds missing ImportantDate properties (Story 8.7, 8.10)
 * - Adds missing SessionUser properties
 * - Fixes termination API response expectations (Story 8.14)
 * - Adds missing hook return properties
 */

import * as fs from 'fs';
import * as path from 'path';

interface FixStats {
  filesProcessed: number;
  filesModified: number;
  employeePropertiesAdded: number;
  columnConfigPropertiesAdded: number;
  importantDatePropertiesAdded: number;
  sessionUserPropertiesAdded: number;
  hookPropertiesAdded: number;
  terminationApiFixed: number;
}

const stats: FixStats = {
  filesProcessed: 0,
  filesModified: 0,
  employeePropertiesAdded: 0,
  columnConfigPropertiesAdded: 0,
  importantDatePropertiesAdded: 0,
  sessionUserPropertiesAdded: 0,
  hookPropertiesAdded: 0,
  terminationApiFixed: 0,
};

function processFile(filePath: string): boolean {
  stats.filesProcessed++;
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = content;
  let changed = false;

  // Fix 1: Add missing Employee properties
  // Pattern: Employee objects without repayment_needed_omc/pe3, stena_date, etc.
  const employeePattern = /({[\s\S]*?id:\s*['"`]\d+['"`][\s\S]*?name:\s*['"`][^'"`]+['"`][\s\S]*?})/g;
  modified = modified.replace(employeePattern, (match) => {
    // Check if this is likely an Employee object (has id, name, email)
    if (!match.includes('email:') && !match.includes('email_personal:')) {
      return match; // Not an Employee object
    }

    let updated = match;
    let addedProperties = false;

    // Add missing repayment fields (Story 8.13)
    if (!match.includes('repayment_needed_omc') && match.includes('email:')) {
      const insertPos = match.lastIndexOf('}');
      updated = updated.slice(0, insertPos) + ',\n    repayment_needed_omc: null,\n    repayment_needed_pe3: null' + updated.slice(insertPos);
      addedProperties = true;
    }

    // Add missing date fields (Story 7.1, 8.3-8.5)
    const missingDateFields = [
      'stena_date', 'omc_date', 'pe3_date', 'one_marked_at'
    ];
    for (const field of missingDateFields) {
      if (!match.includes(`${field}:`) && match.includes('email:')) {
        const insertPos = updated.lastIndexOf('}');
        updated = updated.slice(0, insertPos) + `,\n    ${field}: null` + updated.slice(insertPos);
        addedProperties = true;
      }
    }

    // Add missing checkbox fields
    const missingCheckboxFields = [
      'one', 'talmundo', 'isps', 'photo', 'origo', 
      'mail_lon', 'bankuppgifter', 'li', 'passport', 
      'kvitto_c17_18', 'c17', 'crewing_done'
    ];
    for (const field of missingCheckboxFields) {
      if (!match.includes(`${field}:`) && match.includes('email:')) {
        const insertPos = updated.lastIndexOf('}');
        updated = updated.slice(0, insertPos) + `,\n    ${field}: null` + updated.slice(insertPos);
        addedProperties = true;
      }
    }

    // Add loneiva if missing (Story 8.5)
    if (!match.includes('loneiva:') && match.includes('email:')) {
      const insertPos = updated.lastIndexOf('}');
      updated = updated.slice(0, insertPos) + ',\n    loneiva: null' + updated.slice(insertPos);
      addedProperties = true;
    }

    if (addedProperties) {
      stats.employeePropertiesAdded++;
      changed = true;
    }

    return updated;
  });

  // Fix 2: Add missing ColumnConfig properties
  const columnConfigPattern = /({[\s\S]*?column_name:\s*['"`][^'"`]+['"`][\s\S]*?})/g;
  modified = modified.replace(columnConfigPattern, (match) => {
    if (!match.includes('label:') || match.includes('db_column_name:')) {
      return match; // Not a ColumnConfig or already has properties
    }

    let updated = match;
    const insertPos = match.lastIndexOf('}');
    
    updated = updated.slice(0, insertPos) + 
      ',\n    db_column_name: \'test_column\',\n' +
      '    category_color: \'#FFFFFF\',\n' +
      '    display_order: 0,\n' +
      '    is_visible: true,\n' +
      '    updated_at: new Date().toISOString()' + 
      updated.slice(insertPos);
    
    stats.columnConfigPropertiesAdded++;
    changed = true;
    return updated;
  });

  // Fix 3: Add missing ImportantDate properties
  const importantDatePattern = /({[\s\S]*?date:\s*['"`]\d{4}-\d{2}-\d{2}['"`][\s\S]*?})/g;
  modified = modified.replace(importantDatePattern, (match) => {
    if (!match.includes('description:') && !match.includes('name:')) {
      return match; // Not an ImportantDate object
    }

    let updated = match;
    const missingFields = [
      'time_value', 'deadline_submit', 'deadline_cancel'
    ];
    let addedProperties = false;

    for (const field of missingFields) {
      if (!match.includes(`${field}:`)) {
        const insertPos = updated.lastIndexOf('}');
        updated = updated.slice(0, insertPos) + `,\n    ${field}: null` + updated.slice(insertPos);
        addedProperties = true;
      }
    }

    // Add capacity fields
    if (!match.includes('max_spots:')) {
      const insertPos = updated.lastIndexOf('}');
      updated = updated.slice(0, insertPos) + 
        ',\n    max_spots: 99,\n' +
        '    remaining_spots: 99,\n' +
        '    assigned_employees: []' + 
        updated.slice(insertPos);
      addedProperties = true;
    }

    if (addedProperties) {
      stats.importantDatePropertiesAdded++;
      changed = true;
    }

    return updated;
  });

  // Fix 4: Add missing SessionUser properties
  modified = modified.replace(
    /(const\s+mockUser\s*[=:]\s*{[\s\S]*?email:\s*['"`][^'"`]+['"`][\s\S]*?})/g,
    (match) => {
      if (match.includes('last_active_at:')) {
        return match; // Already has the property
      }
      const insertPos = match.lastIndexOf('}');
      stats.sessionUserPropertiesAdded++;
      changed = true;
      return match.slice(0, insertPos) + 
        ',\n  last_active_at: new Date().toISOString()' + 
        match.slice(insertPos);
    }
  );

  // Fix 5: Add refetch to hook return mocks
  modified = modified.replace(
    /((?:useColumns|useEmployees|useImportantDates)\s*:\s*vi\.fn\(\(\)\s*=>\s*\({[\s\S]*?}\)\))/g,
    (match) => {
      if (match.includes('refetch:')) {
        return match; // Already has refetch
      }
      const insertPos = match.lastIndexOf('}');
      stats.hookPropertiesAdded++;
      changed = true;
      return match.slice(0, insertPos) + 
        ',\n    refetch: vi.fn()' + 
        match.slice(insertPos);
    }
  );

  // Fix 6: Fix termination API response expectations (Story 8.14)
  if (filePath.includes('employees.test.ts')) {
    // Pattern: expect(result).toEqual(expect.objectContaining({...}))
    // Should expect { employee, clearedDates, releasedSpots }
    const terminationPattern = /await\s+terminateEmployee\([^)]+\);?\s*\n\s*expect\(result\)\.toEqual\(expect\.objectContaining\({[^}]*id:/g;
    if (terminationPattern.test(modified)) {
      modified = modified.replace(
        /(await\s+terminateEmployee\([^)]+\);?\s*\n\s*)expect\(result\)\.toEqual\(expect\.objectContaining\({[\s\S]*?}\)\)/g,
        (match, prefix) => {
          if (match.includes('employee:') && match.includes('clearedDates:')) {
            return match; // Already fixed
          }
          stats.terminationApiFixed++;
          changed = true;
          return prefix + 
            'expect(result).toEqual({\n' +
            '      employee: expect.objectContaining({ id: expect.any(String) }),\n' +
            '      clearedDates: expect.any(Array),\n' +
            '      releasedSpots: expect.any(Number)\n' +
            '    })';
        }
      );
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, modified, 'utf-8');
    stats.filesModified++;
    console.log(`✓ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }

  return false;
}

function walkDirectory(dir: string) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      try {
        processFile(filePath);
      } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error);
      }
    }
  }
}

console.log('🔧 Starting comprehensive test mock fixes...\n');

const testsDir = path.join(process.cwd(), 'tests');
walkDirectory(testsDir);

console.log('\n📊 Summary:');
console.log(`   Files processed: ${stats.filesProcessed}`);
console.log(`   Files modified: ${stats.filesModified}`);
console.log(`   Employee properties added: ${stats.employeePropertiesAdded}`);
console.log(`   ColumnConfig properties added: ${stats.columnConfigPropertiesAdded}`);
console.log(`   ImportantDate properties added: ${stats.importantDatePropertiesAdded}`);
console.log(`   SessionUser properties added: ${stats.sessionUserPropertiesAdded}`);
console.log(`   Hook properties added: ${stats.hookPropertiesAdded}`);
console.log(`   Termination API fixes: ${stats.terminationApiFixed}`);
console.log('\n✨ Complete! Run `pnpm tsc --noEmit` to verify fixes.');
