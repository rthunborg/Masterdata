"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import type { StaffingNeedWithProgress } from "@/lib/types/staffing-needs";

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

  const editStaffingNeedsFormSchema = z.object({
    trelleborg: z
      .number({ invalid_type_error: t("validationInteger") })
      .int({ message: t("validationInteger") })
      .min(0, { message: t("validationMinZero") }),
    goteborg: z
      .number({ invalid_type_error: t("validationInteger") })
      .int({ message: t("validationInteger") })
      .min(0, { message: t("validationMinZero") }),
  });

  type EditStaffingNeedsFormValues = z.infer<typeof editStaffingNeedsFormSchema>;
  const currentTrelleborg =
    currentNeeds.find((n) => n.location === "Trelleborg")?.headcount_need ?? 0;
  const currentGoteborg =
    currentNeeds.find((n) => n.location === "Göteborg")?.headcount_need ?? 0;

  const form = useForm<EditStaffingNeedsFormValues>({
    resolver: zodResolver(editStaffingNeedsFormSchema),
    defaultValues: {
      trelleborg: currentTrelleborg,
      goteborg: currentGoteborg,
    },
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      form.reset({
        trelleborg: currentTrelleborg,
        goteborg: currentGoteborg,
      });
    }
  }, [open, currentTrelleborg, currentGoteborg, form]);

  async function onSubmit(values: EditStaffingNeedsFormValues) {
    const updates: Promise<Response>[] = [];

    if (values.trelleborg !== currentTrelleborg) {
      updates.push(
        fetch("/api/staffing-needs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "Trelleborg",
            headcount_need: values.trelleborg,
          }),
        })
      );
    }
    if (values.goteborg !== currentGoteborg) {
      updates.push(
        fetch("/api/staffing-needs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "Göteborg",
            headcount_need: values.goteborg,
          }),
        })
      );
    }

    if (updates.length === 0) {
      onOpenChange(false);
      return;
    }

    const results = await Promise.all(updates);
    if (results.every((r) => r.ok)) {
      toast.success(t("saveSuccess"));
      onSuccess();
      onOpenChange(false);
    } else {
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
            <FormField
              control={form.control}
              name="trelleborg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("locationTrelleborg")}</FormLabel>
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
            <FormField
              control={form.control}
              name="goteborg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("locationGoteborg")}</FormLabel>
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
