"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "@/lib/i18n";
import { columnService } from "@/lib/services/column-service";
import { ColumnConfig } from "@/lib/types/column-config";
import { ColumnSettingsTable } from "@/components/admin/column-settings-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUIStore } from "@/lib/store/ui-store";
import { AddColumnModal } from "@/components/dashboard/add-column-modal";
import { Plus } from "lucide-react";

type FilterMode = "all" | "masterdata" | "custom";

export default function ColumnSettingsPage() {
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const { openModal } = useUIStore();
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [filteredColumns, setFilteredColumns] = useState<ColumnConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const loadColumns = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await columnService.getAllColumns();
      // Sort by display_order to ensure correct order after reordering
      const sortedData = [...data].sort((a, b) => a.display_order - b.display_order);
      setColumns(sortedData);
      setFilteredColumns(sortedData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tErrors('loadFailed')
      );
    } finally {
      setIsLoading(false);
    }
  }, [tErrors]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  // Apply filter when filter mode changes
  useEffect(() => {
    let filtered: ColumnConfig[];
    if (filterMode === "masterdata") {
      filtered = columns.filter((col) => col.is_masterdata);
    } else if (filterMode === "custom") {
      filtered = columns.filter((col) => !col.is_masterdata);
    } else {
      filtered = columns;
    }
    // Ensure filtered results maintain display_order
    const sortedFiltered = [...filtered].sort((a, b) => a.display_order - b.display_order);
    setFilteredColumns(sortedFiltered);
  }, [filterMode, columns]);

  const handlePermissionsUpdated = () => {
    loadColumns();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('columnSettings')}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('configureRolesDescription')}
          </p>
        </div>
        <Button onClick={() => openModal("addColumn")}>
          <Plus className="h-4 w-4 mr-2" />
          {t('createNewColumn')}
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="flex gap-2">
        <Button
          variant={filterMode === "all" ? "default" : "outline"}
          onClick={() => setFilterMode("all")}
          size="sm"
        >
          {t('allColumns')}
        </Button>
        <Button
          variant={filterMode === "masterdata" ? "default" : "outline"}
          onClick={() => setFilterMode("masterdata")}
          size="sm"
        >
          {t('masterdataOnly')}
        </Button>
        <Button
          variant={filterMode === "custom" ? "default" : "outline"}
          onClick={() => setFilterMode("custom")}
          size="sm"
        >
          {t('customOnly')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <ColumnSettingsTable
          columns={filteredColumns}
          allColumns={columns}
          onPermissionsUpdated={handlePermissionsUpdated}
        />
      )}
      
      <AddColumnModal />
    </div>
  );
}
