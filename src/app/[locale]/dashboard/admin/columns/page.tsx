"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { columnService } from "@/lib/services/column-service";
import { ColumnConfig } from "@/lib/types/column-config";
import { ColumnSettingsTable } from "@/components/admin/column-settings-table";
import { AddColumnModal } from "@/components/admin/add-column-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type FilterMode = "all" | "masterdata" | "custom";

export default function ColumnSettingsPage() {
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const tTooltips = useTranslations('tooltips');
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [filteredColumns, setFilteredColumns] = useState<ColumnConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const loadColumns = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await columnService.getAllColumns();
      setColumns(data);
      setFilteredColumns(data);
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
    if (filterMode === "masterdata") {
      setFilteredColumns(columns.filter((col) => col.is_masterdata));
    } else if (filterMode === "custom") {
      setFilteredColumns(columns.filter((col) => !col.is_masterdata));
    } else {
      setFilteredColumns(columns);
    }
  }, [filterMode, columns]);

  const handlePermissionsUpdated = () => {
    loadColumns();
  };

  const handleAddColumnSuccess = () => {
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
        <Button onClick={() => setAddModalOpen(true)} title={tTooltips('addColumn')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addColumn')}
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
          onPermissionsUpdated={handlePermissionsUpdated}
        />
      )}

      <AddColumnModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddColumnSuccess}
      />
    </div>
  );
}
