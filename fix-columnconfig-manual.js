const fs = require('fs');

const filePath = 'tests/unit/repositories/column-config-repository.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log(
  'Fixing ColumnConfig in column-config-repository.test.ts with line-by-line approach...'
);

// Fix 1: Add db_column_name and category_color to all ColumnConfig mocks
// Pattern: Find is_visible: true, followed by created_at or updated_at
content = content.replace(
  /(is_visible: true,)\n(\s+)(created_at|updated_at)/g,
  (match, p1, indent, nextProp) => {
    return `${p1}\n${indent}db_column_name: "test_column",\n${indent}category_color: null,\n${indent}${nextProp}`;
  }
);

// Fix 2: Add db_column_name and is_masterdata to CreateColumnConfigParams
content = content.replace(
  /(await repository\.createCustomColumn\(\{\s+column_name: ".*?",\s+column_type: "text",\s+role: UserRole\.SODEXO,)/g,
  '$1\n        db_column_name: "test_column",\n        is_masterdata: false,'
);

// Fix 3: Also fix params with category
content = content.replace(
  /(const result = await repository\.createCustomColumn\(\{\s+column_name: ".*?",\s+column_type: "text",\s+role: UserRole\.SODEXO,\s+category: ".*?",)/g,
  '$1\n        db_column_name: "test_column",\n        is_masterdata: false,'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed column-config-repository.test.ts');
