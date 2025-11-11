const fs = require('fs');

console.log('Fixing ColumnConfig issues across multiple test files...\n');

// Template for ColumnConfig properties to add
function addColumnConfigProperties(content) {
  // Pattern 1: Add db_column_name and category_color after updated_at, before closing brace
  content = content.replace(
    /(updated_at: ".*?",)\n(\s+)(};?\s*as ColumnConfig|};?$)/gm,
    (match, p1, indent, closing) => {
      // Check if properties already exist in the context
      const contextBefore = content.substring(Math.max(0, content.indexOf(match) - 300), content.indexOf(match));
      if (contextBefore.includes('db_column_name') && contextBefore.includes('category_color')) {
        return match;
      }
      return `${p1}\n${indent}db_column_name: "test_column",\n${indent}category_color: null,\n${indent}${closing}`;
    }
  );
  
  // Pattern 2: Add before created_at if that comes before updated_at
  content = content.replace(
    /(is_visible: true,)\n(\s+)(created_at:)/gm,
    (match, p1, indent, nextProp) => {
      const contextBefore = content.substring(Math.max(0, content.indexOf(match) - 300), content.indexOf(match));
      if (contextBefore.includes('db_column_name')) {
        return match;
      }
      return `${p1}\n${indent}db_column_name: "test_column",\n${indent}category_color: null,\n${indent}${nextProp}`;
    }
  );
  
  return content;
}

// Fix column-config-repository.test.ts
console.log('Fixing tests/unit/repositories/column-config-repository.test.ts...');
let content = fs.readFileSync('tests/unit/repositories/column-config-repository.test.ts', 'utf8');

// Add db_column_name and category_color to ColumnConfig mocks
content = addColumnConfigProperties(content);

// Fix CreateColumnConfigParams - add db_column_name and is_masterdata (lines 277, 319, 345)
content = content.replace(
  /const params = \{\n\s+column_name: ".*?",\n\s+column_type: "text",\n\s+role: UserRole\.SODEXO,\n(\s+category: .*?,\n)?(\s+)}/g,
  (match) => {
    if (match.includes('db_column_name')) {
      return match;
    }
    const hasCategory = match.includes('category:');
    if (hasCategory) {
      return match.replace(
        /(category: .*?,\n)(\s+)}/,
        '$1$2db_column_name: "test_column",\n$2is_masterdata: false,\n$2}'
      );
    } else {
      return match.replace(
        /(role: UserRole\.SODEXO,\n)(\s+)}/,
        '$1$2db_column_name: "test_column",\n$2is_masterdata: false,\n$2}'
      );
    }
  }
);

fs.writeFileSync('tests/unit/repositories/column-config-repository.test.ts', content, 'utf8');
console.log('✓ Fixed tests/unit/repositories/column-config-repository.test.ts\n');

// Fix story-7.4-column-ux.test.ts
console.log('Fixing tests/integration/story-7.4-column-ux.test.ts...');
content = fs.readFileSync('tests/integration/story-7.4-column-ux.test.ts', 'utf8');
content = addColumnConfigProperties(content);
fs.writeFileSync('tests/integration/story-7.4-column-ux.test.ts', content, 'utf8');
console.log('✓ Fixed tests/integration/story-7.4-column-ux.test.ts\n');

// Fix column-settings-table.test.tsx
console.log('Fixing tests/unit/components/column-settings-table.test.tsx...');
content = fs.readFileSync('tests/unit/components/column-settings-table.test.tsx', 'utf8');
content = addColumnConfigProperties(content);
fs.writeFileSync('tests/unit/components/column-settings-table.test.tsx', content, 'utf8');
console.log('✓ Fixed tests/unit/components/column-settings-table.test.tsx\n');

console.log('All ColumnConfig fixes complete!');
