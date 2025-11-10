const fs = require('fs');
const path = require('path');

// Pattern to find and replace SessionUser objects with Employee/ColumnConfig properties
const filesToFix = [
  'tests/unit/hooks/use-columns.test.ts',
  'tests/integration/edit-column.test.ts',
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Pattern: Remove db_column_name, category_color, display_order, is_visible, updated_at from SessionUser objects
  // Replace with last_active_at
  
  // Find user objects that have role: and db_column_name (indicating contamination)
  const userObjectPattern = /(user:\s*\{\s*(?:[^}]*?))(db_column_name:\s*['"][^'"]*['"],?\s*category_color:\s*['"][^'"]*['"],?\s*display_order:\s*\d+,?\s*is_visible:\s*true,?\s*updated_at:\s*[^,}]+,?\s*)/gs;
  
  content = content.replace(userObjectPattern, (match, before, contaminated) => {
    return before + `last_active_at: new Date().toISOString(),\n      `;
  });
  
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`Fixed ${filePath}`);
});

console.log('Done!');
