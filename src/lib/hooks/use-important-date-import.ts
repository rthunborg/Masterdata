import { useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { importantDateService } from "@/lib/services/important-date-service";
import {
  calculatePE3Deadlines,
  type PE3DeadlineCalculation,
} from "@/lib/services/pe3-deadline-calculator";
import { toast } from "sonner";
import Papa from "papaparse";

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

export const DATABASE_FIELDS = [
  { value: "week_number", label: "Week Number" },
  { value: "year", label: "Year" },
  { value: "date_description", label: "Date Description" },
  { value: "date_value", label: "Date Value" },
  { value: "time_value", label: "Time" },
  { value: "notes", label: "Notes" },
  { value: "ignore", label: "(Ignore)" },
];

const REQUIRED_FIELDS = ["year", "date_description", "date_value"];

function autoMapColumns(headers: string[]): ColumnMapping {
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
}

/**
 * Encapsulates all state and business logic for the PE3 date CSV import workflow:
 * file selection, column mapping, deadline calculation, import execution, and results.
 */
export function useImportantDateImport(onImportComplete: () => void) {
  const tDates = useTranslations("dates");
  const tToasts = useTranslations("toasts");

  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [calculatedDeadlines, setCalculatedDeadlines] =
    useState<PE3DeadlineCalculation | null>(null);
  const [overrideDeadlineSubmit, setOverrideDeadlineSubmit] = useState("");
  const [overrideDeadlineCancel, setOverrideDeadlineCancel] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [mappingError, setMappingError] = useState("");

  const validateMapping = (): boolean => {
    const mappedFields = Object.values(columnMapping).filter(
      (f) => f !== "ignore"
    );
    const missingFields = REQUIRED_FIELDS.filter(
      (f) => !mappedFields.includes(f)
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
        setCSVData(allData.slice(0, 5));

        const mapping = autoMapColumns(headers);
        setColumnMapping(mapping);

        try {
          const dateColumn = Object.entries(mapping).find(
            ([, dbField]) => dbField === "date_value"
          )?.[0];

          if (dateColumn && allData.length > 0) {
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
    setColumnMapping((prev) => ({ ...prev, [csvHeader]: dbField }));
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
      const finalDeadlineSubmit =
        overrideDeadlineSubmit || calculatedDeadlines?.deadlineSubmit;
      const finalDeadlineCancel =
        overrideDeadlineCancel || calculatedDeadlines?.deadlineCancel;

      const result = await importantDateService.importCSV(
        file,
        columnMapping,
        finalDeadlineSubmit,
        finalDeadlineCancel
      );
      setImportResult(result);

      if (result.imported > 0) {
        toast.success(
          tToasts("import.importSuccess", { count: result.imported })
        );
        onImportComplete();
      } else {
        toast.warning(tToasts("import.noDatesImported"));
      }
    } catch {
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
    toast.success(tDates("downloadPE3Template"));
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

  const resetAll = () => {
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
  };

  const previewData = file && csvData.length > 0 ? getPreviewData() : [];
  const previewFields = Object.keys(previewData[0] || {});

  return {
    file,
    csvHeaders,
    columnMapping,
    calculatedDeadlines,
    overrideDeadlineSubmit,
    overrideDeadlineCancel,
    isImporting,
    importResult,
    mappingError,
    previewData,
    previewFields,
    setOverrideDeadlineSubmit,
    setOverrideDeadlineCancel,
    handleFileChange,
    handleMappingChange,
    handleImport,
    handleDownloadTemplate,
    handleDownloadErrorReport,
    resetAll,
  };
}
