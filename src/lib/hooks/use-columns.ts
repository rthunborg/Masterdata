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
      const allColumns = await columnService.getAll();

      // Filter columns by role permissions
      const visibleColumns = allColumns.filter((column) => {
        const rolePerms = column.role_permissions[roleToUse];
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
