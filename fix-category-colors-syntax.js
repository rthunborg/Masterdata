/**
 * Fix corrupted category_color lines in category-colors.test.ts
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests/integration/api/category-colors.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix pattern 1: category_color: "category_color: "#3B82F6",\n    created_at:",
const pattern1 = /category_color: "category_color: "#3B82F6",\s*created_at:",\s*db_column_name: 'custom_column',\s*created_at:/g;
const replacement1 = `category_color: "#3B82F6",
    db_column_name: 'custom_column',
    created_at:`;

content = content.replace(pattern1, replacement1);

// Fix pattern 2: category_color: "category_color: "#10B981",\n    created_at:",
const pattern2 = /category_color: "category_color: "#10B981",\s*created_at:",\s*db_column_name: 'custom_column',\s*created_at:/g;
const replacement2 = `category_color: "#10B981",
    db_column_name: 'custom_column',
    created_at:`;

content = content.replace(pattern2, replacement2);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed corrupted category_color properties');
