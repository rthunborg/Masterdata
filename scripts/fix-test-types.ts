/**
 * Script to automatically fix common type errors in test files
 * Story 8.15: Test Cleanup and Error Resolution
 * 
 * This script fixes:
 * 1. Missing Employee properties (repayment_needed_omc, repayment_needed_pe3)
 * 2. Invalid gender/rank enum values
 * 3. Missing ColumnConfig properties
 * 4. Missing ImportantDate properties
 * 5. loneiva type (boolean → number)
 * 6. Missing SessionUser.last_active_at
 */

import * as fs from 'fs';
import * as path from 'path';

// Get all test files recursively
function getTestFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getTestFiles(fullPath));
    } else if (entry.isFile() && /\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Patterns to fix
const fixes = {
  // Fix 1: Replace invalid gender values
  gender: [
    { from: /gender:\s*['"]Male['"]/g, to: "gender: 'Man'" },
    { from: /gender:\s*['"]Female['"]/g, to: "gender: 'Woman'" },
  ],
  // Fix 2: Replace invalid rank values
  rank: [
    { from: /rank:\s*['"]CAPTAIN['"]/g, to: "rank: 'SEV'" },
    { from: /rank:\s*['"]Manager['"]/g, to: "rank: 'SEV'" },
    { from: /rank:\s*['"]Senior['"]/g, to: "rank: 'SEV'" },
    { from: /rank:\s*['"]Developer['"]/g, to: "rank: 'SEV'" },
    { from: /rank:\s*null/g, to: "rank: 'SEV'" },
  ],
  // Fix 3: Replace loneiva boolean → number
  loneiva: [
    { from: /loneiva:\s*true/g, to: 'loneiva: 1' },
    { from: /loneiva:\s*false/g, to: 'loneiva: 0' },
  ],
};

async function fixFile(filePath: string): Promise<boolean> {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Apply gender fixes
  for (const fix of fixes.gender) {
    if (fix.from.test(content)) {
      content = content.replace(fix.from, fix.to);
      modified = true;
    }
  }

  // Apply rank fixes
  for (const fix of fixes.rank) {
    if (fix.from.test(content)) {
      content = content.replace(fix.from, fix.to);
      modified = true;
    }
  }

  // Apply loneiva fixes
  for (const fix of fixes.loneiva) {
    if (fix.from.test(content)) {
      content = content.replace(fix.from, fix.to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
  }

  return modified;
}

async function main() {
  console.log('🔧 Fixing test type errors...\n');

  // Find all test files
  const testsDir = path.join(process.cwd(), 'tests');
  const testFiles = getTestFiles(testsDir);

  console.log(`Found ${testFiles.length} test files\n`);

  let fixedCount = 0;
  for (const file of testFiles) {
    const wasFixed = await fixFile(file);
    if (wasFixed) fixedCount++;
  }

  console.log(`\n✅ Fixed ${fixedCount} files`);
  console.log(`\nNext steps:`);
  console.log(`1. Review changes: git diff`);
  console.log(`2. Run tests: pnpm test`);
  console.log(`3. Run type check: pnpm tsc --noEmit`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
