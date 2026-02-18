import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/i18n";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateEmployeeSchemaWithMessages,
  type UpdateEmployeeInput,
} from "@/lib/validation/employee-schema";
import { employeeService } from "@/lib/services/employee-service";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { useAvailablePE3Dates } from "@/lib/hooks/use-available-pe3-dates";
import { useAvailableOMCDates } from "@/lib/hooks/use-available-omc-dates";
import { formatDateDropdownOption, isJan1ExceptionDate } from "@/lib/utils/format";
import { UnsavedChangesDialog } from "@/components/dashboard/unsaved-changes-dialog";
import { CapacityBadge } from "@/components/dashboard/capacity-badge";
import { cn } from "@/lib/utils";
import { TOWN_DISTRICTS } from "@/lib/constants/options";
import type { Employee } from "@/lib/types/employee";

interface EditEmployeeModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEmployeeModal({
  employee,
  isOpen,
  onClose,
  onSuccess,
}: EditEmployeeModalProps) {
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
  // Pass current omc_date for edit mode to keep it in the list
  const { availableDates: omcDates, isLoading: omcLoading } =
    useAvailableOMCDates(employee?.omc_date);
  const { availableDates: pe3Dates, totalAvailable: pe3Available, isLoading: pe3Loading } =
    useAvailablePE3Dates(employee?.pe3_date);

  // Create schema with translated error messages
  const updateEmployeeSchema = updateEmployeeSchemaWithMessages(
    (key: string) => {
      // Remove 'errors.' prefix to match translation key structure
      const translationKey = key.replace('errors.', '');
      return tErrors(translationKey as 'validation.firstNameRequired');
    }
  );

  const form = useForm<UpdateEmployeeInput>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      first_name: "",
      surname: "",
      ssn: "",
      email: null,
      mobile: null,
      rank: "SEV",
      gender: undefined,
      town_district: null,
      hotel_required: false,
      hire_date: new Date().toISOString().split("T")[0],
      stena_date: "",
      omc_date: "",
      pe3_date: null,
      comments: null,
      // Story 8.17: Dietary Requirements
      special_diet: false,
      diet_details: null,
      // Story 13.9: Repayment fields (read-only, auto-managed)
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
    },
  });

  // Pre-fill form when employee changes
  useEffect(() => {
    if (employee && isOpen) {
      form.reset({
        first_name: employee.first_name || "",
        surname: employee.surname || "",
        ssn: employee.ssn || "",
        email: employee.email || null,
        mobile: employee.mobile || null,
        rank: employee.rank || "SEV",
        gender: employee.gender || undefined,
        town_district: employee.town_district || null,
        hotel_required: employee.hotel_required || false,
        hire_date: employee.hire_date ? new Date(employee.hire_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        stena_date: employee.stena_date || "",
        omc_date: employee.omc_date || "",
        pe3_date: employee.pe3_date || null,
        comments: employee.comments || null,
        special_diet: employee.special_diet || false,
        diet_details: employee.diet_details || null,
        // Story 13.9: Include repayment fields for terminated employees
        repayment_needed_omc: employee.repayment_needed_omc || null,
        repayment_needed_pe3: employee.repayment_needed_pe3 || null,
      });
    }
  }, [employee, isOpen, form]);

  // Scroll to top when modal opens (only once, doesn't prevent normal scrolling)
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to ensure the modal is fully rendered
      const timeoutId = setTimeout(() => {
        // Find the dialog content element by data attribute
        // This scrolls to top once when opening, but doesn't prevent normal scrolling afterward
        const dialogContent = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
        if (dialogContent && dialogContent.scrollTop > 0) {
          dialogContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Extract isDirty from formState for unsaved changes tracking
  const { isDirty } = form.formState;

  // Watch special_diet for conditional rendering
  const specialDiet = form.watch("special_diet");

  const onSubmit = async (data: UpdateEmployeeInput) => {
    if (!employee) return;

    try {
      setIsSubmitting(true);
      
      // Normalize email field: convert undefined to null
      const normalizedData = {
        ...data,
        email: data.email ?? null,
        diet_details: data.diet_details ?? null,
      };
      
      await employeeService.update(employee.id, normalizedData);
      toast.success(t('employeeUpdated'));
      
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
            form.setError(field as keyof UpdateEmployeeInput, {
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

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tDashboard('editEmployee') || 'Edit Employee'}</DialogTitle>
          <DialogDescription>
            {t('editEmployeeDescription') || `Edit ${employee.first_name} ${employee.surname}'s information`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Input placeholder="John" {...field} className="h-12 md:h-10" />
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
                      <Input placeholder="Doe" {...field} className="h-12 md:h-10" />
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
                      <Input 
                        placeholder="19850315-1234" 
                        {...field} 
                        className="h-12 md:h-10"
                        inputMode="numeric"
                      />
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
                        className="h-12 md:h-10"
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
                        type="tel"
                        placeholder="+46701234567"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                        className="h-12 md:h-10"
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectRank')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SEV">{t('rankSEV')}</SelectItem>
                        <SelectItem value="CHEF">{t('rankCHEF')}</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              t('selectTownDistrict') === 'selectTownDistrict'
                                ? 'Välj stad'
                                : t('selectTownDistrict')
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TOWN_DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hotel Required */}
              <FormField
                control={form.control}
                name="hotel_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer font-normal">
                        {t('hotelRequired')}
                      </FormLabel>
                      <FormDescription className="text-xs">
                        {t('hotelRequiredDescription')}
                      </FormDescription>
                    </div>
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
                    <FormLabel>
                      {t('gender')} <span className="text-red-500">*</span>
                    </FormLabel>
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
                        <SelectItem value="Man">{t('genderMan')}</SelectItem>
                        <SelectItem value="Woman">{t('genderWoman')}</SelectItem>
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
                          .map((date) => {
                            const remainingSpots = date.remaining_spots ?? 0;
                            const maxSpots = date.max_spots ?? 99;
                            const isFull = remainingSpots === 0;
                            // Story 19.8: Check for exception date
                            const isExceptionDate = isJan1ExceptionDate(date);
                            
                            return (
                              <SelectItem 
                                key={date.id} 
                                value={date.id}
                                disabled={isFull && !isExceptionDate}
                                className={cn(isFull && !isExceptionDate && "opacity-50 cursor-not-allowed")}
                              >
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span className={cn(isFull && !isExceptionDate && "text-muted-foreground")}>
                                    {formatDateDropdownOption(date, !isExceptionDate)}
                                  </span>
                                  {!isExceptionDate && (
                                    <div className="flex items-center gap-1.5">
                                      <CapacityBadge
                                        remainingSpots={remainingSpots}
                                        maxSpots={maxSpots}
                                      />
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
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
                        {/* Story 19.8: ÖMC dates now come from useAvailableOMCDates hook with Jan 1 exception */}
                        {omcDates.map((date) => {
                          const remainingSpots = date.remaining_spots ?? 0;
                          const maxSpots = date.max_spots ?? 99;
                          const isFull = remainingSpots === 0;
                          // Story 19.8: Check for exception date
                          const isExceptionDate = isJan1ExceptionDate(date);
                          
                          return (
                            <SelectItem 
                              key={date.id} 
                              value={date.id}
                              disabled={isFull && !isExceptionDate}
                              className={cn(isFull && !isExceptionDate && "opacity-50 cursor-not-allowed")}
                            >
                              <div className="flex items-center justify-between gap-2 w-full">
                                <span className={cn(isFull && !isExceptionDate && "text-muted-foreground")}>
                                  {formatDateDropdownOption(date, !isExceptionDate)}
                                </span>
                                {!isExceptionDate && (
                                  <div className="flex items-center gap-1.5">
                                    <CapacityBadge
                                      remainingSpots={remainingSpots}
                                      maxSpots={maxSpots}
                                    />
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
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
                          {/* Story 19.8: PE3 dates come from hook with Jan 1 exception support */}
                          {pe3Dates.map((date) => {
                            const remainingSpots = date.remaining_spots ?? 0;
                            const maxSpots = date.max_spots ?? 1;
                            const isFull = remainingSpots === 0;
                            // Story 19.8: Check for exception date
                            const isExceptionDate = isJan1ExceptionDate(date);
                            
                            return (
                              <SelectItem 
                                key={date.id} 
                                value={date.id}
                                disabled={isFull && !isExceptionDate}
                                className={cn(isFull && !isExceptionDate && "opacity-50 cursor-not-allowed")}
                              >
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span className={cn(isFull && !isExceptionDate && "text-muted-foreground")}>
                                    {formatDateDropdownOption(date, !isExceptionDate)}
                                  </span>
                                  {!isExceptionDate && (
                                    <div className="flex items-center gap-1.5">
                                      {isFull ? (
                                        <CapacityBadge
                                          remainingSpots={remainingSpots}
                                          maxSpots={maxSpots}
                                        />
                                      ) : (
                                        <span className="text-xs font-medium text-muted-foreground">
                                          Available
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
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

              {/* Story 13.9: Repayment fields - checkboxes, only visible for terminated employees */}
              {employee.is_terminated && (
                <>
                  {/* Repayment Needed (ÖMC) */}
                  <FormField
                    control={form.control}
                    name="repayment_needed_omc"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={(checked) => field.onChange(checked === true ? true : null)}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {tDashboard('repaymentNeededOMC') || 'Repayment Needed (ÖMC)'}
                          </FormLabel>
                          <FormDescription>
                            {tDashboard('repaymentFieldDescription') || 'Unchecked = no repayment; check if repayment is needed.'}
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Repayment Needed (PE3) */}
                  <FormField
                    control={form.control}
                    name="repayment_needed_pe3"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={(checked) => field.onChange(checked === true ? true : null)}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {tDashboard('repaymentNeededPE3') || 'Repayment Needed (PE3)'}
                          </FormLabel>
                          <FormDescription>
                            {tDashboard('repaymentFieldDescription') || 'Unchecked = no repayment; check if repayment is needed.'}
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Special Diet */}
            <FormField
              control={form.control}
              name="special_diet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('specialDiet')}
                    </FormLabel>
                    <FormDescription>
                      {t('specialDietDescription')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Diet Details - Conditional */}
            {specialDiet && (
              <FormField
                control={form.control}
                name="diet_details"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      {t('dietDetails')} <span className="text-red-500" aria-label="required">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('dietDetailsPlaceholder')}
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
            )}

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

