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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createImportantDateSchema } from "@/lib/validation/important-date-schema";
import { importantDateService } from "@/lib/services/important-date-service";
import { getDefaultYear } from "@/lib/utils/date-utils";
import { useImportantDateAutoPopulate } from "@/lib/hooks/use-important-date-auto-populate";
import { CategoryDateFields } from "./important-date-form/CategoryDateFields";
import { PE3Fields } from "./important-date-form/PE3Fields";
import { WeekYearFields } from "./important-date-form/WeekYearFields";
import { z } from "zod";

// Use z.input for form type (before transform) to match zodResolver expectations
type CreateImportantDateInput = z.input<typeof createImportantDateSchema>;

interface AddImportantDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getResetValues() {
  return {
    week_number: null,
    year: getDefaultYear(),
    category: "Stena Dates" as const,
    date_description: "",
    date_value: "",
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    notes: null,
  };
}

export function AddImportantDateModal({
  isOpen,
  onClose,
  onSuccess,
}: AddImportantDateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevIsOpenRef = useRef(false);

  const t = useTranslations("modals");
  const tCommon = useTranslations("common");

  const form = useForm<CreateImportantDateInput>({
    resolver: zodResolver(createImportantDateSchema),
    defaultValues: {
      ...getResetValues(),
      max_spots: 0,
      remaining_spots: 0,
    },
  });

  // Reset form when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      form.reset(getResetValues());
    }
    prevIsOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useImportantDateAutoPopulate(form, isOpen);

  const onSubmit = async (data: CreateImportantDateInput) => {
    try {
      setIsSubmitting(true);

      const parsedData = createImportantDateSchema.parse(data);
      const normalizedData = {
        ...parsedData,
        time_value: parsedData.time_value ?? null,
        deadline_submit: parsedData.deadline_submit ?? null,
        deadline_cancel: parsedData.deadline_cancel ?? null,
      };

      await importantDateService.create(normalizedData);

      toast.success(t("addImportantDate.dateCreated"));

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
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
      } else {
        toast.error(t("createFailed"), {
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
      form.reset(getResetValues());
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
              <CategoryDateFields />
              <WeekYearFields />
              <PE3Fields />

              <FormField
                control={form.control}
                name="date_description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Datumbeskrivning</FormLabel>
                    <FormControl>
                      <Input placeholder="t.ex., Fredag 14/2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Skapar..." : "Skapa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
