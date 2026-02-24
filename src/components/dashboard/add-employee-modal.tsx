/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/i18n";
import { toast } from "sonner";
import { useAriaAnnouncements } from "@/hooks/use-aria-announcements";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  createEmployeeSchemaWithMessages,
  type CreateEmployeeInput,
} from "@/lib/validation/employee-schema";
import { employeeService } from "@/lib/services/employee-service";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { useAvailablePE3Dates } from "@/lib/hooks/use-available-pe3-dates";
import { useAvailableOMCDates } from "@/lib/hooks/use-available-omc-dates";
import { UnsavedChangesDialog } from "@/components/dashboard/unsaved-changes-dialog";
import {
  PersonalInfoFields,
  DateFields,
  DietAndCommentsFields,
} from "@/components/dashboard/employee-form";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
}: AddEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const tErrors = useTranslations('errors');

  // Fetch Important Dates with real-time updates
  const { dates: stenaDates, isLoading: stenaLoading } =
    useImportantDates('Stena Dates');
  // Story 19.8: Use available ÖMC dates hook with Jan 1 exception support
  const { availableDates: omcDates, isLoading: omcLoading } =
    useAvailableOMCDates();
  const { availableDates: pe3Dates, totalAvailable: pe3Available, isLoading: pe3Loading } =
    useAvailablePE3Dates();

  // Create schema with translated error messages
  const createEmployeeSchema = createEmployeeSchemaWithMessages(
    (key: string) => {
      // Remove 'errors.' prefix to match translation key structure
      const translationKey = key.replace('errors.', '');
      return tErrors(translationKey as 'validation.firstNameRequired');
    }
  );

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema) as any,
    defaultValues: {
      first_name: "",
      surname: "",
      ssn: "",
      email: null,
      mobile: null,
      rank: "SEV",
      gender: undefined, // Required field - no default value
      town_district: null,
      hotel_required: false,
      hire_date: new Date().toISOString().split("T")[0], // Default to current date, but user can change it
      stena_date: "",
      omc_date: "",
      pe3_date: null,
      comments: null,
      special_diet: false,
      diet_details: null,
      // All boolean fields default to false
      one: false,
      talmundo: false,
      isps: false,
      photo: false,
      origo: false,
      mail_lon: false,
      bankuppgifter: false,
      li: false,
      passport: false,
      kvitto_c17_18: false,
      c17: false,
      crewing_done: false,
      is_terminated: false,
      is_archived: false,
      termination_date: null,
      termination_reason: null,
      loneiva: null,
      room_number_shared: null,
      one_marked_at: null,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      omc_masterdata_reminder_sent_at: null,
    },
  });

  // Extract isDirty and errors from formState for unsaved changes tracking and accessibility
  const { isDirty, errors } = form.formState;
  
  // Hook for screen reader announcements of validation errors
  const announcementRef = useAriaAnnouncements(errors);

  const onSubmit = async (data: CreateEmployeeInput) => {
    try {
      setIsSubmitting(true);
      
      // Normalize email field: convert undefined to null
      // Gender is now required, so no normalization needed
      const normalizedData = {
        ...data,
        email: data.email ?? null,
        repayment_needed_omc: data.repayment_needed_omc ?? null,
        repayment_needed_pe3: data.repayment_needed_pe3 ?? null,
        termination_date: data.termination_date ?? null,
        termination_reason: data.termination_reason ?? null,
        room_number_shared: data.room_number_shared ?? null,
        one_marked_at: data.one_marked_at ?? null,
        diet_details: data.diet_details ?? null,
      };
      
      await employeeService.create(normalizedData);
      toast.success(t('employeeAdded'));
      
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      // Handle validation errors with details
      if (
        error instanceof Error &&
        "details" in error &&
        typeof (error as Error & { details?: Record<string, string[]> })
          .details === "object"
      ) {
        const details = (
          error as Error & { details?: Record<string, string[]> }
        ).details;
        if (details) {
          Object.entries(details).forEach(([field, messages]) => {
            form.setError(field as keyof CreateEmployeeInput, {
              message: messages[0],
            });
          });
        }
      }
      // Handle duplicate PE3 date
      else if (
        error instanceof Error &&
        (error.message.includes("DUPLICATE_PE3_DATE") ||
          error.message.includes("duplicate PE3 date") ||
          error.message.includes("already assigned"))
      ) {
        toast.error(t('duplicatePE3Date'));
        form.setError("pe3_date", {
          message: t('pe3DateAlreadyAssigned'),
        });
        // Refetch available dates to refresh the dropdown
        // The useAvailablePE3Dates hook will handle this via real-time subscription
      }
      // Handle duplicate SSN
      else if (
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        form.setError("ssn", {
          message: t('duplicateSSN'),
        });
      }
      // Generic error
      else {
        toast.error(tErrors('saveFailed'), {
          description:
            error instanceof Error ? error.message : tErrors('serverError'),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      // Check if form has unsaved changes
      if (isDirty) {
        setShowUnsavedDialog(true); // Show confirmation dialog
      } else {
        form.reset();
        onClose(); // Close immediately if form is pristine
      }
    }
  };

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowUnsavedDialog(true); // Show confirmation dialog
    } else {
      form.reset();
      onClose(); // Close immediately if form is pristine
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tDashboard('actions.addEmployee')}</DialogTitle>
          <DialogDescription>
            {t('createEmployeeDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4" noValidate>
            {/* Live region for validation error announcements */}
            <div 
              ref={announcementRef}
              role="alert" 
              aria-live="polite" 
              aria-atomic="true" 
              className="sr-only"
              id="form-errors-announcement"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PersonalInfoFields control={form.control as any} />

              <DateFields
                control={form.control as any}
                stenaDates={stenaDates}
                stenaLoading={stenaLoading}
                omcDates={omcDates}
                omcLoading={omcLoading}
                pe3Dates={pe3Dates}
                pe3Loading={pe3Loading}
                pe3Available={pe3Available}
              />
            </div>

            <DietAndCommentsFields control={form.control as any} watch={form.watch} />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAttempt}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? `${tCommon('loading')}` : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onCancel={() => setShowUnsavedDialog(false)}
        onConfirm={() => {
          form.reset();
          setShowUnsavedDialog(false);
          onClose();
        }}
      />
    </Dialog>
  );
}
