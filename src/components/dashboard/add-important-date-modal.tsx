"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
  
  const t = useTranslations('modals.addImportantDate');
  const tCommon = useTranslations('common');

  const form = useForm<CreateImportantDateInput>({
    resolver: zodResolver(createImportantDateSchema),
    defaultValues: {
      week_number: null,
      year: new Date().getFullYear(),
      category: "Stena Dates",
      date_description: "",
      date_value: "",
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
        notes: null,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Week Number */}
              <FormField
                control={form.control}
                name="week_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('weekNumberLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="53"
                        placeholder={t('weekNumberPlaceholder')}
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
                      {t('yearLabel')} <span className="text-red-500">*</span>
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

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('categoryLabel')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Stena Dates">{t('categoryStenaDates')}</SelectItem>
                        <SelectItem value="ÖMC Dates">{t('categoryOmcDates')}</SelectItem>
                        <SelectItem value="Other">{t('categoryOther')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Description */}
              <FormField
                control={form.control}
                name="date_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('dateDescriptionLabel')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('dateDescriptionPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date Value */}
            <FormField
              control={form.control}
              name="date_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('dateValueLabel')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('dateValuePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notesLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('notesPlaceholder')}
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
                {isSubmitting ? t('creating') : t('createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
