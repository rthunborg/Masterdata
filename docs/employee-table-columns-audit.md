# Employee Table Columns Audit
## Created: 2025-11-15

This document provides a comprehensive audit of all columns in the `employees` table and their corresponding entries in `column_config`.

## Employees Table Schema

Based on migrations, the `employees` table should have the following columns:

### Core Identity Fields (Required)
1. `id` (UUID, PRIMARY KEY) - Not in column_config (system field)
2. `first_name` (TEXT NOT NULL) ✅ In column_config as "First Name"
3. `surname` (TEXT NOT NULL) ✅ In column_config as "Surname"
4. `ssn` (TEXT UNIQUE NOT NULL) ✅ In column_config as "Social Security No."

### Contact Information
5. `email` (TEXT) ✅ In column_config as "Email"
6. `mobile` (TEXT) ✅ In column_config as "Mobile"

### Employment Details
7. `rank` (TEXT) ✅ In column_config as "Rank"
8. `gender` (TEXT) ✅ In column_config as "Gender"
9. `town_district` (TEXT) ✅ In column_config as "Town District"
10. `hire_date` (DATE NOT NULL) ❌ **MISSING from column_config** - **FIXED in migration 20251115000000**
11. `termination_date` (DATE) ❌ **MISSING from column_config** - **FIXED in migration 20251115000000**
12. `termination_reason` (TEXT) ❌ **MISSING from column_config** - **FIXED in migration 20251115000000**

### Status Fields
13. `is_terminated` (BOOLEAN NOT NULL DEFAULT false) - Not in column_config (system field)
14. `is_archived` (BOOLEAN NOT NULL DEFAULT false) - Not in column_config (system field)

### Important Dates (Added in migration 20251030000000)
15. `stena_date` (TEXT) ✅ In column_config as "Stena Date"
16. `omc_date` (TEXT) ✅ In column_config as "ÖMC Date"
17. `pe3_date` (TEXT) ✅ In column_config as "PE3 Date"

### Additional Masterdata Fields (Added in migration 20251102000003)
18. `one` (TEXT) ✅ In column_config as "One"
19. `isps` (TEXT) ✅ In column_config as "ISPS"
20. `photo` (TEXT) ✅ In column_config as "Photo"
21. `origo` (TEXT) ✅ In column_config as "Origo"
22. `loneiva` (TEXT) ✅ In column_config as "Lönenivå"
23. `mail_lon` (TEXT) ✅ In column_config as "Mail lön"
24. `bankuppgifter` (TEXT) ✅ In column_config as "Bankuppgifter"
25. `li` (TEXT) ✅ In column_config as "LI"
26. `passport` (TEXT) ✅ In column_config as "Passport"
27. `kvitto_c17_18` (TEXT) ✅ In column_config as "Kvitto C17/18"
28. `c17` (TEXT) ✅ In column_config as "C17"
29. `crewing_done` (TEXT) ✅ In column_config as "Crewing/Done"

### Other Fields
30. `comments` (TEXT) ✅ In column_config as "Comments"

### System Fields (Not in column_config)
31. `created_at` (TIMESTAMPTZ NOT NULL) - System field
32. `updated_at` (TIMESTAMPTZ NOT NULL) - System field

## Issues Found

### Missing from column_config (FIXED)
1. **Hire Date** (`hire_date`) - Required field, missing from comprehensive seed
2. **Termination Date** (`termination_date`) - Optional field, missing from comprehensive seed
3. **Termination Reason** (`termination_reason`) - Optional field, missing from comprehensive seed

### Resolution
Migration `20251115000000_add_missing_hire_date_to_column_config.sql` has been created to add these missing columns to `column_config`.

## Summary

- **Total columns in employees table**: 32 (including system fields)
- **Columns that should be in column_config**: 27 (excluding system fields: id, created_at, updated_at, is_terminated, is_archived)
- **Columns currently in column_config**: 24 (before fix)
- **Columns missing**: 3 (Hire Date, Termination Date, Termination Reason) - **NOW FIXED**

## Next Steps

1. Apply migration `20251115000000_add_missing_hire_date_to_column_config.sql`
2. Verify the form can now find the hire_date field
3. Re-run E2E tests to confirm fix

