"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EXPORTABLE_EMPLOYEE_FIELDS, DEFAULT_EXPORT_FIELDS } from "@/lib/constants/export-fields";
import { exportEmployeesByCategory } from "@/lib/services/export-service";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n";

interface CategoryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Category Export Modal
 * Story: 8.8 - Important Dates Assigned Employees List
 * AC 13-19: Export employees by category with date range and field selection
 */
export function CategoryExportModal({ isOpen, onClose }: CategoryExportModalProps) {
  const tToasts = useTranslations("toasts");
  const [category, setCategory] = React.useState<'Stena Dates' | 'ÖMC Dates' | 'PE3 Dates'>('ÖMC Dates');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [selectedFields, setSelectedFields] = React.useState<string[]>(DEFAULT_EXPORT_FIELDS);
  const [isExporting, setIsExporting] = React.useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCategory('ÖMC Dates');
      setDateFrom('');
      setDateTo('');
      setSelectedFields(DEFAULT_EXPORT_FIELDS);
    }
  }, [isOpen]);

  function toggleField(fieldKey: string) {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  }

  function selectAll() {
    setSelectedFields(EXPORTABLE_EMPLOYEE_FIELDS.map(f => f.key));
  }

  function deselectAll() {
    setSelectedFields([]);
  }

  async function handleExport() {
    if (selectedFields.length === 0) {
      toast.error(tToasts("export.selectFields"));
      return;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error(tToasts("export.invalidDateRange"));
      return;
    }

    setIsExporting(true);
    try {
      await exportEmployeesByCategory({
        category,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        selectedFields,
        fieldDefinitions: EXPORTABLE_EMPLOYEE_FIELDS,
      });

      toast.success(tToasts("export.exportCompleted"));
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : tToasts("export.exportFailed");
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  // Group fields by category for better UX
  const personalInfoFields = ['first_name', 'surname', 'ssn', 'gender'];
  const contactFields = ['email', 'mobile', 'town_district'];
  const employmentFields = ['rank', 'hire_date', 'termination_date', 'termination_reason', 'loneiva'];
  const otherFields = ['comments'];

  const renderFieldGroup = (title: string, fieldKeys: string[]) => {
    const groupFields = EXPORTABLE_EMPLOYEE_FIELDS.filter(f => fieldKeys.includes(f.key));
    if (groupFields.length === 0) return null;

    return (
      <div key={title}>
        <h4 className="font-medium text-sm text-gray-700 mb-2">{title}</h4>
        <div className="space-y-2 pl-2">
          {groupFields.map(field => (
            <div key={field.key} className="flex items-center space-x-2">
              <Checkbox
                id={field.key}
                checked={selectedFields.includes(field.key)}
                onCheckedChange={() => toggleField(field.key)}
              />
              <Label
                htmlFor={field.key}
                className="text-sm font-normal cursor-pointer"
              >
                {field.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Employees by Date Category</DialogTitle>
          <DialogDescription>
            Export all employees assigned to dates within a specific category and optional date range.
            Select which employee fields to include in the export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Category Selection */}
          <div>
            <Label htmlFor="category">Date Category *</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as typeof category)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Stena Dates">Stena Dates</SelectItem>
                <SelectItem value="ÖMC Dates">ÖMC Dates</SelectItem>
                <SelectItem value="PE3 Dates">PE3 Dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFrom">Date Range From (Optional)</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date Range To (Optional)</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {dateFrom && dateTo && dateFrom > dateTo && (
            <p className="text-sm text-red-600">
              &ldquo;From&rdquo; date must be before &ldquo;To&rdquo; date
            </p>
          )}

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Select Fields to Export *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {selectedFields.length} of {EXPORTABLE_EMPLOYEE_FIELDS.length} fields selected
            </p>

            <div className="border rounded-md p-4 max-h-96 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                {renderFieldGroup('Personal Information', personalInfoFields)}
                {renderFieldGroup('Contact Information', contactFields)}
                {renderFieldGroup('Employment Information', employmentFields)}
                {renderFieldGroup('Other', otherFields)}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Note: &ldquo;Assigned Date Description&rdquo; and &ldquo;Assigned Date Value&rdquo; are always included in the export.
            </p>

            {selectedFields.length === 0 && (
              <p className="text-sm text-red-600 mt-2">
                Please select at least one field to export
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={
              isExporting ||
              selectedFields.length === 0 ||
              !!(dateFrom && dateTo && dateFrom > dateTo)
            }
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
