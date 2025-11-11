const fs = require('fs');

const filePath = 'tests/unit/repositories/employee-repository.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing remaining employee-repository.test.ts issues...');

const missingProps = `          repayment_needed_omc: null,
          repayment_needed_pe3: null,
          one: null,
          one_marked_at: null,
          talmundo: null,
          isps: null,
          photo: null,
          origo: null,
          loneiva: null,
          mail_lon: null,
          bankuppgifter: null,
          li: null,
          passport: null,
          kvitto_c17_18: null,
          c17: null,
          crewing_done: null,`;

// Fix 1: Add missing properties to EmployeeFormData objects in createMany tests
// Pattern: is_archived: false, followed by comments: null or closing brace
content = content.replace(
  /(is_archived: false,)\n(\s+)(comments: null,\n\s+\}|comments: null,|\},)/g,
  (match, p1, indent, closing) => {
    return `${p1}\n${missingProps}\n${indent}${closing}`;
  }
);

// Fix 2: Add missing properties to EmployeeFormData without comments property
content = content.replace(
  /(is_archived: false,)\n(\s+)(\},)/g,
  (match, p1, indent, closing) => {
    return `${p1}\n${missingProps}\n${indent}comments: null,\n${indent}${closing}`;
  }
);

// Fix 3: Fix rank type at line 478 (updateData)
content = content.replace(
  /const updateData = \{\n\s+email: "new@example\.com",\n\s+mobile: "\+46709876543",\n\s+rank: "SEV",/,
  `const updateData = {
      email: "new@example.com",
      mobile: "+46709876543",
      rank: "SEV" as const,`
);

// Fix 4: Add missing properties to Employee mock around line 488
content = content.replace(
  /(const mockEmployee: Employee = \{[\s\S]*?pe3_date: null,)\n(\s+)(termination_date: null,)/,
  (match, p1, indent) => {
    // Only add if not already present
    if (match.includes('repayment_needed_omc')) {
      return match;
    }
    return `${p1}\n${indent}termination_date: null,\n${indent}termination_reason: null,\n${indent}is_terminated: false,\n${indent}is_archived: false,\n${indent.trim()}      repayment_needed_omc: null,\n${indent.trim()}      repayment_needed_pe3: null,\n${indent.trim()}      one: null,\n${indent.trim()}      one_marked_at: null,\n${indent.trim()}      talmundo: null,\n${indent.trim()}      isps: null,\n${indent.trim()}      photo: null,\n${indent.trim()}      origo: null,\n${indent.trim()}      loneiva: null,\n${indent.trim()}      mail_lon: null,\n${indent.trim()}      bankuppgifter: null,\n${indent.trim()}      li: null,\n${indent.trim()}      passport: null,\n${indent.trim()}      kvitto_c17_18: null,\n${indent.trim()}      c17: null,\n${indent.trim()}      crewing_done: null,\n${indent.trim()}      comments: null,\n${indent}created_at`;
  }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed all remaining employee-repository.test.ts issues');
