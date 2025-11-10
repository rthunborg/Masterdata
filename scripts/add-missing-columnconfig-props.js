/**
 * Add missing ColumnConfig properties to test mocks
 */

import fs from 'fs';
import path from 'path';

const MISSING_PROPS = `db_column_name: 'test_column',
      category_color: '#FFFFFF',
      display_order: 0,
      is_visible: true,
      updated_at: new Date().toISOString(),`;

let filesModified = 0;
let propsAdded = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Pattern: Look for ColumnConfig objects that have created_at but missing db_column_name
  // Match objects with column_name, column_type, created_at
  const pattern = /(created_at:\s*['"`][^'"`]+['"`],?\s*\n\s+)(})/g;

  content = content.replace(pattern, (match, before, closing) => {
    // Check if db_column_name already exists in nearby context
    const matchIndex = content.indexOf(match);
    const contextStart = Math.max(0, matchIndex - 800);
    const contextEnd = Math.min(
      content.length,
      matchIndex + match.length + 200
    );
    const context = content.substring(contextStart, contextEnd);

    // Only add if this looks like a ColumnConfig and doesn't have db_column_name
    if (
      !context.includes('column_name:') ||
      context.includes('db_column_name')
    ) {
      return match; // Not a ColumnConfig or already has the properties
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

console.log('🔧 Adding missing ColumnConfig properties to test mocks...\n');
walkDir(path.join(process.cwd(), 'tests'));
console.log(
  `\n✨ Modified ${filesModified} files (${propsAdded} ColumnConfig objects updated)`
);
