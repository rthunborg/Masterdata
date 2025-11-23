"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ColorPicker, ColorIndicator } from "@/components/ui/color-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createCustomColumnSchema,
  type CreateCustomColumnInput,
} from "@/lib/validation/column-validation";
import { columnConfigService } from "@/lib/services/column-config-service";
import { useUIStore } from "@/lib/store/ui-store";
import { useColumns } from "@/lib/hooks/use-columns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Add Column Modal Component
 * Allows external party users to create custom columns
 */
export function AddColumnModal({ onColumnCreated }: { onColumnCreated?: () => void }) {
  const { modals, closeModal } = useUIStore();
  const { columns, refetch } = useColumns();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  
  const t = useTranslations('modals.addColumn');
  const tCommon = useTranslations('common');

  // Extract existing categories from columns with their colors
  const existingCategories = Array.from(
    new Map(
      columns
        .filter((col) => col.category !== null && col.category !== "")
        .map((col) => [col.category!, { name: col.category!, color: col.category_color }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const form = useForm<CreateCustomColumnInput>({
    resolver: zodResolver(createCustomColumnSchema),
    defaultValues: {
      column_name: "",
      db_column_name: "",
      column_type: "text",
      is_masterdata: false, // Default to External column
      category: "",
      category_color: null,
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!modals.addColumn) {
      form.reset();
    }
  }, [modals.addColumn, form]);

  const onSubmit = async (data: CreateCustomColumnInput) => {
    // Client-side duplicate check on db_column_name
    const existingDbColumnNames = columns.map((col) =>
      col.db_column_name.toLowerCase()
    );
    if (existingDbColumnNames.includes(data.db_column_name.toLowerCase())) {
      form.setError("db_column_name", {
        type: "manual",
        message: "A column with this database name already exists",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Remove category if empty string
      const submitData = {
        ...data,
        category: data.category && data.category.trim() ? data.category : undefined,
        category_color: data.category_color || undefined,
      };

      const newColumn = await columnConfigService.createCustomColumn(submitData);

      toast.success(`Kolumn "${newColumn.column_name}" skapad`);

      // Refetch columns to update the table
      refetch();

      // Notify parent component if callback provided
      if (onColumnCreated) {
        onColumnCreated();
      }

      // Close modal and reset form
      closeModal("addColumn");
      form.reset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('createFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={modals.addColumn}
      onOpenChange={() => closeModal("addColumn")}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lägg till ny kolumn</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Display Name (column_name) */}
            <FormField
              control={form.control}
              name="column_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolumnnamn (Visningsnamn) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="t.ex., Meal Plan, Training Status, Room Number"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detta namn visas i tabellhuvudet och i gränssnittet. Kan innehålla mellanslag och specialtecken.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Database Column Name (db_column_name) */}
            <FormField
              control={form.control}
              name="db_column_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Databaskolumnnamn *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="t.ex., meal_plan, training_status, room_number"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tekniskt namn för databaskolumnen. Använd <strong>snake_case</strong>: endast små bokstäver, siffror och understreck (_).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Column Category Selection (is_masterdata) */}
            <FormField
              control={form.control}
              name="is_masterdata"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('columnTypeSelectionLabel')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === "true")}
                      value={field.value ? "true" : "false"}
                      className="flex flex-col space-y-1"
                      disabled={isSubmitting}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="false" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {t('columnTypeExternal')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="true" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {t('columnTypeMasterdata')}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    {t('columnTypeSelectionDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Column Type */}
            <FormField
              control={form.control}
              name="column_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolumntyp *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj kolumntyp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Nummer</SelectItem>
                      <SelectItem value="date">Datum</SelectItem>
                      <SelectItem value="boolean">Boolesk</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category (Combobox with autocomplete) */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Kategori (Valfritt)</FormLabel>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryOpen}
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value || "Välj eller skriv en kategori"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Sök eller skriv ny kategori..."
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                        <CommandEmpty>
                          Tryck Enter för att skapa &ldquo;{field.value || ''}&rdquo;
                        </CommandEmpty>
                        {existingCategories.length > 0 && (
                          <CommandGroup heading="Befintliga kategorier">
                            {existingCategories.map((category) => (
                              <CommandItem
                                key={category.name}
                                value={category.name}
                                onSelect={() => {
                                  field.onChange(category.name);
                                  // Auto-populate category color when selecting existing category
                                  if (category.color) {
                                    form.setValue('category_color', category.color);
                                  }
                                  setCategoryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === category.name
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex items-center gap-2">
                                  {category.color && (
                                    <ColorIndicator color={category.color} size="sm" />
                                  )}
                                  <span>{category.name}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Color (shown when category is entered or new) */}
            <FormField
              control={form.control}
              name="category_color"
              render={({ field }) => (
                <FormItem>
                  <ColorPicker
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting || !form.watch('category')}
                    label="Kategori färg (Valfritt)"
                    placeholder="Välj eller ange färg"
                    allowClear={true}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeModal("addColumn")}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Skapar...' : 'Skapa kolumn'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
