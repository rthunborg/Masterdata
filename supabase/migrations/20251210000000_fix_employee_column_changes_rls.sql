/*
  # Add RLS Policies for Employee Column Changes

  1. Enable RLS on `employee_column_changes`
  2. Add policies:
     - INSERT: Allow authenticated users (anyone who can update employees needs to be able to insert here via trigger)
     - SELECT: Allow authenticated users to view changes (External parties need this for notifications)
*/

-- Enable RLS
ALTER TABLE public.employee_column_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to INSERT
-- This is necessary because the trigger on `employees` table runs with the user's privileges.
-- If they can update an employee, they implicitly trigger an insert here.
CREATE POLICY "Enable insert for authenticated users" ON public.employee_column_changes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to SELECT
-- Ideally this would be scoped to "employees visible to the user", but for now matching the read access pattern
-- The application layer filters by employee_id, and users can only request changes for employees they can see.
CREATE POLICY "Enable select for authenticated users" ON public.employee_column_changes
  FOR SELECT USING (auth.role() = 'authenticated');

