"use client";

import { useAuth } from "@/lib/hooks/use-auth";
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
import { importantDateService } from "@/lib/services/important-date-service";
import { useEffect, useState } from "react";
import type { ImportantDate } from "@/lib/types/important-date";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImportantDatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchDates = async () => {
    try {
      setIsLoadingDates(true);
      setError(null);
      const data = await importantDateService.getAll();
      setDates(data);
    } catch (err) {
      console.error("Failed to fetch important dates:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load important dates"
      );
    } finally {
      setIsLoadingDates(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDates();
    }
  }, [user]);

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
        <p className="text-gray-600">Not authenticated</p>
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
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Important Dates</h2>
            <p className="mt-2 text-gray-600">
              Reference calendar of important operational dates for Stena and ÖMC
            </p>
          </div>
          {user?.role === "hr_admin" && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Date
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Important Dates</CardTitle>
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
            <CardTitle>All Important Dates</CardTitle>
            <CardDescription>
              Important operational dates organized by week number and category
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
    </div>
  );
}
