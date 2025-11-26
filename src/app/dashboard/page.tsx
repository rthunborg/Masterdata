"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useTranslations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ResponsiveEmployeeView } from "@/components/dashboard/responsive-employee-view";
import { ManageColumnsDialog } from "@/components/dashboard/manage-columns-dropdown";
import { RoleSelector } from "@/components/dashboard/role-selector";
import { RolePreviewBanner } from "@/components/dashboard/role-preview-banner";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { CacheExpirationWarning } from "@/components/dashboard/cache-expiration-warning";
import { useOfflineSync } from "@/lib/hooks/use-offline-sync";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Employee } from "@/lib/types/employee";
import type { ConflictResolution } from "@/lib/services/offline-sync";
import { Plus, Upload, Columns } from "lucide-react";
import { useUIStore } from "@/lib/store/ui-store";
import dynamic from "next/dynamic";
import { FloatingActionButton } from "@/components/dashboard/floating-action-button";
import { useMediaQuery } from "@/hooks/use-media-query";

// Lazy load heavy modals for better initial bundle size (Story 12.5: Performance optimization)
const AddEmployeeModal = dynamic(
  () => import("@/components/dashboard/add-employee-modal").then((mod) => ({ default: mod.AddEmployeeModal })),
  { ssr: false }
);
const AddColumnModal = dynamic(
  () => import("@/components/dashboard/add-column-modal").then((mod) => ({ default: mod.AddColumnModal })),
  { ssr: false }
);
const EditColumnModal = dynamic(
  () => import("@/components/dashboard/edit-column-modal").then((mod) => ({ default: mod.EditColumnModal })),
  { ssr: false }
);
const ImportEmployeesModal = dynamic(
  () => import("@/components/dashboard/import-employees-modal").then((mod) => ({ default: mod.ImportEmployeesModal })),
  { ssr: false }
);
const ConflictResolutionDialog = dynamic(
  () => import("@/components/dashboard/conflict-resolution-dialog").then((mod) => ({ default: mod.ConflictResolutionDialog })),
  { ssr: false }
);

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { openModal, isPreviewMode } = useUIStore();
  const t = useTranslations('dashboard');
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tTooltips = useTranslations('tooltips');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Initialize filter state from session storage
  const [includeArchived, setIncludeArchived] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('employeeFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.includeArchived ?? false;
      }
    }
    return false;
  });

  const [includeTerminated, setIncludeTerminated] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('employeeFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.includeTerminated ?? false;
      }
    }
    return false;
  });

  // Story 8.13 AC 9: Add needsRepayment filter
  const [needsRepayment, setNeedsRepayment] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('employeeFilters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.needsRepayment ?? false;
      }
    }
    return false;
  });

  const [globalFilter, setGlobalFilter] = useState("");

  // Story 12.3: Conflict resolution state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    mutationId: string;
    employeeId: string;
    localData: Partial<Employee>;
    serverData: Employee;
    employee: Employee | null;
    resolvePromise: ((resolution: ConflictResolution) => void) | null;
  } | null>(null);

  // Handle conflict resolution from dialog
  const handleConflictResolve = useCallback((action: "keep-local" | "keep-server" | "merge") => {
    if (conflictData?.resolvePromise) {
      conflictData.resolvePromise({
        mutationId: conflictData.mutationId,
        action,
      });
      setConflictDialogOpen(false);
      setConflictData(null);
    }
  }, [conflictData]);

  // Story 13.1: Filter handlers with mutually exclusive behavior
  // When one filter is checked, uncheck the others
  const onIncludeArchivedChange = useCallback((checked: boolean) => {
    if (checked) {
      // Activating archived filter: deactivate others
      setIncludeArchived(true);
      setIncludeTerminated(false);
      setNeedsRepayment(false);
    } else {
      // Deactivating: just set this one to false
      setIncludeArchived(false);
    }
  }, []);

  const onIncludeTerminatedChange = useCallback((checked: boolean) => {
    if (checked) {
      // Activating terminated filter: deactivate others
      setIncludeTerminated(true);
      setIncludeArchived(false);
      setNeedsRepayment(false);
    } else {
      // Deactivating: just set this one to false
      setIncludeTerminated(false);
    }
  }, []);

  const onNeedsRepaymentChange = useCallback((checked: boolean) => {
    if (checked) {
      // Activating repayment filter: deactivate others
      setNeedsRepayment(true);
      setIncludeArchived(false);
      setIncludeTerminated(false);
    } else {
      // Deactivating: just set this one to false
      setNeedsRepayment(false);
    }
  }, []);

  // Save filter state to session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('employeeFilters', JSON.stringify({
        includeArchived,
        includeTerminated,
        needsRepayment, // Story 8.13 AC 9
      }));
    }
  }, [includeArchived, includeTerminated, needsRepayment]);

  // Memoize filters object to prevent infinite re-renders
  // This ensures the filters object reference only changes when filter values actually change
  const filters = useMemo(() => ({
    includeArchived,
    includeTerminated,
    needsRepayment, // Story 8.13 AC 9
  }), [includeArchived, includeTerminated, needsRepayment]);

  // Use the new real-time enabled hook with notifications
  const { 
    employees, 
    isLoading: isLoadingEmployees, 
    error, 
    refetch,
    updatedEmployeeId
  } = useEmployees({
    filters, // Use memoized filters object
    enableRealtime: true,
    userRole: user?.role,
    enableNotifications: user?.role !== "hr_admin", // Only enable for external parties
    globalFilter,
  });

  // Conflict resolver function for offline sync (must be after useEmployees to access employees)
  const handleConflict = useCallback(async (conflict: {
    mutationId: string;
    employeeId: string;
    localData: Partial<Employee>;
    serverData: Employee;
  }): Promise<ConflictResolution> => {
    // Find the employee in the current list for display
    const employee = employees.find((emp) => emp.id === conflict.employeeId) || null;

    // Show dialog and wait for user resolution
    return new Promise<ConflictResolution>((resolve) => {
      setConflictData({
        ...conflict,
        employee,
        resolvePromise: resolve,
      });
      setConflictDialogOpen(true);
    });
  }, [employees]);

  const handleEmployeeAdded = () => {
    refetch();
  };

  const handleEmployeesImported = () => {
    refetch();
  };

  const handleColumnCreated = () => {
    refetch(); // Refetch employees which will also refetch column configs
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">{tErrors('unauthorized')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Offline Banner - Shows when offline (Story 12.3) */}
      <OfflineBanner />

      {/* Cache Expiration Warning (Story 12.3) */}
      <CacheExpirationWarning />

      {/* Role Preview Banner - Shows at top when in preview mode */}
      <RolePreviewBanner />

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('title')}</h2>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
          {/* Role Selector - Only visible to HR Admin */}
          {user?.role === "hr_admin" && (
            <RoleSelector />
          )}
          {user?.role === "hr_admin" && !isMobile && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => setIsAddModalOpen(true)}
                    disabled={isPreviewMode}
                    className="w-full sm:w-auto min-h-11"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addEmployee')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tTooltips('addEmployee')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => setIsImportModalOpen(true)} 
                    variant="outline"
                    disabled={isPreviewMode}
                    className="w-full sm:w-auto min-h-11"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('importEmployees')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tTooltips('importCsv')}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {user?.role !== "hr_admin" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => openModal("addColumn")} variant="outline" className="w-full sm:w-auto">
                    <Columns className="h-4 w-4 mr-2" />
                    {tCommon('add')} {tCommon('filter')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tTooltips('addColumn')}</p>
                </TooltipContent>
              </Tooltip>
              <ManageColumnsDialog />
            </>
          )}
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>{tErrors('loadFailed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error.message}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <ResponsiveEmployeeView
              employees={employees}
              isLoading={isLoadingEmployees}
              isHRAdmin={user?.role === "hr_admin"}
              onEmployeeUpdated={refetch}
              includeArchived={includeArchived}
              onIncludeArchivedChange={onIncludeArchivedChange}
              includeTerminated={includeTerminated}
              onIncludeTerminatedChange={onIncludeTerminatedChange}
              needsRepayment={needsRepayment}
              onNeedsRepaymentChange={onNeedsRepaymentChange}
              updatedEmployeeId={updatedEmployeeId}
              onGlobalFilterChange={setGlobalFilter}
            />
          </CardContent>
        </Card>
      )}

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleEmployeeAdded}
      />

      <ImportEmployeesModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={handleEmployeesImported}
      />

      <AddColumnModal onColumnCreated={handleColumnCreated} />

      <EditColumnModal />

      {/* Story 12.3: Conflict Resolution Dialog */}
      {conflictData && (
        <ConflictResolutionDialog
          isOpen={conflictDialogOpen}
          onClose={() => {
            // If user closes without resolving, default to keep-server
            if (conflictData.resolvePromise) {
              conflictData.resolvePromise({
                mutationId: conflictData.mutationId,
                action: "keep-server",
              });
            }
            setConflictDialogOpen(false);
            setConflictData(null);
          }}
          employee={conflictData.employee}
          localData={conflictData.localData}
          serverData={conflictData.serverData}
          onResolve={handleConflictResolve}
        />
      )}

      {/* Story 12.6: AC 4 - Floating Action Button for HR Admins on mobile */}
      {isMobile && user?.role === "hr_admin" && (
        <FloatingActionButton
          onAddEmployee={() => setIsAddModalOpen(true)}
          onImportCSV={() => setIsImportModalOpen(true)}
          onQuickSearch={() => {
            // Focus on search input - handled by ResponsiveEmployeeView
            const searchInput = document.getElementById('employee-search');
            if (searchInput) {
              searchInput.focus();
            }
          }}
        />
      )}
    </div>
  );
}
