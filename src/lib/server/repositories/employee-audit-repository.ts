import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types/user';

/**
 * Handles audit history and change detection queries.
 * Split out from the monolithic EmployeeRepository for maintainability.
 */
export class EmployeeAuditRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  async getEmployeeAuditHistory(employeeId: string): Promise<
    Array<{
      columnName: string;
      changedAt: string;
      changedBy: string | null;
      changedByEmail: string | null;
    }>
  > {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: changes, error } = await supabase
        .from('employee_column_changes')
        .select(
          `
          column_name,
          changed_at,
          changed_by,
          users!employee_column_changes_changed_by_fkey (
            email
          )
        `
        )
        .eq('employee_id', employeeId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error(
          'Misslyckades att hämta anställda granskningshistorik:',
          error
        );
        return [];
      }

      if (!changes || changes.length === 0) {
        return [];
      }

      return changes.map((change) => ({
        columnName: change.column_name,
        changedAt: change.changed_at,
        changedBy: change.changed_by,
        changedByEmail:
          (change.users as { email?: string | null })?.email || null,
      }));
    } catch (error) {
      console.error(
        'Oväntat fel vid hämtning av anställda granskningshistorik:',
        error
      );
      return [];
    }
  }

  /**
   * Get employee column changes since a specific timestamp.
   *
   * Returns changes grouped by employee, filtered by visible masterdata
   * columns and excluding archived employees.
   */
  async getChangesSinceLastActive(
    userId: string,
    userRole: string,
    lastActiveAt: string | null
  ): Promise<
    Array<{
      employeeId: string;
      changedColumns: string[];
      lastChangeAt: string;
    }>
  > {
    try {
      const supabase = await this.getSupabaseClient();

      if (!lastActiveAt) {
        return [];
      }

      const { columnConfigRepository } =
        await import('./column-config-repository');
      const { getColumnViewRole } = await import('@/lib/utils/role-utils');
      const allColumns = await columnConfigRepository.findAll();
      const roleForView = getColumnViewRole(userRole as UserRole);
      const visibleMasterdataColumns = allColumns
        .filter((col) => {
          if (!col.is_masterdata) return false;
          return col.role_permissions[roleForView]?.view === true;
        })
        .map((col) => col.db_column_name.toLowerCase().trim());

      if (visibleMasterdataColumns.length === 0) {
        return [];
      }

      const { data: changes, error } = await supabase
        .from('employee_column_changes')
        .select('employee_id, column_name, changed_at')
        .gt('changed_at', lastActiveAt)
        .in('column_name', visibleMasterdataColumns)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error(
          'Misslyckades att hämta anställda kolumnändringar:',
          error
        );
        return [];
      }

      if (!changes || changes.length === 0) {
        return [];
      }

      const employeeIds = Array.from(
        new Set(changes.map((c) => c.employee_id))
      );

      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, is_archived')
        .in('id', employeeIds)
        .eq('is_archived', false);

      if (employeesError) {
        console.error(
          'Misslyckades att hämta anställda för ändringsfiltrering:',
          employeesError
        );
        return [];
      }

      const nonArchivedEmployeeIds = new Set(
        (employees || []).map((emp) => emp.id)
      );

      const changesByEmployee = new Map<
        string,
        {
          changedColumns: Set<string>;
          lastChangeAt: Date;
        }
      >();

      for (const change of changes) {
        const employeeId = change.employee_id;

        if (!nonArchivedEmployeeIds.has(employeeId)) {
          continue;
        }

        const columnName = change.column_name.toLowerCase().trim();
        const changedAt = new Date(change.changed_at);

        if (!changesByEmployee.has(employeeId)) {
          changesByEmployee.set(employeeId, {
            changedColumns: new Set(),
            lastChangeAt: changedAt,
          });
        }

        const employeeChanges = changesByEmployee.get(employeeId)!;
        employeeChanges.changedColumns.add(columnName);

        if (changedAt > employeeChanges.lastChangeAt) {
          employeeChanges.lastChangeAt = changedAt;
        }
      }

      return Array.from(changesByEmployee.entries()).map(
        ([employeeId, data]) => ({
          employeeId,
          changedColumns: Array.from(data.changedColumns),
          lastChangeAt: data.lastChangeAt.toISOString(),
        })
      );
    } catch (error) {
      console.error(
        'Oväntat fel vid hämtning av ändringar sedan senast aktiv:',
        error
      );
      return [];
    }
  }
}

export const employeeAuditRepository = new EmployeeAuditRepository();
