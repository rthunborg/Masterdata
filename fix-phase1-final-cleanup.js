const fs = require('fs');

// Fix important-dates.test.ts - remove duplicate properties
console.log('\nFixing tests/integration/api/important-dates.test.ts...');
let content = fs.readFileSync(
  'tests/integration/api/important-dates.test.ts',
  'utf8'
);

// Remove duplicate properties in ImportantDate mocks (lines 345-350)
// These are likely duplicate date-related properties
const lines = content.split('\n');
const seenProps = new Map();
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^\s+(\w+):\s/);

  if (match) {
    const propName = match[1];
    const indent = line.match(/^(\s+)/)?.[1] || '';
    const key = `${indent}-${propName}`;

    // Check if we're in the problematic area (around line 345)
    if (i >= 340 && i <= 355) {
      if (seenProps.has(key)) {
        console.log(`  Removing duplicate '${propName}' at line ${i + 1}`);
        continue;
      }
      seenProps.set(key, true);
    }
  }

  // Reset seen props when we hit a closing brace at the same level
  if (line.trim() === '};' || line.trim() === '},') {
    seenProps.clear();
  }

  fixedLines.push(line);
}

content = fixedLines.join('\n');
fs.writeFileSync(
  'tests/integration/api/important-dates.test.ts',
  content,
  'utf8'
);
console.log('✓ Fixed tests/integration/api/important-dates.test.ts');

// Fix crewing-done and talmundo test files
console.log(
  '\nFixing crewing-done-conditional.test.ts and talmundo-conditional-edit.test.ts...'
);

[
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/talmundo-conditional-edit.test.ts',
].forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Add missing properties after pe3_date
  content = content.replace(
    /(pe3_date: null,)\n(\s+)(termination_date|created_at)/g,
    (match, p1, indent, nextProp) => {
      if (content.includes('repayment_needed_omc')) {
        return match;
      }
      return `${p1}\n${indent}termination_date: null,\n${indent}termination_reason: null,\n${indent}is_terminated: false,\n${indent}is_archived: false,\n${indent}repayment_needed_omc: null,\n${indent}repayment_needed_pe3: null,\n${indent}one: null,\n${indent}one_marked_at: null,\n${indent}talmundo: null,\n${indent}isps: null,\n${indent}photo: null,\n${indent}origo: null,\n${indent}loneiva: null,\n${indent}mail_lon: null,\n${indent}bankuppgifter: null,\n${indent}li: null,\n${indent}passport: null,\n${indent}kvitto_c17_18: null,\n${indent}c17: null,\n${indent}crewing_done: null,\n${indent}comments: null,\n${indent}${nextProp}`;
    }
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log(`✓ Fixed ${file}`);
});

// Fix edit-column.test.ts - remove db_column_name from SessionUser
console.log('\nFixing tests/integration/edit-column.test.ts...');
content = fs.readFileSync('tests/integration/edit-column.test.ts', 'utf8');
// Remove db_column_name property from SessionUser mock (line 112)
content = content.replace(
  /(\s+db_column_name: ".*?",\n)(\s+}.*?as SessionUser)/,
  '$2'
);
fs.writeFileSync('tests/integration/edit-column.test.ts', content, 'utf8');
console.log('✓ Fixed tests/integration/edit-column.test.ts');

// Fix date-capacity-concurrency.test.ts
console.log('\nFixing tests/integration/date-capacity-concurrency.test.ts...');
content = fs.readFileSync(
  'tests/integration/date-capacity-concurrency.test.ts',
  'utf8'
);
// Add missing ImportantDate properties
content = content.replace(
  /(notes: null,)\n(\s+)(max_spots:)/,
  '$1\n$2time_value: null,\n$2deadline_submit: null,\n$2deadline_cancel: null,\n$2$3'
);
// Add missing assigned_employees before created_at
content = content.replace(
  /(is_active: true,)\n(\s+)(created_at:)/,
  '$1\n$2assigned_employees: [],\n$2$3'
);
fs.writeFileSync(
  'tests/integration/date-capacity-concurrency.test.ts',
  content,
  'utf8'
);
console.log('✓ Fixed tests/integration/date-capacity-concurrency.test.ts');

console.log('\nAll Phase 1 fixes complete!');
