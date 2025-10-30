import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createEmployeeSchemaWithMessages,
  type CreateEmployeeInput,
} from "@/lib/validation/employee-schema";
import { employeeService } from "@/lib/services/employee-service";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { useAvailablePE3Dates } from "@/lib/hooks/use-available-pe3-dates";
import { formatImportantDateOption } from "@/lib/utils/format";
import { UnsavedChangesDialog } from "@/components/dashboard/unsaved-changes-dialog";

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
  const { dates: omcDates, isLoading: omcLoading } =
    useImportantDates('ÖMC Dates');
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
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      first_name: "",
      surname: "",
      ssn: "",
      email: null,
      mobile: null,
      rank: "",
      gender: null,
      town_district: null,
      hire_date: new Date().toISOString().split("T")[0],
      stena_date: "",
      omc_date: "",
      pe3_date: null,
      comments: null,
      is_terminated: false,
      is_archived: false,
      termination_date: null,
      termination_reason: null,
    },
  });

  // Extract isDirty from formState for unsaved changes tracking
  const { isDirty } = form.formState;

  const onSubmit = async (data: CreateEmployeeInput) => {
    try {
      setIsSubmitting(true);
      
      // Normalize email field: convert undefined to null
      const normalizedData = {
        ...data,
        email: data.email ?? null,
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
          <DialogTitle>{tDashboard('addEmployee')}</DialogTitle>
          <DialogDescription>
            {t('createEmployeeDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('firstName')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Surname */}
              <FormField
                control={form.control}
                name="surname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('surname')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SSN */}
              <FormField
                control={form.control}
                name="ssn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('ssn')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="19850315-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com (optional)"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mobile */}
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('mobile')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+46701234567"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rank */}
              <FormField
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('rank')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="CHEF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Town District */}
              <FormField
                control={form.control}
                name="town_district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('townDistrict')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Stockholm"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('gender')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectGender')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">{t('genderMale')}</SelectItem>
                        <SelectItem value="Female">{t('genderFemale')}</SelectItem>
                        <SelectItem value="Other">{t('genderOther')}</SelectItem>
                        <SelectItem value="Prefer not to say">
                          {t('genderPreferNotToSay')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hire Date */}
              <FormField
                control={form.control}
                name="hire_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('hireDate')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stena Date */}
              <FormField
                control={form.control}
                name="stena_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('stenaDate')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                      disabled={stenaLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectStenaDate')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stenaDates
                          .filter((d) => new Date(d.date_value) >= new Date())
                          .map((date) => (
                            <SelectItem key={date.id} value={date.id}>
                              {formatImportantDateOption(date)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ÖMC Date */}
              <FormField
                control={form.control}
                name="omc_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('omcDate')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                      disabled={omcLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectOmcDate')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {omcDates
                          .filter((d) => new Date(d.date_value) >= new Date())
                          .map((date) => (
                            <SelectItem key={date.id} value={date.id}>
                              {formatImportantDateOption(date)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* PE3 Date */}
              <FormField
                control={form.control}
                name="pe3_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pe3Date')}</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                        disabled={pe3Loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectPe3Date')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pe3Dates.length === 0 && (
                            <SelectItem value="none" disabled>
                              {t('noPe3DatesAvailable')}
                            </SelectItem>
                          )}
                          {pe3Dates
                            .filter((d) => new Date(d.date_value) >= new Date())
                            .map((date) => (
                              <SelectItem key={date.id} value={date.id}>
                                {formatImportantDateOption(date)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(null)}
                        >
                          {t('clear')}
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      {pe3Available > 0
                        ? t('pe3DatesRemaining', { count: pe3Available })
                        : t('noPe3DatesAvailable')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Comments */}
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('comments')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('commentsPlaceholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
