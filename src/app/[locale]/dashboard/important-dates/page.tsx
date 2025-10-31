"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportantDatesTable } from "@/components/dashboard/important-dates-table";
import { AddImportantDateModal } from "@/components/dashboard/add-important-date-modal";
import { ImportImportantDatesModal } from "@/components/dashboard/import-important-dates-modal";
import { importantDateService } from "@/lib/services/important-date-service";
import { useEffect, useState, useCallback } from "react";
import type { ImportantDate } from "@/lib/types/important-date";
import { Plus, ArrowLeft, Upload } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function ImportantDatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const t = useTranslations('dates');
  const tErrors = useTranslations('errors');
  const tNavigation = useTranslations('navigation');
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tNavigation('dashboard')}
            </Button>
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{t('importantDates')}</h2>
            <p className="mt-2 text-gray-600">
              {t('pageDescription')}
            </p>
          </div>
          {user?.role === "hr_admin" && (
            <div className="flex gap-2">
              <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Dates
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addDate')}
              </Button>
            </div>
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
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('importantDates')}</CardTitle>
            <CardDescription>
              {t('pageSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportantDatesTable
              dates={dates}
              isLoading={isLoadingDates}
              userRole={user.role}
              onDateUpdated={handleDateUpdated}
              onDateDeleted={handleDateDeleted}
            />
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
    </div>
  );
}
