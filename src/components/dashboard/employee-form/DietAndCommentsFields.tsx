/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Control, type UseFormWatch } from "react-hook-form";
import { useTranslations } from "@/lib/i18n";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface DietAndCommentsFieldsProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
}

export function DietAndCommentsFields({
  control,
  watch,
}: DietAndCommentsFieldsProps) {
  const t = useTranslations("forms");
  const specialDiet = watch("special_diet");

  return (
    <>
      {/* Special Diet */}
      <FormField
        control={control}
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
              <FormLabel>{t("specialDiet")}</FormLabel>
              <FormDescription>{t("specialDietDescription")}</FormDescription>
            </div>
          </FormItem>
        )}
      />

      {/* Diet Details - Conditional */}
      {specialDiet && (
        <FormField
          control={control}
          name="diet_details"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>
                {t("dietDetails")}{" "}
                <span className="text-red-500" aria-label="required">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("dietDetailsPlaceholder")}
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
        control={control}
        name="comments"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("comments")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("commentsPlaceholder")}
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
    </>
  );
}
