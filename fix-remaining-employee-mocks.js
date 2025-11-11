const fs = require('fs');

// Template for complete EmployeeFormData missing properties
const missingPropertiesTemplate = `      repayment_needed_omc: null,
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

const missingEmployeeProperties = `        repayment_needed_omc: null,
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

function removeDuplicateComments(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  let seenComments = new Set();
  let currentObjectStart = -1;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track brace depth
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (
      openBraces > 0 &&
      (trimmed.includes('const mock') || trimmed.includes('Employee'))
    ) {
      currentObjectStart = braceDepth;
      seenComments = new Set();
    }

    braceDepth += openBraces - closeBraces;

    // Check for comments property
    if (trimmed.startsWith('comments:')) {
      const key = `${currentObjectStart}-${braceDepth}`;
      if (seenComments.has(key)) {
        console.log(`  Removing duplicate comments at line ${i + 1}`);
        continue;
      }
      seenComments.add(key);
    }

    fixedLines.push(line);
  }

  return fixedLines.join('\n');
}

function addMissingPropertiesToEmployeeFormData(content) {
  // Pattern: EmployeeFormData with is_archived: false, comments: null, followed by closing brace
  // Add missing properties before comments
  return content.replace(
    /(is_archived: false,)\n(\s+comments: null,)/g,
    (match, p1, p2) => {
      const indent = p2.match(/^(\s+)/)[1];
      // Check if properties already exist nearby
      const contextBefore = content.substring(
        Math.max(0, content.indexOf(match) - 500),
        content.indexOf(match)
      );
      if (contextBefore.includes('repayment_needed_omc')) {
        return match;
      }
      return `${p1}\n${missingPropertiesTemplate.replace(/      /g, indent)}\n${p2}`;
    }
  );
}

function addMissingPropertiesToEmployee(content, filePath) {
  // For Employee mocks missing properties after pe3_date
  return content.replace(
    /(pe3_date: null,)\n([\s]+)(termination_date|created_at)/g,
    (match, p1, indent, nextProp) => {
      // Check if this Employee already has the properties
      const contextBefore = content.substring(
        Math.max(0, content.indexOf(match) - 1000),
        content.indexOf(match)
      );
      if (
        contextBefore.includes('repayment_needed_omc') ||
        contextBefore.includes('crewing_done')
      ) {
        return match;
      }

      if (nextProp === 'created_at') {
        // Need to add termination fields + all boolean fields
        return `${p1}\n${indent}termination_date: null,\n${indent}termination_reason: null,\n${indent}is_terminated: false,\n${indent}is_archived: false,\n${missingEmployeeProperties.replace(/        /g, indent)}\n${indent}comments: null,\n${indent}created_at`;
      } else {
        // Just add boolean fields (termination fields already there)
        return `${p1}\n${indent}${nextProp}`;
      }
    }
  );
}

// Files to fix
const files = [
  'tests/unit/services/employee-service.test.ts',
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/talmundo-conditional-edit.test.ts',
  'tests/unit/validation/employee-schema.test.ts',
  'tests/unit/utils/column-mapping.test.ts',
];

files.forEach((file) => {
  console.log(`\nFixing ${file}...`);
  let content = fs.readFileSync(file, 'utf8');

  // Remove duplicate comments
  content = removeDuplicateComments(content);

  // Add missing properties to EmployeeFormData
  content = addMissingPropertiesToEmployeeFormData(content);

  // Add missing properties to Employee
  content = addMissingPropertiesToEmployee(content, file);

  fs.writeFileSync(file, content, 'utf8');
  console.log(`✓ Fixed ${file}`);
});

console.log('\nAll Employee mock fixes applied!');
