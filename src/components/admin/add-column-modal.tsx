"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { columnService } from "@/lib/services/column-service";
import { toast } from "sonner";
import {
  createColumnSchema,
  type CreateColumnFormData,
} from "@/lib/validation/column-validation";

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddColumnModal({
  isOpen,
  onClose,
  onSuccess,
}: AddColumnModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("admin");
  const tForms = useTranslations("forms");

  const form = useForm<CreateColumnFormData>({
    resolver: zodResolver(createColumnSchema),
    defaultValues: {
      column_name: "",
      column_type: "text",
      category: "",
    },
  });

  const handleSubmit = async (data: CreateColumnFormData) => {
    setIsSubmitting(true);
    try {
      await columnService.createColumn({
        column_name: data.column_name,
        column_type: data.column_type,
        category: data.category || null,
      });
      
      toast.success(`Column "${data.column_name}" created successfully`);
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create column";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("addColumn")}</DialogTitle>
          <DialogDescription>
            Create a new custom column. It will be visible only to HR Admins by
            default.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="column_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForms("columnName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Department, Employee ID"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="column_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForms("dataType")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForms("category")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional grouping category"
                      {...field}
                      value={field.value || ""}
                      disabled={isSubmitting}
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
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : t("createColumn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

