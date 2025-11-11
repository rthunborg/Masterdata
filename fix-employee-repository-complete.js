const fs = require('fs');

const filePath = 'tests/unit/repositories/employee-repository.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing tests/unit/repositories/employee-repository.test.ts...');

// Fix 1: Remove duplicate comments properties (5 instances at lines ~90, 169, 343, 612, 716, 846)
// Pattern: Find duplicate comments within the same object literal
const lines = content.split('\n');
let fixedLines = [];
let inObject = false;
let objectStartLine = -1;
let hasCommentsProperty = false;
let depth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmedLine = line.trim();
  
  // Track object depth
  if (trimmedLine.includes('{')) {
    depth++;
    if (trimmedLine.match(/const mock\w+.*:\s*(Employee|EmployeeFormData)\s*=\s*{/)) {
      inObject = true;
      objectStartLine = i;
      hasCommentsProperty = false;
    }
  }
  
  if (trimmedLine.includes('}')) {
    depth--;
    if (depth === 0 && inObject) {
      inObject = false;
      hasCommentsProperty = false;
    }
  }
  
  // Check for duplicate comments property
  if (inObject && trimmedLine.startsWith('comments:')) {
    if (hasCommentsProperty) {
      console.log(`Removing duplicate comments at line ${i + 1}`);
      continue; // Skip this duplicate line
    }
    hasCommentsProperty = true;
  }
  
  fixedLines.push(line);
}

content = fixedLines.join('\n');

// Fix 2: Add missing properties to EmployeeFormData objects
// These are at lines ~206, 938, 957, 1015, 1034, 1091, 1110, 1129, 1190
const missingProperties = `      repayment_needed_omc: null,
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

// Pattern: Find EmployeeFormData with is_archived: false followed by comments: null
content = content.replace(
  /(const mockEmployeeFormData: EmployeeFormData = \{[\s\S]*?is_archived: false,\n)([\s\S]*?comments: )/g,
  (match, p1, p2) => {
    // Only add if properties are not already present
    if (!match.includes('repayment_needed_omc')) {
      return p1 + missingProperties + '\n' + p2;
    }
    return match;
  }
);

// Also fix EmployeeFormData in arrays (batch operations)
content = content.replace(
  /(\{\n\s+first_name: ".*?",[\s\S]*?is_archived: false,\n)(\s+comments: null,\n\s+\})/g,
  (match, p1, p2) => {
    if (!match.includes('repayment_needed_omc')) {
      return p1 + missingProperties + '\n' + p2;
    }
    return match;
  }
);

// Fix 3: Add missing properties to Employee mocks (line ~490)
content = content.replace(
  /(const mockEmployee: Employee = \{[\s\S]*?pe3_date: null,\n)([\s\S]*?created_at:)/g,
  (match, p1, p2) => {
    if (!match.includes('termination_date') && !match.includes('repayment_needed_omc')) {
      return p1 + `        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
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
        crewing_done: null,
        comments: null,
        ` + p2;
    }
    return match;
  }
);

// Fix 4: Fix rank type error at line ~480
content = content.replace(
  /const updateData = \{\n\s+email: "updated@example\.com",\n\s+mobile: "\+9876543210",\n\s+rank: "CHEF",/,
  `const updateData = {
      email: "updated@example.com",
      mobile: "+9876543210",
      rank: "CHEF" as const,`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed tests/unit/repositories/employee-repository.test.ts');
