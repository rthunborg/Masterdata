/**
 * Bulk fix remaining common type errors:
 * 1. Add db_column_name to ColumnConfig objects missing it
 * 2. Add assigned_employees to ImportantDate objects
 * 3. Add last_active_at to User/SessionUser objects
 * 4. Add last_active_at to CreateUserResponse objects
 * 5. Add allColumns to ColumnSettingsTableProps
 */

const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  'tests/integration/api/category-colors.test.ts',
  'tests/integration/api/important-dates.test.ts',
  'tests/integration/api/users.test.ts',
  'tests/unit/components/column-settings-table.test.tsx',
  'tests/unit/components/role-selector.test.tsx',
  'tests/unit/components/user-management-table.test.tsx',
];

let totalFixes = 0;

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} - file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileFixCount = 0;

  // Fix 1: Add db_column_name to ColumnConfig after category_color
  if (file.includes('category-colors')) {
    const pattern1 = /(category_color: "[^"]+",\s+created_at:)/g;
    const replacement1 = `category_color: "$1",
      db_column_name: 'custom_column',
      created_at:`;
    const before = content;
    content = content.replace(pattern1, (match, color) => {
      return `category_color: "${color}",
      db_column_name: 'custom_column',
      created_at:`;
    });
    if (content !== before) {
      fileFixCount += (before.match(pattern1) || []).length;
    }
  }

  // Fix 2: Add assigned_employees to ImportantDate after remaining_spots
  if (file.includes('important-dates')) {
    const pattern2 = /(remaining_spots: \d+,\s+)(id: "[^"]+")/g;
    const replacement2 = `$1assigned_employees: [],
        $2`;
    const before = content;
    content = content.replace(pattern2, replacement2);
    if (content !== before) {
      fileFixCount += (before.match(pattern2) || []).length;
    }
  }

  // Fix 3: Add last_active_at to User/SessionUser after created_at
  if (
    file.includes('users.test.ts') ||
    file.includes('role-selector') ||
    file.includes('user-management')
  ) {
    // For User/SessionUser objects
    const pattern3a = /(created_at: "[^"]+",)(\s+})/g;
    const replacement3a = `$1
      last_active_at: new Date().toISOString(),$2`;
    const before = content;
    content = content.replace(pattern3a, replacement3a);
    if (content !== before) {
      fileFixCount += (before.match(pattern3a) || []).length;
    }

    // For CreateUserResponse with temporary_password
    const pattern3b = /(temporary_password: "[^"]+",)(\s+})/g;
    const replacement3b = `$1
      last_active_at: new Date().toISOString(),$2`;
    const before2 = content;
    content = content.replace(pattern3b, replacement3b);
    if (content !== before2) {
      fileFixCount += (before2.match(pattern3b) || []).length;
    }
  }

  // Fix 4: Add allColumns prop to ColumnSettingsTable
  if (file.includes('column-settings-table')) {
    const pattern4 =
      /(<ColumnSettingsTable\s+columns=\{[^\}]+\}\s+onPermissionsUpdated=\{[^\}]+\})\s*\/>/g;
    const replacement4 = `$1
        allColumns={columns}
      />`;
    const before = content;
    content = content.replace(pattern4, replacement4);
    if (content !== before) {
      fileFixCount += (before.match(pattern4) || []).length;
    }
  }

  if (fileFixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${fileFixCount} issues in ${file}`);
    totalFixes += fileFixCount;
  } else {
    console.log(`ℹ️  No changes needed in ${file}`);
  }
}

console.log(`\n✅ Total fixes applied: ${totalFixes}`);
