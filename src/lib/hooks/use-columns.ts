import { useState, useEffect, useCallback } from "react";
import { columnConfigService } from "@/lib/services/column-config-service";
import { useAuth } from "@/lib/hooks/use-auth";
import type { ColumnConfig } from "@/lib/types/column-config";

/**
 * Custom hook to fetch and filter column configurations based on user role
 * Returns only columns where role_permissions[userRole].view = true
 */
export function useColumns() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchColumns = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const allColumns = await columnConfigService.getAll();

      // Filter columns by role permissions
      const visibleColumns = allColumns.filter((column) => {
        const rolePerms = column.role_permissions[user.role];
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
  }, [user]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  // Expose refetch function for triggering manual updates
  const refetch = useCallback(() => {
    fetchColumns();
  }, [fetchColumns]);

  return { columns, isLoading, error, refetch };
}
