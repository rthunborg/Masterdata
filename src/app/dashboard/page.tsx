"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useTranslations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResponsiveEmployeeView } from "@/components/dashboard/responsive-employee-view";
import { ManageColumnsDialog } from "@/components/dashboard/manage-columns-dropdown";
import { RoleSelector } from "@/components/dashboard/role-selector";
import { RolePreviewBanner } from "@/components/dashboard/role-preview-banner";
import { ChangeNotificationBanner } from "@/components/dashboard/change-notification-banner";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Upload } from "lucide-react";
 
import { useUIStore } from "@/lib/store/ui-store";
import dynamic from "next/dynamic";
import { FloatingActionButton } from "@/components/dashboard/floating-action-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEmployeeChanges } from "@/lib/hooks/use-employee-changes";
import { hasAdminAccess, UserRole, isHRAdmin, canAddEmployee, isExternalParty } from "@/lib/types/user";

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

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { openModal, previewRole } = useUIStore();
  const t = useTranslations('dashboard');
  
  // Effective role for UI simulation in preview mode
  const effectiveRole = previewRole || user?.role;
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const tErrors = useTranslations('errors');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Initialize filter state - defaulting to false to match server-side rendering
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeTerminated, setIncludeTerminated] = useState(false);
  const [needsRepayment, setNeedsRepayment] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Load filters from session storage on client mount to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('employeeFilters');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.includeArchived) setIncludeArchived(true);
          if (parsed.includeTerminated) setIncludeTerminated(true);
          if (parsed.needsRepayment) setNeedsRepayment(true);
        }
      } catch (e) {
        console.error("Misslyckades att ladda filter", e);
      } finally {
        setFiltersLoaded(true);
      }
    } else {
      setFiltersLoaded(true);
    }
  }, []);

  const [globalFilter, setGlobalFilter] = useState("");

  const onIncludeArchivedChange = (checked: boolean) => {
    setIncludeArchived(checked);
  };

  const onIncludeTerminatedChange = (checked: boolean) => {
    setIncludeTerminated(checked);
  };

  const onNeedsRepaymentChange = (checked: boolean) => {
    setNeedsRepayment(checked);
  };

  // Listen for global search events from header
  useEffect(() => {
    const handleGlobalSearch = (event: CustomEvent<string>) => {
      setGlobalFilter(event.detail);
    };

    window.addEventListener('global-search', handleGlobalSearch as EventListener);
    
    return () => {
      window.removeEventListener('global-search', handleGlobalSearch as EventListener);
    };
  }, []);

  // Save filter state to session storage
  useEffect(() => {
    if (typeof window !== 'undefined' && filtersLoaded) {
      sessionStorage.setItem('employeeFilters', JSON.stringify({
        includeArchived,
        includeTerminated,
        needsRepayment, // Story 8.13 AC 9
      }));
    }
  }, [includeArchived, includeTerminated, needsRepayment, filtersLoaded]);

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
    updatedEmployeeId,
    updateEmployeeOptimistically
  } = useEmployees({
    filters, // Use memoized filters object
    enableRealtime: true,
    userRole: user?.role,
    enableNotifications: isExternalParty(user?.role as UserRole), // Only enable for external parties
    globalFilter,
  });

  // Story 16.5: Call useEmployeeChanges once at dashboard level to avoid N+2 duplicate API requests
  // Only fetch changes for external users (not HR admin/Recruiter/Admin Limited) - Epic 16 is for external users only
  // Internal roles (HR Admin, Recruiter, Admin Limited) don't see change highlights
  const isInternalRole = user?.role === UserRole.HR_ADMIN || user?.role === UserRole.RECRUITER || user?.role === UserRole.ADMIN_LIMITED;
  const isExternalUser = !isInternalRole;

  const employeeChangesResult = useEmployeeChanges();
  const { 
    isColumnChanged: rawIsColumnChanged, 
    totalCount, 
    changesBaseline, 
    isLoading: isLoadingChanges, 
    error: changesError 
  } = employeeChangesResult;
  
  // For HR admins, provide a no-op isColumnChanged function that always returns false
  // This prevents highlighting from appearing for HR admins
  const isColumnChanged = useMemo(() => {
    if (!isExternalUser) {
      return () => false; // No-op for HR admins
    }
    return rawIsColumnChanged;
  }, [isExternalUser, rawIsColumnChanged]);

  const handleEmployeeAdded = () => {
    refetch();
  };

  const handleQuickSearch = useCallback(() => {
    // Focus the search input in the mobile view
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  if (authLoading || !filtersLoaded) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Check if user has admin access (HR Admin or Recruiter) - actual user role
  const isAdmin = hasAdminAccess(user?.role as UserRole) || user?.role === UserRole.RECRUITER;
  const isHRAdminUser = isHRAdmin(user?.role as UserRole);
  
  // Effective role checks for UI simulation in preview mode
  // When HR Admin previews as Sodexo, these will reflect what Sodexo would see
  const canAddEffective = canAddEmployee(effectiveRole as UserRole);
  const isExternalPartyEffective = isExternalParty(effectiveRole as UserRole);

  return (
    <div className="space-y-6">
      {/* Role Preview Banner - Only for HR Admin */}
      {isHRAdminUser && <RolePreviewBanner />}
      
      {/* Change Notification Banner - Only for External Users (not HR Admin or Recruiter) */}
      {isExternalUser && (
        <ChangeNotificationBanner 
          totalCount={totalCount}
          changesBaseline={changesBaseline}
          isLoading={isLoadingChanges}
          error={changesError}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t('title')}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Selector - Only for HR Admin */}
          <RoleSelector />

          {canAddEffective ? (
            <>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('actions.addEmployee')}
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {t('actions.importEmployees')}
              </Button>
            </>
          ) : isExternalPartyEffective ? (
            <div className="flex gap-2">
              <Button onClick={() => openModal('addColumn')}>
                <Plus className="mr-2 h-4 w-4" />
                {t('actions.addColumn')}
              </Button>
              <ManageColumnsDialog />
            </div>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('employeeList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
              {tErrors('failedToLoadEmployees')}
            </div>
          ) : (
            <ResponsiveEmployeeView
              employees={employees}
              isLoading={isLoadingEmployees}
              isHRAdmin={isHRAdminUser}
              onEmployeeUpdated={refetch}
              onIncludeArchivedChange={onIncludeArchivedChange}
              onIncludeTerminatedChange={onIncludeTerminatedChange}
              onNeedsRepaymentChange={onNeedsRepaymentChange}
              includeArchived={includeArchived}
              includeTerminated={includeTerminated}
              needsRepayment={needsRepayment}
              updatedEmployeeId={updatedEmployeeId}
              onOptimisticUpdate={updateEmployeeOptimistically}
              isColumnChanged={isColumnChanged}
            />
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleEmployeeAdded}
      />
      <ImportEmployeesModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={handleEmployeeAdded}
      />
      
      {/* Dynamic modals controlled by global store */}
      <AddColumnModal />
      <EditColumnModal />
      
      {/* Floating Action Button for Mobile - Only for users who can add employees */}
      {isMobile && canAddEffective && (
        <FloatingActionButton 
          onAddEmployee={() => setIsAddModalOpen(true)}
          onImportCSV={() => setIsImportModalOpen(true)}
          onQuickSearch={handleQuickSearch}
        />
      )}
    </div>
  );
}
