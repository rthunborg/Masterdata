"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "@/lib/i18n";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { employeeService } from "@/lib/services/employee-service";
import { toast } from "sonner";
import { toastError } from "@/lib/utils/toast-helpers";
import type { Employee } from "@/lib/types/employee";
import { createClient } from "@/lib/supabase/client";

const terminateSchema = z.object({
  termination_date: z.string().min(1, "Termination date is required"),
  termination_reason: z.string().min(1, "Termination reason is required"),
});

type TerminateFormData = z.infer<typeof terminateSchema>;

interface TerminateEmployeeModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TerminateEmployeeModal({
  employee,
  open,
  onOpenChange,
  onSuccess,
}: TerminateEmployeeModalProps) {
  const t = useTranslations('modals');
  const tCommon = useTranslations('common');
  
  // Story 8.13 & 8.14: Track date information for preview
  const [stenaDateInfo, setStenaDateInfo] = useState<{ description: string; value: string; remainingSpots: number } | null>(null);
  const [omcDateInfo, setOmcDateInfo] = useState<{ description: string; value: string; remainingSpots: number } | null>(null);
  const [pe3DateInfo, setPe3DateInfo] = useState<{ description: string; value: string; remainingSpots: number } | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TerminateFormData>({
    resolver: zodResolver(terminateSchema),
  });
  
  // Story 8.13 & 8.14: Fetch date information when employee changes
  useEffect(() => {
    async function fetchDateInfo() {
      if (!employee) {
        setStenaDateInfo(null);
        setOmcDateInfo(null);
        setPe3DateInfo(null);
        return;
      }
      
      // Helper to fetch date via API
      async function fetchDateById(dateId: string) {
        try {
          const response = await fetch(
            `/api/important-dates?id=${encodeURIComponent(dateId)}`,
            { credentials: "include" }
          );
          
          if (response.ok) {
            const result = await response.json();
            return result.data?.[0];
          }
        } catch (error) {
          console.error("Misslyckades att hämta datuminfo:", error);
        }
        return null;
      }
      
      // Fetch Stena date info if assigned
      if (employee.stena_date) {
        const stenaDate = await fetchDateById(employee.stena_date);
        if (stenaDate) {
          setStenaDateInfo({
            description: stenaDate.date_description,
            value: stenaDate.date_value,
            remainingSpots: stenaDate.remaining_spots,
          });
        }
      } else {
        setStenaDateInfo(null);
      }
      
      // Fetch ÖMC date info if assigned
      if (employee.omc_date) {
        const omcDate = await fetchDateById(employee.omc_date);
        if (omcDate) {
          setOmcDateInfo({
            description: omcDate.date_description,
            value: omcDate.date_value,
            remainingSpots: omcDate.remaining_spots,
          });
        }
      } else {
        setOmcDateInfo(null);
      }
      
      // Fetch PE3 date info if assigned
      if (employee.pe3_date) {
        const pe3Date = await fetchDateById(employee.pe3_date);
        if (pe3Date) {
          setPe3DateInfo({
            description: pe3Date.date_description,
            value: pe3Date.date_value,
            remainingSpots: pe3Date.remaining_spots,
          });
        }
      } else {
        setPe3DateInfo(null);
      }
    }
    
    fetchDateInfo();
  }, [employee]);

  const onSubmit = async (data: TerminateFormData) => {
    if (!employee) return;

    try {
      // Story 8.14 AC 6: Capture termination summary for toast display
      const result = await employeeService.terminate(
        employee.id,
        data.termination_date,
        data.termination_reason
      );

      // Display success message with cleared dates count
      if (result.releasedSpots > 0) {
        toast.success(
          t('terminateEmployee.employeeTerminatedWithDates', {
            name: `${employee.first_name} ${employee.surname}`,
            count: result.clearedDates.length,
            spots: result.releasedSpots,
          }),
          { duration: 8000 }
        );
      } else {
        toast.success(
          t('terminateEmployee.employeeTerminated', {
            name: `${employee.first_name} ${employee.surname}`,
          })
        );
      }

      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: unknown) {
      toastError(error, t('terminateEmployee.terminateFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('terminateEmployee.title')}</DialogTitle>
          <DialogDescription>
            {t('terminateEmployee.description')}
          </DialogDescription>
        </DialogHeader>

        {employee && (
          <>
            <div className="my-4 rounded-lg border p-4">
              <h4 className="font-medium mb-2">{t('terminateEmployee.employeeDetails')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('terminateEmployee.name')}</span>
                  <span className="ml-2">
                    {employee.first_name} {employee.surname}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('terminateEmployee.ssn')}</span>
                  <span className="ml-2">{employee.ssn}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('terminateEmployee.rank')}</span>
                  <span className="ml-2">{employee.rank || t('terminateEmployee.notAvailable')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('terminateEmployee.gender')}</span>
                  <span className="ml-2">{employee.gender || t('terminateEmployee.notAvailable')}</span>
                </div>
              </div>
            </div>
            
            {/* Story 8.14: Date Clearing Preview */}
            {(stenaDateInfo || omcDateInfo || pe3DateInfo) && (
              <div className="my-4 rounded-lg border border-blue-300 bg-blue-50 p-4">
                <h4 className="font-medium mb-2 text-blue-900">
                  {t('terminateEmployee.dateClearingPreviewTitle')}
                </h4>
                <p className="text-sm text-blue-800 mb-2">
                  {t('terminateEmployee.dateClearingPreviewDescription')}
                </p>
                <ul className="text-sm space-y-2 text-blue-900">
                  {stenaDateInfo && (
                    <li>
                      <span className="font-medium">{t('terminateEmployee.stenaDate')}</span>{' '}
                      {stenaDateInfo.description}
                      <span className="text-green-600 ml-2">
                        ({stenaDateInfo.remainingSpots} → {stenaDateInfo.remainingSpots + 1} {t('terminateEmployee.spots')})
                      </span>
                    </li>
                  )}
                  {omcDateInfo && (
                    <li>
                      <span className="font-medium">{t('terminateEmployee.omcDate')}</span>{' '}
                      {omcDateInfo.description}
                      <span className="text-green-600 ml-2">
                        ({omcDateInfo.remainingSpots} → {omcDateInfo.remainingSpots + 1} {t('terminateEmployee.spots')})
                      </span>
                    </li>
                  )}
                  {pe3DateInfo && (
                    <li>
                      <span className="font-medium">{t('terminateEmployee.pe3Date')}</span>{' '}
                      {pe3DateInfo.description}
                      <span className="text-green-600 ml-2">
                        ({pe3DateInfo.remainingSpots} → {pe3DateInfo.remainingSpots + 1} {t('terminateEmployee.spots')})
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            {/* Story 8.13: Repayment Preview */}
            {(omcDateInfo || pe3DateInfo) && (
              <div className="my-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
                <h4 className="font-medium mb-2 text-yellow-900">
                  {t('terminateEmployee.repaymentPreviewTitle')}
                </h4>
                <p className="text-sm text-yellow-800 mb-2">
                  {t('terminateEmployee.repaymentPreviewDescription')}
                </p>
                <ul className="text-sm space-y-1 text-yellow-900">
                  {omcDateInfo && (
                    <li>
                      <span className="font-medium">{t('terminateEmployee.omcDate')}</span>{' '}
                      {omcDateInfo.description} ({omcDateInfo.value})
                    </li>
                  )}
                  {pe3DateInfo && (
                    <li>
                      <span className="font-medium">{t('terminateEmployee.pe3Date')}</span>{' '}
                      {pe3DateInfo.description} ({pe3DateInfo.value})
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            {!stenaDateInfo && !omcDateInfo && !pe3DateInfo && (
              <div className="my-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm text-gray-600">
                  {t('terminateEmployee.noDateAssignments')}
                </p>
              </div>
            )}
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="termination_date">{t('terminateEmployee.terminationDateLabel')} *</Label>
            <Input
              id="termination_date"
              type="date"
              {...register("termination_date")}
            />
            {errors.termination_date && (
              <p className="text-sm text-destructive mt-1">
                {errors.termination_date.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="termination_reason">{t('terminateEmployee.terminationReasonLabel')} *</Label>
            <Textarea
              id="termination_reason"
              placeholder={t('terminateEmployee.terminationReasonPlaceholder')}
              rows={4}
              {...register("termination_reason")}
            />
            {errors.termination_reason && (
              <p className="text-sm text-destructive mt-1">
                {errors.termination_reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {t('terminateEmployee.confirmButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
