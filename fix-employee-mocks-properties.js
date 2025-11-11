const fs = require('fs');
const path = require('path');

// This script adds the missing properties to Employee mock objects
// Missing properties (from type definition):
// - repayment_needed_omc, repayment_needed_pe3, repayment_amount_omc, repayment_amount_pe3, repayment_paid_omc, repayment_paid_pe3
// - stena_date, pe3_date, omc_date
// - one, one_marked_at, isps, sms, dmr, psc
// - stcw_deadline, coc_deadline, eez_deadline, solas_deadline, dsd_deadline, ctc_deadline, ep_deadline

const missingEmployeeProperties = `stena_date: null,
    omc_date: null,
    pe3_date: null,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    repayment_amount_omc: null,
    repayment_amount_pe3: null,
    repayment_paid_omc: null,
    repayment_paid_pe3: null,
    one: null,
    one_marked_at: null,
    isps: null,
    sms: null,
    dmr: null,
    psc: null,
    stcw_deadline: null,
    coc_deadline: null,
    eez_deadline: null,
    solas_deadline: null,
    dsd_deadline: null,
    ctc_deadline: null,
    ep_deadline: null,`;

// Find Employee objects that have email and first_name but are missing repayment_needed_omc
// Pattern: Look for objects with rank: "SEV"|"CHEF" and missing repayment_needed_omc
const employeePattern =
  /(rank:\s*["'](?:SEV|CHEF)["'],?\s+gender:.*?)(termination_date:.*?termination_reason:.*?)(is_terminated:.*?is_archived:)/gs;

const files = [
  'tests/integration/api/employees-import-relaxed-validation.test.ts',
  'tests/integration/api/employees-import.test.ts',
  'tests/integration/api/employees.test.ts',
  'tests/integration/components/employee-table-columns.test.tsx',
  'tests/integration/components/employee-table-permissions.test.tsx',
  'tests/integration/crewing-done-conditional.test.ts',
  'tests/integration/date-capacity-concurrency.test.ts',
  'tests/integration/realtime-sync.test.tsx',
  'tests/integration/talmundo-conditional-edit.test.ts',
  'tests/unit/components/add-employee-modal.test.tsx',
  'tests/unit/components/employee-table.test.tsx',
  'tests/unit/hooks/use-employees.test.ts',
  'tests/unit/repositories/employee-repository.test.ts',
  'tests/unit/services/employee-service.test.ts',
  'tests/unit/utils/change-detection.test.ts',
  'tests/unit/utils/column-mapping.test.ts',
  'tests/unit/validation/employee-schema.test.ts',
];

files.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Add missing properties before is_terminated
  content = content.replace(employeePattern, (match, before, middle, after) => {
    return (
      before + middle + '\n    ' + missingEmployeeProperties + '\n    ' + after
    );
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`No changes needed in ${filePath}`);
  }
});

console.log('Done adding missing Employee properties!');
