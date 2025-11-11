/**
 * Script to fix duplicate is_visible properties in ColumnConfig objects
 * caused by Story 8.15's contamination
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'tests/unit/components/employee-table.test.tsx'
);
let content = fs.readFileSync(filePath, 'utf8');

// Pattern: Match ColumnConfig with duplicate is_visible
// First occurrence is correct, second one after created_at needs removal
const pattern =
  /(\s+created_at: "[^"]+",\s+db_column_name: '[^']+',\s+category_color: '#[A-F0-9]+',\s+display_order: \d+,\s+)is_visible: true,(\s+updated_at: [^\n]+)/g;

// Remove the second is_visible (the contamination from Employee type)
const replacement = '$1$2';

const fixedContent = content.replace(pattern, replacement);

const matchCount = (content.match(pattern) || []).length;

if (fixedContent !== content) {
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log(
    `✅ Fixed ${matchCount} duplicate is_visible properties in ColumnConfig objects`
  );
} else {
  console.log('❌ No matches found - pattern may need adjustment');
}
