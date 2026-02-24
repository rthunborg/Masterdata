/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TimePicker } from "../time-picker";
import { triggerPE3DescriptionUpdate } from "./date-change-helpers";

export function PE3Fields() {
  const form = useFormContext<any>();
  const category = form.watch("category");

  if (category !== "PE3 Dates") return null;

  return (
    <>
      <FormField
        control={form.control}
        name="time_value"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>
              Tid <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <TimePicker
                value={field.value ?? null}
                onChange={(value) => {
                  field.onChange(value);
                  triggerPE3DescriptionUpdate(form, undefined, value);
                }}
                placeholder="HH:MM (t.ex. 14:30)"
              />
            </FormControl>
            <p className="text-sm text-muted-foreground">
              Tid är obligatorisk för PE3-datum
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="deadline_submit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Inlämningsdeadline (Valfritt)</FormLabel>
            <FormControl>
              <Input
                type="date"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(e.target.value === "" ? null : e.target.value);
                }}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Efter detta datum kan inga nya medarbetare tilldelas
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="deadline_cancel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Avbokningsdeadline (Valfritt)</FormLabel>
            <FormControl>
              <Input
                type="date"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(e.target.value === "" ? null : e.target.value);
                }}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Efter detta datum kan tilldelningar inte avbokas
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
