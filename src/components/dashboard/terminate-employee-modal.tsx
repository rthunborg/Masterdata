"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
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
import type { Employee } from "@/lib/types/employee";

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
  const t = useTranslations('modals.terminateEmployee');
  const tCommon = useTranslations('common');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TerminateFormData>({
    resolver: zodResolver(terminateSchema),
  });

  const onSubmit = async (data: TerminateFormData) => {
    if (!employee) return;

    try {
      await employeeService.terminate(
        employee.id,
        data.termination_date,
        data.termination_reason
      );
      toast.success(
        t('employeeTerminated', { name: `${employee.first_name} ${employee.surname}` })
      );
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('terminateFailed');
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {employee && (
          <div className="my-4 rounded-lg border p-4">
            <h4 className="font-medium mb-2">{t('employeeDetails')}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('name')}</span>
                <span className="ml-2">
                  {employee.first_name} {employee.surname}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('ssn')}</span>
                <span className="ml-2">{employee.ssn}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('rank')}</span>
                <span className="ml-2">{employee.rank || t('notAvailable')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('gender')}</span>
                <span className="ml-2">{employee.gender || t('notAvailable')}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="termination_date">{t('terminationDateLabel')} *</Label>
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
            <Label htmlFor="termination_reason">{t('terminationReasonLabel')} *</Label>
            <Textarea
              id="termination_reason"
              placeholder={t('terminationReasonPlaceholder')}
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
              {t('confirmButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
