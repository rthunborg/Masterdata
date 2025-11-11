const fs = require('fs');
const path = require('path');

const files = [
  'tests/integration/story-7.4-column-ux.test.ts',
  'tests/unit/components/column-settings-table.test.tsx'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add db_column_name and category_color after is_visible: true
  content = content.replace(
    /is_visible: true,(\s+)role_permissions:/g,
    `is_visible: true,$1db_column_name: 'test_column',$1category_color: null,$1role_permissions:`
  );
  
  // Add db_column_name and category_color after is_visible: false
  content = content.replace(
    /is_visible: false,(\s+)role_permissions:/g,
    `is_visible: false,$1db_column_name: 'test_column',$1category_color: null,$1role_permissions:`
  );
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\n✓ Added db_column_name and category_color to all ColumnConfig mocks');
