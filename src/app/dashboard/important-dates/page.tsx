"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useTranslations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportantDatesTable } from "@/components/dashboard/important-dates-table";
import { ImportantDateCardList } from "@/components/dashboard/important-date-card-list";
import { useMediaQuery } from "@/hooks/use-media-query";
import { importantDateService } from "@/lib/services/important-date-service";
import { exportImportantDates } from "@/lib/services/export-service";
import { useEffect, useState, useCallback } from "react";
import type { ImportantDate } from "@/lib/types/important-date";
import { Plus, ArrowLeft, Upload, Download, FileDown } from "lucide-react";
import { Link } from "@/lib/navigation";
import dynamic from "next/dynamic";

// Lazy load heavy modals for better initial bundle size (Story 12.5: Performance optimization)
const AddImportantDateModal = dynamic(
  () => import("@/components/dashboard/add-important-date-modal").then((mod) => ({ default: mod.AddImportantDateModal })),
  { ssr: false }
);
const ImportImportantDatesModal = dynamic(
  () => import("@/components/dashboard/import-important-dates-modal").then((mod) => ({ default: mod.ImportImportantDatesModal })),
  { ssr: false }
);
const CategoryExportModal = dynamic(
  () => import("@/components/dashboard/category-export-modal").then((mod) => ({ default: mod.CategoryExportModal })),
  { ssr: false }
);

export default function ImportantDatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const t = useTranslations('dates');
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');
  const tNavigation = useTranslations('navigation');
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCategoryExportModalOpen, setIsCategoryExportModalOpen] = useState(false);

  const fetchDates = useCallback(async () => {
    try {
      setIsLoadingDates(true);
      setError(null);
      const data = await importantDateService.getAll();
      setDates(data);
      } catch (err) {
        console.error("Failed to fetch important dates:", err);
      setError(
        err instanceof Error ? err.message : t('noDates')
      );
    } finally {
      setIsLoadingDates(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      fetchDates();
    }
  }, [user, fetchDates]);

  const handleDateAdded = () => {
    fetchDates();
  };

  const handleDateUpdated = () => {
    fetchDates();
  };

  const handleDateDeleted = () => {
    fetchDates();
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(user.role === 'hr_admin' || user.role === 'recruiter') && (
            <>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addDate')}
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {t('importDates')}
              </Button>
              <Button variant="outline" onClick={() => setIsCategoryExportModalOpen(true)}>
                <FileDown className="mr-2 h-4 w-4" />
                {t('exportByCategory')}
              </Button>
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
            <p className="text-red-600">{error}</p>
            <Button
              onClick={() => fetchDates()}
              variant="outline"
              className="mt-4"
            >
              {tCommon('retry')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            {isMobile ? (
              <ImportantDateCardList
                dates={dates}
                isLoading={isLoadingDates}
                isHRAdmin={user.role === 'hr_admin' || user.role === 'recruiter'}
                onDateDeleted={handleDateDeleted}
              />
            ) : (
              <ImportantDatesTable
                dates={dates}
                isLoading={isLoadingDates}
                userRole={user.role}
                onDateUpdated={handleDateUpdated}
                onDateDeleted={handleDateDeleted}
              />
            )}
          </CardContent>
        </Card>
      )}

      <AddImportantDateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleDateAdded}
      />

      <ImportImportantDatesModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={fetchDates}
      />

      <CategoryExportModal
        isOpen={isCategoryExportModalOpen}
        onClose={() => setIsCategoryExportModalOpen(false)}
      />
    </div>
  );
}
