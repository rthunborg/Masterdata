"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { STAFFING_LOCATIONS, LOCATION_I18N_KEYS } from "@/lib/types/staffing-needs";
import type { StaffingNeedWithProgress, StaffingLocation } from "@/lib/types/staffing-needs";

/** Build a Zod schema with one integer field per location */
function buildFormSchema(t: (key: string) => string) {
  const shape: Record<string, z.ZodNumber> = {};
  for (const loc of STAFFING_LOCATIONS) {
    shape[loc] = z
      .number({ invalid_type_error: t("validationInteger") })
      .int({ message: t("validationInteger") })
      .min(0, { message: t("validationMinZero") });
  }
  return z.object(shape);
}

type FormValues = Record<StaffingLocation, number>;

interface EditStaffingNeedsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNeeds: StaffingNeedWithProgress[];
  onSuccess: () => void;
}

export function EditStaffingNeedsModal({
  open,
  onOpenChange,
  currentNeeds,
  onSuccess,
}: EditStaffingNeedsModalProps) {
  const t = useTranslations("staffingNeeds");
  const tCommon = useTranslations("common");

  const editStaffingNeedsFormSchema = buildFormSchema(t);

  // Build default values from STAFFING_LOCATIONS
  const currentValues = {} as FormValues;
  for (const loc of STAFFING_LOCATIONS) {
    currentValues[loc] = currentNeeds.find((n) => n.location === loc)?.headcount_need ?? 0;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(editStaffingNeedsFormSchema) as unknown as Resolver<FormValues>,
    defaultValues: currentValues,
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      const resetValues = {} as FormValues;
      for (const loc of STAFFING_LOCATIONS) {
        resetValues[loc] = currentNeeds.find((n) => n.location === loc)?.headcount_need ?? 0;
      }
      form.reset(resetValues);
    }
  }, [open, currentNeeds, form]);

  async function onSubmit(values: FormValues) {
    const locationUpdates: { loc: StaffingLocation; promise: Promise<Response> }[] = [];

    for (const loc of STAFFING_LOCATIONS) {
      const prev = currentNeeds.find((n) => n.location === loc)?.headcount_need ?? 0;
      if (values[loc] !== prev) {
        locationUpdates.push({
          loc,
          promise: fetch("/api/staffing-needs", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: loc,
              headcount_need: values[loc],
            }),
          }),
        });
      }
    }

    if (locationUpdates.length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      const results = await Promise.allSettled(locationUpdates.map((u) => u.promise));
      const failures: string[] = [];

      results.forEach((result, idx) => {
        if (result.status === "rejected" || (result.status === "fulfilled" && !result.value.ok)) {
          failures.push(locationUpdates[idx].loc);
        }
      });

      if (failures.length === 0) {
        toast.success(t("saveSuccess"));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(t("saveError"));
        // Refresh to reflect any partial updates that did succeed
        onSuccess();
      }
    } catch (err) {
      console.error("[EditStaffingNeeds] Unexpected error during save:", err);
      toast.error(t("saveError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("editModalTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {STAFFING_LOCATIONS.map((loc) => (
              <FormField
                key={loc}
                control={form.control}
                name={loc}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(LOCATION_I18N_KEYS[loc])}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="save-button">
                {isSubmitting ? tCommon("saving") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
