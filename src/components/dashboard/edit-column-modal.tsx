"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  updateColumnSchema,
  type UpdateColumnInput,
} from "@/lib/validation/column-validation";
import { columnConfigService } from "@/lib/services/column-config-service";
import { useUIStore } from "@/lib/store/ui-store";
import { useColumns } from "@/lib/hooks/use-columns";

/**
 * Edit Column Modal Component
 * Allows external party users to edit their custom columns (name, category)
 * Column type is read-only for existing columns
 */
export function EditColumnModal() {
  const { modals, editColumnId, closeEditColumnModal } = useUIStore();
  const { columns, refetch } = useColumns();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  
  const t = useTranslations('modals.editColumn');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');

  // Find the column being edited
  const editingColumn = columns.find((col) => col.id === editColumnId);

  // Extract existing categories from columns
  const existingCategories = Array.from(
    new Set(
      columns
        .map((col) => col.category)
        .filter((cat): cat is string => cat !== null && cat !== "")
    )
  ).sort();

  const form = useForm<UpdateColumnInput>({
    resolver: zodResolver(updateColumnSchema),
    defaultValues: {
      column_name: "",
      category: "",
    },
  });

  // Populate form when column changes
  useEffect(() => {
    if (editingColumn) {
      form.reset({
        column_name: editingColumn.column_name,
        category: editingColumn.category || "",
      });
    }
  }, [editingColumn, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!modals.editColumn) {
      form.reset();
    }
  }, [modals.editColumn, form]);

  const onSubmit = async (data: UpdateColumnInput) => {
    if (!editColumnId) {
      toast.error(t('noColumnSelected'));
      return;
    }

    // Client-side duplicate check (exclude current column)
    const existingColumnNames = columns
      .filter((col) => col.id !== editColumnId)
      .map((col) => col.column_name.toLowerCase());
    
    if (data.column_name && existingColumnNames.includes(data.column_name.toLowerCase())) {
      form.setError("column_name", {
        type: "manual",
        message: "Column name already exists. Please choose a different name.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Remove category if empty string
      const submitData: UpdateColumnInput = {
        ...data,
        category: data.category && data.category.trim() ? data.category : undefined,
      };

      const updatedColumn = await columnConfigService.updateCustomColumn(
        editColumnId,
        submitData
      );

      toast.success(t('columnUpdated', { name: updatedColumn.column_name }));

      // Refetch columns to update the table
      refetch();

      // Close modal and reset form
      closeEditColumnModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('updateFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={modals.editColumn} onOpenChange={closeEditColumnModal}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Column Name */}
            <FormField
              control={form.control}
              name="column_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForms('columnName')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Recruitment Team"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Column Type (Read-only) */}
            {editingColumn && (
              <FormItem>
                <FormLabel>{tForms('columnType')}</FormLabel>
                <Select value={editingColumn.column_type} disabled>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t('columnTypeHint')}
                </p>
              </FormItem>
            )}

            {/* Category (Combobox with autocomplete) */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{tForms('category')} (Optional)</FormLabel>
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
                          {field.value || "Select or type a category"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search or type new category..."
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                        <CommandEmpty>
                          Press Enter to create &quot;{field.value || ''}&quot;
                        </CommandEmpty>
                        {existingCategories.length > 0 && (
                          <CommandGroup heading="Existing Categories">
                            {existingCategories.map((category) => (
                              <CommandItem
                                key={category}
                                value={category}
                                onSelect={() => {
                                  field.onChange(category);
                                  setCategoryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === category
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {category}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditColumnModal}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('saving') : t('saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
