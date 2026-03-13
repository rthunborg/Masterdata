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

export function WeekYearFields() {
  const form = useFormContext<any>();

  return (
    <>
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
                value={field.value ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || isNaN(parseInt(value, 10))) {
                    return;
                  }
                  field.onChange(parseInt(value, 10));
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
