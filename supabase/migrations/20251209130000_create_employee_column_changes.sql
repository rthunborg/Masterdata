-- Create employee column change audit table expected by later RLS and
-- trigger migrations. Hosted environments already have this table, but the
-- tracked local migration chain was missing its creation step.
CREATE TABLE IF NOT EXISTS public.employee_column_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_column_changes_changed_at
ON public.employee_column_changes(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_column_changes_employee_column
ON public.employee_column_changes(employee_id, column_name, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_column_changes_column_name
ON public.employee_column_changes(column_name);
