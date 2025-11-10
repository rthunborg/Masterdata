/**
 * Fix indentation issues where ColumnConfig properties were added outside the closing brace
 */

import fs from 'fs';
import path from 'path';

let filesModified = 0;
let issuesFixed = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Pattern: Find cases where properties are outside the closing brace
  // Look for:  created_at: "...",\n      db_column_name: ... \n    },
  // Should be: created_at: "...",\n        db_column_name: ... \n      },
  
  const pattern = /(created_at:\s*"[^"]+",)\s*\n\s{6}(db_column_name:\s*'test_column',\s*\n\s{6}category_color:\s*'#FFFFFF',\s*\n\s{6}display_order:\s*0,\s*\n\s{6}is_visible:\s*true,\s*\n\s{6}updated_at:\s*new Date\(\)\.toISOString\(\),)\s*\n\s{4}(},)/g;
  
  content = content.replace(pattern, (match, createdAt, props, closeBrace) => {
    issuesFixed++;
    // Move properties inside the object with correct indentation
    const fixedProps = props.replace(/\n\s{6}/g, '\n        ');
    return `${createdAt}\n        ${fixedProps}\n      ${closeBrace}`;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;
    console.log(`✓ ${path.relative(process.cwd(), filePath)} (${issuesFixed} indentation issues fixed)`);
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
      issuesFixed = 0;
      try {
        processFile(filePath);
      } catch (error) {
        console.error(`✗ Error in ${filePath}:`, error.message);
      }
    }
  }
}

console.log('🔧 Fixing ColumnConfig indentation issues...\n');
walkDir(path.join(process.cwd(), 'tests'));
console.log(`\n✨ Modified ${filesModified} files`);
