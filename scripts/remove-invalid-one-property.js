/**
 * Remove invalid "one" property from ColumnConfig and ImportantDate objects
 * This property belongs to Employee, not these types
 */

import fs from 'fs';
import path from 'path';

let filesModified = 0;
let propsRemoved = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Pattern 1: Remove lines with "one: null," or "one: false," etc
  const onePropertyPattern = /\s+one:\s*(?:null|false|true),?\s*\n/g;
  
  const matches = content.match(onePropertyPattern);
  if (matches) {
    propsRemoved += matches.length;
    content = content.replace(onePropertyPattern, '');
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    console.log(`✓ ${path.relative(process.cwd(), filePath)} (${matches?.length || 0} invalid "one" properties removed)`);
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

console.log('🔧 Removing invalid "one" properties from test mocks...\n');
walkDir(path.join(process.cwd(), 'tests'));
console.log(`\n✨ Modified ${filesModified} files (${propsRemoved} invalid properties removed)`);
