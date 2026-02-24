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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TOWN_DISTRICTS } from "@/lib/constants/options";

interface PersonalInfoFieldsProps {
  control: Control<any>;
}

export function PersonalInfoFields({ control }: PersonalInfoFieldsProps) {
  const t = useTranslations("forms");

  return (
    <>
      {/* First Name */}
      <FormField
        control={control}
        name="first_name"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              {t("firstName")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="John"
                {...field}
                className="h-12 md:h-10"
                aria-required="true"
                aria-invalid={fieldState.invalid}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Surname */}
      <FormField
        control={control}
        name="surname"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              {t("surname")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Doe"
                {...field}
                className="h-12 md:h-10"
                aria-required="true"
                aria-invalid={fieldState.invalid}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* SSN */}
      <FormField
        control={control}
        name="ssn"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              {t("ssn")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="19850315-1234"
                {...field}
                className="h-12 md:h-10"
                inputMode="numeric"
                aria-required="true"
                aria-invalid={fieldState.invalid}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Email */}
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("email")}</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="john.doe@example.com (optional)"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                className="h-12 md:h-10"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Mobile */}
      <FormField
        control={control}
        name="mobile"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("mobile")}</FormLabel>
            <FormControl>
              <Input
                type="tel"
                placeholder="+46701234567"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                className="h-12 md:h-10"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Rank */}
      <FormField
        control={control}
        name="rank"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              {t("rank")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? undefined}
            >
              <FormControl>
                <SelectTrigger
                  aria-required="true"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder={t("selectRank")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="SEV">{t("rankSEV")}</SelectItem>
                <SelectItem value="CHEF">{t("rankCHEF")}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Town District */}
      <FormField
        control={control}
        name="town_district"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("townDistrict")}</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? undefined}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      t("selectTownDistrict") === "selectTownDistrict"
                        ? "Välj stad"
                        : t("selectTownDistrict")
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TOWN_DISTRICTS.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Hotel Required */}
      <FormField
        control={control}
        name="hotel_required"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="cursor-pointer font-normal">
                {t("hotelRequired")}
              </FormLabel>
              <FormDescription className="text-xs">
                {t("hotelRequiredDescription")}
              </FormDescription>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Gender */}
      <FormField
        control={control}
        name="gender"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              {t("gender")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? undefined}
            >
              <FormControl>
                <SelectTrigger
                  aria-required="true"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder={t("selectGender")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Man">{t("genderMan")}</SelectItem>
                <SelectItem value="Woman">{t("genderWoman")}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Hire Date */}
      <FormField
        control={control}
        name="hire_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("hireDate")} <span className="text-red-500" aria-label="required">*</span>
            </FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
