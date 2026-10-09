-- Reconcile the exact post-apply state observed after the staged 65-version
-- sequence. This forward-only correction removes the unintended explicit
-- service-role execution grant and normalizes the two remaining RLS initplans.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM service_role;

ALTER POLICY "Manage column configs"
  ON public.column_config
  USING (
    EXISTS (
      SELECT 1
      FROM public.users AS caller
      WHERE caller.auth_user_id = (SELECT auth.uid())
        AND caller.role = 'hr_admin'
        AND caller.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users AS caller
      WHERE caller.auth_user_id = (SELECT auth.uid())
        AND caller.role = 'hr_admin'
        AND caller.is_active = true
    )
  );

ALTER POLICY "Authorized roles can read visible employee changes"
  ON public.employee_column_changes
  USING (
    EXISTS (
      SELECT 1
      FROM public.users AS caller
      WHERE caller.auth_user_id = (SELECT auth.uid())
        AND caller.is_active = true
        AND caller.role = ANY (
          ARRAY['hr_admin', 'recruiter', 'sodexo', 'omc', 'payroll', 'toplux', 'crewing']
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.employees AS visible_employee
      WHERE visible_employee.id = employee_column_changes.employee_id
    )
    AND (
      (SELECT public.get_user_role()) = ANY (ARRAY['hr_admin', 'recruiter'])
      OR EXISTS (
        SELECT 1
        FROM public.column_config AS visible_column
        WHERE lower(visible_column.db_column_name) = lower(employee_column_changes.column_name)
          AND visible_column.is_masterdata = true
          AND COALESCE(
            visible_column.role_permissions
              -> (SELECT public.get_user_role())
              ->> 'view',
            'false'
          ) = 'true'
      )
    )
  );

COMMIT;
