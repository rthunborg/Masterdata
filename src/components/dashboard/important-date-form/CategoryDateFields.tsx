/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFormContext } from "react-hook-form";
import {
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
import { DATE_CATEGORIES } from "@/lib/types/important-date";
import { parsePastedDate } from "@/lib/utils/date-utils";
import { OMCDatePicker } from "../omc-date-picker";
import {
  handleDateValueAutoPopulate,
  triggerPE3DescriptionUpdate,
} from "./date-change-helpers";

export function CategoryDateFields() {
  const form = useFormContext<any>();

  return (
    <>
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Kategori <span className="text-red-500">*</span>
            </FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                if (value === "PE3 Dates") {
                  triggerPE3DescriptionUpdate(form);
                }
              }}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DATE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "Other" ? "Övrigt" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="date_value"
        render={({ field }) => {
          const category = form.watch("category");
          const isOMC = category === "ÖMC Dates";

          return (
            <FormItem className={isOMC ? "col-span-2" : ""}>
              <FormLabel>
                Datumvärde <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                {isOMC ? (
                  <OMCDatePicker
                    value={field.value || ""}
                    onChange={(value) => {
                      field.onChange(value);
                      handleDateValueAutoPopulate(form, value);
                    }}
                  />
                ) : (
                  <Input
                    type="date"
                    {...field}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData("text");
                      const parsedDate = parsePastedDate(pastedText);
                      if (parsedDate) {
                        field.onChange(parsedDate);
                        handleDateValueAutoPopulate(form, parsedDate);
                      }
                    }}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      handleDateValueAutoPopulate(form, e.target.value);
                    }}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </>
  );
}
