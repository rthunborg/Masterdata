"use client";

import { useState } from "react";
import { useTranslations } from "@/lib/i18n";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { importantDateService } from "@/lib/services/important-date-service";
import { calculatePE3Deadlines, type PE3DeadlineCalculation } from "@/lib/services/pe3-deadline-calculator";
import { toast } from "sonner";
import Papa from "papaparse";

interface ImportImportantDatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  [csvHeader: string]: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; field?: string; message: string }>;
}

const DATABASE_FIELDS = [
  { value: "week_number", label: "Week Number" },
  { value: "year", label: "Year" },
  { value: "date_description", label: "Date Description" },
  { value: "date_value", label: "Date Value" },
  { value: "time_value", label: "Time" },
  { value: "notes", label: "Notes" },
  { value: "ignore", label: "(Ignore)" },
];

const REQUIRED_FIELDS = ["year", "date_description", "date_value"];

export function ImportImportantDatesModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportImportantDatesModalProps) {
  const tCommon = useTranslations("common");
  const tDates = useTranslations("dates");
  const tToasts = useTranslations("toasts");

  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [calculatedDeadlines, setCalculatedDeadlines] = useState<PE3DeadlineCalculation | null>(null);
  const [overrideDeadlineSubmit, setOverrideDeadlineSubmit] = useState<string>("");
  const [overrideDeadlineCancel, setOverrideDeadlineCancel] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [mappingError, setMappingError] = useState<string>("");

  const autoMapColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {};

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim();

      if (
        lowerHeader === "week number" ||
        lowerHeader === "week" ||
        lowerHeader === "week no"
      ) {
        mapping[header] = "week_number";
      } else if (lowerHeader === "year") {
        mapping[header] = "year";
      } else if (
        lowerHeader === "date description" ||
        lowerHeader === "description"
      ) {
        mapping[header] = "date_description";
      } else if (lowerHeader === "date value" || lowerHeader === "date") {
        mapping[header] = "date_value";
      } else if (lowerHeader === "time value" || lowerHeader === "time") {
        mapping[header] = "time_value";
      } else if (lowerHeader === "notes" || lowerHeader === "note") {
        mapping[header] = "notes";
      } else {
        mapping[header] = "ignore";
      }
    });

    return mapping;
  };

  const validateMapping = (): boolean => {
    const mappedFields = Object.values(columnMapping).filter(
      (field) => field !== "ignore"
    );
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => !mappedFields.includes(field)
    );

    if (missingFields.length > 0) {
      setMappingError(
        `Please map all required columns: ${missingFields.join(", ")}`
      );
      return false;
    }

    setMappingError("");
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);
    setMappingError("");
    setCalculatedDeadlines(null);
    setOverrideDeadlineSubmit("");
    setOverrideDeadlineCancel("");

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const allData = results.data as CSVRow[];
        
        setCSVHeaders(headers);
        setCSVData(allData.slice(0, 5)); // Preview first 5 rows
        
        // Auto-map columns
        const mapping = autoMapColumns(headers);
        setColumnMapping(mapping);

        // Calculate PE3 deadlines from all dates
        try {
          // Find the date_value column in mapping
          const dateColumn = Object.entries(mapping).find(
            ([, dbField]) => dbField === "date_value"
          )?.[0];

          if (dateColumn && allData.length > 0) {
            // Extract all date values
            const dates = allData
              .map((row) => row[dateColumn])
              .filter((date) => date && date.trim() !== "");

            if (dates.length > 0) {
              const deadlines = calculatePE3Deadlines(dates);
              setCalculatedDeadlines(deadlines);
            }
          }
        } catch (error) {
          console.error("Misslyckades att beräkna deadlines:", error);
          toast.error(tToasts("import.deadlineCalculationFailed"));
        }
      },
      error: (error) => {
        toast.error(tToasts("import.parseFailed", { message: error.message }));
        setFile(null);
      },
    });
  };

  const handleMappingChange = (csvHeader: string, dbField: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvHeader]: dbField,
    }));
    setMappingError("");
  };

  const getPreviewData = () => {
    return csvData.map((row) => {
      const mappedRow: Record<string, string> = {};
      
      Object.entries(columnMapping).forEach(([csvHeader, dbField]) => {
        if (dbField !== "ignore") {
          mappedRow[dbField] = row[csvHeader] || "(empty)";
        }
      });
      
      return mappedRow;
    });
  };

  const handleImport = async () => {
    if (!file || !validateMapping()) return;

    setIsImporting(true);
    try {
      // Use override values if provided, otherwise use calculated values
      const finalDeadlineSubmit = overrideDeadlineSubmit || calculatedDeadlines?.deadlineSubmit;
      const finalDeadlineCancel = overrideDeadlineCancel || calculatedDeadlines?.deadlineCancel;

      const result = await importantDateService.importCSV(
        file,
        columnMapping,
        finalDeadlineSubmit,
        finalDeadlineCancel
      );
      setImportResult(result);

      if (result.imported > 0) {
        toast.success(tToasts("import.importSuccess", { count: result.imported }));
        onImportComplete();
      } else {
        toast.warning(tToasts("import.noDatesImported"));
      }
    } catch (error: unknown) {
      toast.error(tToasts("import.importFailed"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `# PE3 Dates Import Template
# Category is automatically set to "PE3 Dates"
# Deadlines (Inlämningsdeadline and Avbokningsdeadline) will be calculated automatically
# based on the earliest date in your import
#
Week Number,Year,Date Description,Date Value,Time,Notes
10,2025,Måndag 10/3,2025-03-10,14:00,Example PE3 date
11,2025,Onsdag 19/3,2025-03-19,09:30,
12,2025,Fredag 28/3,2025-03-28,15:00,Another PE3 training`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pe3-dates-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(tDates('downloadPE3Template'));
  };

  const handleDownloadErrorReport = () => {
    if (!importResult || importResult.errors.length === 0) return;

    const errorRows = importResult.errors.map((err) => ({
      Row: err.row,
      Field: err.field || "",
      Error: err.message,
    }));

    const csv = Papa.unparse(errorRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_errors_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(tToasts("import.errorReportDownloaded"));
  };

  const handleClose = () => {
    setFile(null);
    setCSVData([]);
    setCSVHeaders([]);
    setColumnMapping({});
    setCalculatedDeadlines(null);
    setOverrideDeadlineSubmit("");
    setOverrideDeadlineCancel("");
    setImportResult(null);
    setIsImporting(false);
    setMappingError("");
    onOpenChange(false);
  };

  const previewData = file && csvData.length > 0 ? getPreviewData() : [];
  const previewFields = Object.keys(previewData[0] || {});

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="import-modal-title"
      >
        <DialogHeader>
          <DialogTitle id="import-modal-title">
            {tDates('importPE3Title')}
          </DialogTitle>
          <DialogDescription>
            {tDates('importPE3Description')}
          </DialogDescription>
        </DialogHeader>

        {/* File Upload Section */}
        {!file && !importResult && (
          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImporting}
                aria-label="Upload CSV file"
              />
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              {tDates('downloadPE3Template')}
            </Button>
          </div>
        )}

        {/* Column Mapping Section */}
        {file && csvHeaders.length > 0 && !importResult && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Map CSV Columns to Fields</h4>
              <div className="space-y-2">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-48 truncate">
                      {header}
                    </span>
                    <Select
                      value={columnMapping[header] || "ignore"}
                      onValueChange={(value) =>
                        handleMappingChange(header, value)
                      }
                      aria-label={`Map ${header} column`}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATABASE_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {mappingError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{mappingError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Deadline Preview and Override Section */}
        {file && calculatedDeadlines && !importResult && (
          <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold">{tDates('calculatedDeadlines')}</h4>
            <p className="text-sm text-gray-600">
              {tDates('basedOnFirstDate').replace('{date}', calculatedDeadlines.firstDate)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label htmlFor="deadline-submit" className="block text-sm font-medium mb-1">
                  {tDates('deadlineSubmitLabel')}
                </label>
                <Input
                  id="deadline-submit"
                  type="date"
                  value={overrideDeadlineSubmit || calculatedDeadlines.deadlineSubmit}
                  onChange={(e) => setOverrideDeadlineSubmit(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{tDates('overrideOptional')}</p>
              </div>
              <div>
                <label htmlFor="deadline-cancel" className="block text-sm font-medium mb-1">
                  {tDates('deadlineCancelLabel')}
                </label>
                <Input
                  id="deadline-cancel"
                  type="date"
                  value={overrideDeadlineCancel || calculatedDeadlines.deadlineCancel}
                  onChange={(e) => setOverrideDeadlineCancel(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{tDates('overrideOptional')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {file && previewData.length > 0 && !importResult && (
          <div className="space-y-2">
            <h4 className="font-medium">Preview (First 5 Rows)</h4>
            <div className="border rounded-md overflow-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewFields.map((field) => (
                      <TableHead key={field} className="whitespace-nowrap">
                        {DATABASE_FIELDS.find((f) => f.value === field)
                          ?.label || field}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {previewFields.map((field) => (
                        <TableCell key={field} className="whitespace-nowrap">
                          {row[field] === "(empty)" || row[field] === "" || !row[field] ? (
                            <span className="text-muted-foreground italic">(empty)</span>
                          ) : (
                            row[field]
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Import Progress Section */}
        {isImporting && (
          <div className="space-y-4 text-center py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-lg font-medium">Importing dates...</p>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        )}

        {/* Import Results Section */}
        {importResult && !isImporting && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Import Complete</p>
                  <p className="text-sm">
                    <span className="text-green-600 font-medium">
                      Successfully imported:
                    </span>{" "}
                    {importResult.imported} dates
                  </p>
                  {importResult.skipped > 0 && (
                    <p className="text-sm">
                      <span className="text-orange-600 font-medium">
                        Skipped:
                      </span>{" "}
                      {importResult.skipped} rows due to errors
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Errors</h5>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadErrorReport}
                  >
                    Download Error Report
                  </Button>
                </div>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/30">
                  <ul className="space-y-2 text-sm">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="text-red-600">
                        <span className="font-medium">Row {err.row}:</span>{" "}
                        {err.field && `${err.field} - `}
                        {err.message}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-muted-foreground italic">
                        ...and {importResult.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!importResult && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isImporting}
              >
                {tCommon("cancel")}
              </Button>
              {file && !isImporting && (
                <Button onClick={handleImport}>{tCommon("import")}</Button>
              )}
            </>
          )}
          {importResult && (
            <Button onClick={handleClose}>{tCommon("close")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
