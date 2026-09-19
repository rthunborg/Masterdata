import {
  createClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import type { ColumnConfig } from '@/lib/types/column-config';
import { UserRole } from '@/lib/types/user';
import { getColumnViewRole } from '@/lib/utils/role-utils';

/**
 * Repository for column configuration data access
 */
export class ColumnConfigRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Fetch all column configurations
   */
  async findAll(): Promise<ColumnConfig[]> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from('column_config')
        .select('*')
        .order('display_order', { ascending: true })
        .order('column_name', { ascending: true });

      if (error || !data) {
        console.error('Misslyckades att hämta kolumnkonfigurationer:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error(
        'Oväntat fel vid hämtning av kolumnkonfigurationer:',
        error
      );
      return [];
    }
  }

  /**
   * Fetch specific column configuration by ID
   */
  async findById(id: string): Promise<ColumnConfig | null> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data, error } = await supabase
        .from('column_config')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        if (error?.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error(
          'Misslyckades att hämta kolumnkonfiguration by id:',
          id,
          error
        );
        return null;
      }

      return data;
    } catch (error) {
      console.error(
        'Oväntat fel vid hämtning av kolumnkonfiguration by id:',
        id,
        error
      );
      return null;
    }
  }

  /**
   * Fetch columns visible to a specific role
   * Filters by role_permissions[role].view = true
   *
   * Note: internal HR roles inherit view permissions from hr_admin
   */
  async findByRole(role: UserRole): Promise<ColumnConfig[]> {
    try {
      // Fetch all columns and filter on client side
      // (JSONB filtering in PostgreSQL is complex; simpler to filter in code)
      const allColumns = await this.findAll();

      // Internal HR roles share HR Superuser column visibility.
      const roleForView = getColumnViewRole(role);
      return allColumns.filter(
        (column) => column.role_permissions[roleForView]?.view === true
      );
    } catch (error) {
      console.error(
        'Oväntat fel vid hämtning av kolumnkonfigurationer by role:',
        role,
        error
      );
      return [];
    }
  }

  /**
   * Create a new custom column
   * HR Admin-only privileged schema operation. External parties can edit values
   * in columns assigned later through Column Settings, but cannot create schema.
   *
   * Automatically creates the actual database column in the employees table
   */
  async createCustomColumn(input: {
    column_name: string; // Display name
    db_column_name: string; // Database column name
    column_type: 'text' | 'number' | 'date' | 'boolean';
    is_masterdata: boolean; // Whether this is a masterdata column
    role: UserRole;
    category?: string;
    category_color?: string | null;
    is_checklist_item?: boolean; // Story 19.5: Mark boolean column as checklist item
  }): Promise<ColumnConfig> {
    if (input.role !== UserRole.HR_ADMIN) {
      throw new Error('Endast HR Admin kan skapa nya kolumner');
    }

    // Check for duplicate db_column_name
    const allColumns = await this.findAll();
    const duplicate = allColumns.find(
      (col) =>
        col.db_column_name.toLowerCase() === input.db_column_name.toLowerCase()
    );

    if (duplicate) {
      throw new Error(
        `Column with database name "${input.db_column_name}" already exists`
      );
    }

    // Create default role permissions
    // Only the creating role gets permissions by default
    // HR Admin can add themselves later via column settings if needed
    const rolePermissions: Record<string, { view: boolean; edit: boolean }> = {
      hr_admin: { view: false, edit: false },
      recruiter: { view: false, edit: false },
      admin_limited: { view: false, edit: false },
      omc: { view: false, edit: false },
      payroll: { view: false, edit: false },
      sodexo: { view: false, edit: false },
      toplux: { view: false, edit: false },
      crewing: { view: false, edit: false },
    };

    // Give the creating role full access
    rolePermissions[input.role] = { view: true, edit: true };

    // Story 19.5: checklist items are boolean masterdata columns only.
    const canBeChecklistItem =
      input.column_type === 'boolean' && input.is_masterdata;
    // One service-role-only database function performs the definitive physical
    // collision check, metadata INSERT, ALTER TABLE, and index creation in a
    // single transaction. This prevents both system-column relabelling and
    // orphan DDL if metadata validation fails.
    const privilegedClient = createServiceRoleClient();
    const { data, error } = await privilegedClient.rpc(
      'create_employee_column_config',
      {
        p_column_name: input.column_name,
        p_db_column_name: input.db_column_name,
        p_column_type: input.column_type,
        p_is_masterdata: input.is_masterdata,
        p_category: input.category || null,
        p_category_color: input.category_color || null,
        p_role_permissions: rolePermissions,
        p_is_checklist_item: canBeChecklistItem
          ? (input.is_checklist_item ?? false)
          : false,
      }
    );

    if (error) {
      console.error(
        'Misslyckades att skapa kolumn och kolumnkonfiguration:',
        error
      );
      throw new Error(
        `Misslyckades att skapa kolumn och kolumnkonfiguration: ${error.message}`
      );
    }

    if (!data) {
      throw new Error('Misslyckades att skapa kolumn: Ingen data returnerad');
    }

    return data as ColumnConfig;
  }

  /**
   * Update a column configuration
   * Validates user has permission to edit the column based on role_permissions
   *
   * @param id - Column ID to update
   * @param userId - User ID attempting the update
   * @param userRole - Role of the user attempting the update
   * @param updates - Partial column updates (column_name, category, category_color, etc.)
   * @returns Updated column configuration
   * @throws Error if user lacks permission or column not found
   */
  async updateColumn(
    id: string,
    userId: string,
    userRole: UserRole,
    updates: Partial<
      Pick<ColumnConfig, 'column_name' | 'category' | 'category_color'>
    >
  ): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();
    void userId;
    void userRole;

    const safeUpdates: Partial<
      Pick<ColumnConfig, 'column_name' | 'category' | 'category_color'>
    > = {};
    if (updates.column_name !== undefined) {
      safeUpdates.column_name = updates.column_name;
    }
    if (updates.category !== undefined) {
      safeUpdates.category = updates.category;
    }
    if (updates.category_color !== undefined) {
      safeUpdates.category_color = updates.category_color;
    }

    const { data, error } = await supabase.rpc(
      'update_assigned_column_presentation',
      {
        p_column_id: id,
        p_updates: safeUpdates,
      }
    );

    if (error) {
      console.error('Misslyckades att uppdatera kolumn:', error);
      if (error.code === '42501') {
        throw new Error('permission denied to update this column');
      }
      if (error.code === 'P0002') {
        throw new Error('Column not found');
      }
      throw new Error(`Misslyckades att uppdatera kolumn: ${error.message}`);
    }

    if (!data) {
      throw new Error(
        'Misslyckades att uppdatera kolumn: Ingen data returnerad'
      );
    }

    return data;
  }

  /**
   * Delete a custom column
   * Only allows deleting custom columns (is_masterdata = false)
   * For external users: Only allows deleting columns they have edit permission for (ownership check)
   * For HR Admin: Can delete any custom column
   */
  async deleteColumn(
    id: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Verify column exists and is not masterdata
    const column = await this.findById(id);

    if (!column) {
      throw new Error('Kolumn hittades inte');
    }

    if (column.is_masterdata) {
      throw new Error('Kan inte ta bort masterdata kolumn');
    }

    // For external users, check ownership (must have edit permission)
    if (userRole !== 'hr_admin') {
      const rolePerms = column.role_permissions[userRole];
      if (!rolePerms || !rolePerms.edit) {
        throw new Error('Du saknar behörighet att ta bort denna kolumn');
      }
    }

    const { error } = await supabase
      .from('column_config')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Misslyckades att ta bort kolumn:', error);
      throw new Error(`Misslyckades att ta bort kolumn: ${error.message}`);
    }
  }

  /**
   * Update display order for multiple columns
   * Used for drag-and-drop reordering
   */
  async updateDisplayOrder(
    columns: Array<{ id: string; display_order: number }>
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Update each column's display_order
    const updatePromises = columns.map(({ id, display_order }) =>
      supabase.from('column_config').update({ display_order }).eq('id', id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Misslyckades att uppdatera visningsordning:', errors);
      throw new Error('Misslyckades att uppdatera kolumnvisningsordning');
    }
  }

  /**
   * Toggle column visibility
   */
  async toggleVisibility(
    id: string,
    isVisible: boolean
  ): Promise<ColumnConfig> {
    const supabase = await this.getSupabaseClient();

    // If setting column as inactive, clear all permissions
    const updateData: {
      is_visible: boolean;
      role_permissions?: Record<string, { view: boolean; edit: boolean }>;
    } = {
      is_visible: isVisible,
    };

    if (!isVisible) {
      // When deactivating, set all permissions to false
      updateData.role_permissions = {
        hr_admin: { view: false, edit: false },
        recruiter: { view: false, edit: false },
        admin_limited: { view: false, edit: false },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
        payroll: { view: false, edit: false },
        toplux: { view: false, edit: false },
        crewing: { view: false, edit: false },
      };
    }

    const { data, error } = await supabase
      .from('column_config')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Misslyckades att toggla kolumnvisning:', error);
      throw new Error(
        `Misslyckades att toggla kolumnvisning: ${error.message}`
      );
    }

    if (!data) {
      throw new Error(
        'Misslyckades att toggla kolumnvisning: Ingen data returnerad'
      );
    }

    return data;
  }
}

export const columnConfigRepository = new ColumnConfigRepository();
