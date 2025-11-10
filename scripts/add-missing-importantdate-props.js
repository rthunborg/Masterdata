/**
 * Add missing ImportantDate properties to test mocks
 */

import fs from 'fs';
import path from 'path';

const MISSING_PROPS = `time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 99,
      remaining_spots: 99,
      assigned_employees: [],`;

let filesModified = 0;
let propsAdded = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Pattern: Look for ImportantDate objects that have date field and updated_at but missing time_value
  const pattern = /(updated_at:\s*['"`][^'"`]+['"`],?\s*\n\s+)(})/g;

  content = content.replace(pattern, (match, before, closing) => {
    // Check context to see if this is an ImportantDate object
    const matchIndex = content.indexOf(match);
    const contextStart = Math.max(0, matchIndex - 800);
    const contextEnd = Math.min(
      content.length,
      matchIndex + match.length + 200
    );
    const context = content.substring(contextStart, contextEnd);

    // Only process if this looks like an ImportantDate (has date: and description:)
    // and doesn't already have max_spots
    if (
      !context.includes('date:') ||
      !context.includes('description:') ||
      context.includes('max_spots')
    ) {
      return match;
    }

    propsAdded++;
    return before + MISSING_PROPS + '\n    ' + closing;
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

console.log('🔧 Adding missing ImportantDate properties to test mocks...\n');
walkDir(path.join(process.cwd(), 'tests'));
console.log(
  `\n✨ Modified ${filesModified} files (${propsAdded} ImportantDate objects updated)`
);
