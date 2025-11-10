/**
 * Fix ImportantDate objects that incorrectly have Employee properties
 * Remove Employee-specific properties and add proper ImportantDate properties
 */

import fs from 'fs';
import path from 'path';

const EMPLOYEE_PROPS_TO_REMOVE = [
  'one_marked_at', 'talmundo', 'isps', 'photo', 'origo', 'loneiva',
  'mail_lon', 'bankuppgifter', 'li', 'passport', 'kvitto_c17_18',
  'c17', 'crewing_done', 'repayment_needed_omc', 'repayment_needed_pe3'
];

const IMPORTANTDATE_PROPS = `is_active: true,
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 99,
      remaining_spots: 99,
      assigned_employees: [],`;

const IMPORTANTDATEFORMDATA_PROPS = `time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 99,
      remaining_spots: 99,`;

let filesModified = 0;
let propsRemoved = 0;
let propsAdded = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Remove Employee properties from ImportantDate objects
  for (const prop of EMPLOYEE_PROPS_TO_REMOVE) {
    const pattern = new RegExp(`\\s+${prop}:\\s*(?:null|false|true|\\d+),?\\s*\\n`, 'g');
    const matches = content.match(pattern);
    if (matches) {
      propsRemoved += matches.length;
      content = content.replace(pattern, '');
    }
  }
  
  // Add ImportantDate properties to objects with updated_at
  // Look for ImportantDate pattern: has date_description/date_value/week_number
  const importantDatePattern = /(week_number:\s*(?:number|null|\d+),?\s*\n\s+year:\s*\d+,?\s*\n\s+category:\s*['"`][^'"`]+['"`],?\s*\n\s+date_description:[\s\S]*?updated_at:\s*['"`][^'"`]+['"`],?\s*\n\s+)(})/g;
  
  content = content.replace(importantDatePattern, (match, before, closing) => {
    // Check if already has the properties
    if (match.includes('max_spots') || match.includes('assigned_employees')) {
      return match;
    }
    
    propsAdded++;
    return before + IMPORTANTDATE_PROPS + '\n    ' + closing;
  });
  
  // Add ImportantDateFormData properties to objects without updated_at
  // Pattern: week_number, year, category, date_description, date_value, notes (but NO updated_at, NO id)
  const formDataPattern = /(week_number:\s*(?:number|null|\d+),?\s*\n\s+year:\s*\d+,?\s*\n\s+category:\s*['"`][^'"`]+['"`],?\s*\n\s+date_description:\s*['"`][^'"`]+['"`],?\s*\n\s+date_value:\s*['"`][^'"`]+['"`],?\s*\n\s+notes:\s*(?:null|['"`][^'"`]*['"`]),?\s*\n\s+)(})/g;
  
  content = content.replace(formDataPattern, (match, before, closing) => {
    // Skip if this already looks like a complete ImportantDate (has id or updated_at)
    const contextStart = Math.max(0, content.indexOf(match) - 200);
    const contextEnd = Math.min(content.length, content.indexOf(match) + match.length + 100);
    const context = content.substring(contextStart, contextEnd);
    
    if (context.includes('updated_at:') || context.includes('id:') || match.includes('max_spots')) {
      return match;
    }
    
    propsAdded++;
    return before + IMPORTANTDATEFORMDATA_PROPS + '\n    ' + closing;
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

console.log('🔧 Fixing ImportantDate objects with wrong Employee properties...\n');
walkDir(path.join(process.cwd(), 'tests'));
console.log(`\n✨ Modified ${filesModified} files`);
console.log(`   - Removed ${propsRemoved} Employee properties`);
console.log(`   - Added ImportantDate properties to ${propsAdded} objects`);
