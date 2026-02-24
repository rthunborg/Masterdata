/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Control } from "react-hook-form";
import { useTranslations } from "@/lib/i18n";
import {
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
import { Button } from "@/components/ui/button";
import { CapacityBadge } from "@/components/dashboard/capacity-badge";
import { cn } from "@/lib/utils";
import {
  formatDateDropdownOption,
  isJan1ExceptionDate,
} from "@/lib/utils/format";
import type { ImportantDate } from "@/lib/types/important-date";

interface DateFieldsProps {
  control: Control<any>;
  stenaDates: ImportantDate[];
  stenaLoading: boolean;
  omcDates: ImportantDate[];
  omcLoading: boolean;
  pe3Dates: ImportantDate[];
  pe3Loading: boolean;
  pe3Available: number;
}

function DateSelectItems({
  dates,
  showAvailableLabel,
}: {
  dates: ImportantDate[];
  showAvailableLabel?: boolean;
}) {
  return (
    <>
      {dates.map((date) => {
        const remainingSpots = date.remaining_spots ?? 0;
        const maxSpots = date.max_spots ?? (showAvailableLabel ? 1 : 99);
        const isFull = remainingSpots === 0;
        const isExceptionDate = isJan1ExceptionDate(date);

        return (
          <SelectItem
            key={date.id}
            value={date.id}
            disabled={isFull && !isExceptionDate}
            className={cn(
              isFull && !isExceptionDate && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span
                className={cn(
                  isFull &&
                    !isExceptionDate &&
                    "text-muted-foreground"
                )}
              >
                {formatDateDropdownOption(date, !isExceptionDate)}
              </span>
              {!isExceptionDate && (
                <div className="flex items-center gap-1.5">
                  {showAvailableLabel && !isFull ? (
                    <span className="text-xs font-medium text-muted-foreground">
                      Available
                    </span>
                  ) : (
                    <CapacityBadge
                      remainingSpots={remainingSpots}
                      maxSpots={maxSpots}
                    />
                  )}
                </div>
              )}
            </div>
          </SelectItem>
        );
      })}
    </>
  );
}

export function DateFields({
  control,
  stenaDates,
  stenaLoading,
  omcDates,
  omcLoading,
  pe3Dates,
  pe3Loading,
  pe3Available,
}: DateFieldsProps) {
  const t = useTranslations("forms");

  return (
    <>
      {/* Stena Date */}
      <FormField
        control={control}
        name="stena_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("stenaDate")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? undefined}
              disabled={stenaLoading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectStenaDate")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <DateSelectItems
                  dates={stenaDates.filter(
                    (d) => new Date(d.date_value) >= new Date()
                  )}
                />
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ÖMC Date */}
      <FormField
        control={control}
        name="omc_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("omcDate")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? undefined}
              disabled={omcLoading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectOmcDate")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <DateSelectItems dates={omcDates} />
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* PE3 Date */}
      <FormField
        control={control}
        name="pe3_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("pe3Date")}</FormLabel>
            <div className="flex gap-2">
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined}
                disabled={pe3Loading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectPe3Date")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pe3Dates.length === 0 && (
                    <SelectItem value="none" disabled>
                      {t("noPe3DatesAvailable")}
                    </SelectItem>
                  )}
                  <DateSelectItems dates={pe3Dates} showAvailableLabel />
                </SelectContent>
              </Select>
              {field.value && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => field.onChange(null)}
                >
                  {t("clear")}
                </Button>
              )}
            </div>
            <FormDescription>
              {pe3Available > 0
                ? t("pe3DatesRemaining", { count: pe3Available })
                : t("noPe3DatesAvailable")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
