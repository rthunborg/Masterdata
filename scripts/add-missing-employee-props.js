/**
 * Simple script to add missing Employee properties to test mocks
 * Adds properties right before closing brace of Employee objects
 */

import fs from 'fs';
import path from 'path';

const MISSING_PROPS = `one: null,
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
        repayment_needed_omc: null,
        repayment_needed_pe3: null,`;

let filesModified = 0;
let propsAdded = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Pattern: Look for Employee objects that have updated_at but missing repayment_needed_omc
  // This catches most Employee mock objects
  const pattern = /(\s+updated_at:\s*"[^"]*",?\s*\n\s+)(})/g;

  content = content.replace(pattern, (match, before, closing) => {
    // Check if repayment_needed_omc already exists nearby
    const contextStart = Math.max(0, content.indexOf(match) - 1000);
    const contextEnd = Math.min(content.length, content.indexOf(match) + 500);
    const context = content.substring(contextStart, contextEnd);

    if (context.includes('repayment_needed_omc')) {
      return match; // Already has the properties
    }

    propsAdded++;
    return before + MISSING_PROPS + '\n      ' + closing;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    console.log(`✓ ${path.relative(process.cwd(), filePath)}`);
    return true;
  }

  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      try {
        processFile(filePath);
      } catch (error) {
        console.error(`✗ Error in ${filePath}:`, error.message);
      }
    }
  }
}

console.log('🔧 Adding missing Employee properties to test mocks...\n');
walkDir(path.join(process.cwd(), 'tests'));
console.log(
  `\n✨ Modified ${filesModified} files (${propsAdded} Employee objects updated)`
);
