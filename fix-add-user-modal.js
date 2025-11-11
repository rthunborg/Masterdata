/**
 * Fix CreateUserResponse objects in add-user-modal.test.tsx
 * Add last_active_at after temporary_password
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests/unit/components/add-user-modal.test.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Pattern: Find CreateUserResponse objects with temporary_password but missing last_active_at
const pattern = /(temporary_password: '[^']+',)(\s+}\);)/g;

// Add last_active_at after temporary_password
const replacement = `$1
      last_active_at: new Date().toISOString(),$2`;

const fixedContent = content.replace(pattern, replacement);
const matchCount = (content.match(pattern) || []).length;

if (fixedContent !== content) {
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log(`✅ Fixed ${matchCount} CreateUserResponse objects`);
} else {
  console.log('❌ No matches found');
}
