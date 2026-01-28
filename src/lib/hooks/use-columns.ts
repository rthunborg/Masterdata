import { useState, useEffect, useCallback } from "react";
import { columnService } from "@/lib/services/column-service";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRealtime } from "@/lib/hooks/use-realtime";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { UserRole } from "@/lib/types/user";

/**
 * Custom hook to fetch and filter column configurations based on user role
 * Returns only columns where role_permissions[userRole].view = true
 * 
 * Note: admin_limited role inherits view permissions from hr_admin
 * (they see the same columns but have restricted edit access via canEditField)
 * 
 * @param effectiveRole - Optional role to use for filtering (for preview mode)
 */
export function useColumns(effectiveRole?: UserRole) {
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use effectiveRole if provided, otherwise use user's actual role
  const roleToUse = effectiveRole || user?.role;

  const fetchColumns = useCallback(async () => {
    if (!roleToUse) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Pass the role to the API for server-side filtering
      // This is essential for preview mode where HR Admin needs to see
      // columns configured for other roles (not just their own)
      const allColumns = await columnService.getAll(roleToUse);

      // The API already filters by role, but we keep this client-side filter
      // as a safety measure and for admin_limited -> hr_admin inheritance
      const roleForView = roleToUse === 'admin_limited' ? 'hr_admin' : roleToUse;
      const visibleColumns = allColumns.filter((column) => {
        const rolePerms = column.role_permissions[roleForView];
        return rolePerms && rolePerms.view === true;
      });

      setColumns(visibleColumns);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch columns")
      );
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  }, [roleToUse]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  // Subscribe to real-time column_config changes for automatic updates
  useRealtime({
    table: "column_config",
    schema: "public",
    event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
    enabled: !!roleToUse,
    onEvent: () => {
      // Refetch columns when any change occurs to column_config
      fetchColumns();
    },
  });

  // Expose refetch function for triggering manual updates
  const refetch = useCallback(() => {
    fetchColumns();
  }, [fetchColumns]);

  return { columns, isLoading, error, refetch };
}
