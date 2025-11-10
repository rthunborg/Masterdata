"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n";
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
import { createImportantDateSchema } from "@/lib/validation/important-date-schema";
import { importantDateService } from "@/lib/services/important-date-service";
import { getWeekNumberFromDateString } from "@/lib/utils/date-utils";
import { OMCDatePicker } from "./omc-date-picker";
import { TimePicker } from "./time-picker";
import { z } from "zod";

type CreateImportantDateInput = z.infer<typeof createImportantDateSchema>;

interface AddImportantDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddImportantDateModal({
  isOpen,
  onClose,
  onSuccess,
}: AddImportantDateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevIsOpenRef = useRef(false);
  
  const t = useTranslations('modals');
  const tCommon = useTranslations('common');

  const form = useForm<CreateImportantDateInput>({
    resolver: zodResolver(createImportantDateSchema),
    defaultValues: {
      week_number: null,
      year: new Date().getFullYear(),
      category: "Stena Dates",
      date_description: "",
      date_value: "",
      time_value: null,
      notes: null,
    },
  });

  // Reset form when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      form.reset({
        week_number: null,
        year: new Date().getFullYear(),
        category: "Stena Dates",
        date_description: "",
        date_value: "",
        notes: null,
      });
    }
    prevIsOpenRef.current = isOpen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onSubmit = async (data: CreateImportantDateInput) => {
    try {
      setIsSubmitting(true);
      const newDate = await importantDateService.create(data);
      
      toast.success(t('dateCreated', { description: newDate.date_description }));
      
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
            form.setError(field as keyof CreateImportantDateInput, {
              message: messages[0],
            });
          });
        }
      }
      // Generic error
      else {
        toast.error(t('createFailed'), {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset({
        week_number: null,
        year: new Date().getFullYear(),
        category: "Stena Dates",
        date_description: "",
        date_value: "",
        time_value: null,
        notes: null,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lägg till viktigt datum</DialogTitle>
          <DialogDescription>
            Skapa en ny viktig datumpost för operativ planering.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Kategori <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Stena Dates">Stena Dates</SelectItem>
                        <SelectItem value="ÖMC Dates">ÖMC Dates</SelectItem>
                        <SelectItem value="PE3 Dates">PE3 Dates</SelectItem>
                        <SelectItem value="Other">Övrigt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Value - conditional rendering based on category */}
              <FormField
                control={form.control}
                name="date_value"
                render={({ field }) => {
                  const category = form.watch('category');
                  const isOMC = category === 'ÖMC Dates';
                  
                  return (
                    <FormItem className={isOMC ? "col-span-2" : ""}>
                      <FormLabel>
                        Datumvärde <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        {isOMC ? (
                          <OMCDatePicker
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              // Auto-calculate week number when date is selected
                              const weekNum = getWeekNumberFromDateString(value);
                              if (weekNum !== null && !form.getValues('week_number')) {
                                form.setValue('week_number', weekNum);
                              }
                            }}
                          />
                        ) : (
                          <Input 
                            type="date"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              // Auto-calculate week number when date is selected
                              const weekNum = getWeekNumberFromDateString(e.target.value);
                              if (weekNum !== null && !form.getValues('week_number')) {
                                form.setValue('week_number', weekNum);
                              }
                              // Auto-populate date description with weekday and day/month
                              if (e.target.value) {
                                const date = new Date(e.target.value + 'T00:00:00');
                                const weekdays = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
                                const weekday = weekdays[date.getDay()];
                                const day = date.getDate();
                                const month = date.getMonth() + 1;
                                const description = `${weekday} ${day}/${month}`;
                                form.setValue('date_description', description);
                              }
                            }}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Week Number */}
              <FormField
                control={form.control}
                name="week_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veckonummer</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="53"
                        placeholder="t.ex., 7"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : parseInt(value, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year */}
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      År <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="2020"
                        max="2100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Value - only for PE3 Dates */}
              {form.watch('category') === 'PE3 Dates' && (
                <FormField
                  control={form.control}
                  name="time_value"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        Tid (Valfritt)
                      </FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value ?? null}
                          onChange={(value) => field.onChange(value)}
                          placeholder="HH:MM (t.ex. 14:30)"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Tid är valfri för PE3-datum
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Date Description - now optional and auto-populated */}
              <FormField
                control={form.control}
                name="date_description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>
                      Datumbeskrivning
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="t.ex., Fredag 14/2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anteckningar (Valfritt)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ytterligare anteckningar eller detaljer..."
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : value);
                      }}
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
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Skapar...' : 'Skapa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
