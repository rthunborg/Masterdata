"use client";

import { useState } from "react";
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
import { employeeService } from "@/lib/services/employee-service";
import { toast } from "sonner";
import Papa from "papaparse";

interface ImportEmployeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string; data: Record<string, unknown> }>;
}

export function ImportEmployeesModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportEmployeesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCSVHeaders(headers);
        setCSVData(results.data.slice(0, 5) as CSVRow[]); // Preview first 5 rows
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
        setFile(null);
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await employeeService.importCSV(file);
      setImportResult(result);
      
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} employees!`);
        onSuccess();
      } else {
        toast.warning("No employees were imported. Please check the errors.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to import employees";
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `First Name,Surname,SSN,Email,Mobile,Town District,Rank,Gender,Hire Date,Comments
John,Doe,19850315-1234,john.doe@example.com,+46701234567,Stockholm,Manager,Male,2025-01-15,Sample employee
Jane,Smith,19900520-5678,jane.smith@example.com,+46709876543,Gothenburg,Developer,Female,2025-02-01,Another example`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleDownloadErrorReport = () => {
    if (!importResult || importResult.errors.length === 0) return;

    const errorRows = importResult.errors.map((err) => ({
      Row: err.row,
      Error: err.error,
      ...err.data,
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
    toast.success("Error report downloaded");
  };

  const handleClose = () => {
    setFile(null);
    setCSVData([]);
    setCSVHeaders([]);
    setImportResult(null);
    setIsImporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with the following columns: First Name, Surname,
            Social Security No., Email, Mobile, Town District, Rank, Gender,
            Hire Date (YYYY-MM-DD), Comments
          </DialogDescription>
        </DialogHeader>

        {/* File Upload */}
        {!file && !importResult && (
          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImporting}
              />
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download CSV Template
            </Button>
          </div>
        )}

        {/* CSV Preview */}
        {file && csvData.length > 0 && !importResult && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">CSV Preview (First 5 Rows)</h4>
              <div className="border rounded-md overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvHeaders.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.map((row, i) => (
                      <TableRow key={i}>
                        {csvHeaders.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Column headers will be automatically mapped to database fields.
              Required fields: First Name, Surname, SSN, Hire Date.
            </p>
          </div>
        )}

        {/* Import Progress */}
        {isImporting && (
          <div className="space-y-4 text-center py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-lg font-medium">Importing employees...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we process your file
            </p>
          </div>
        )}

        {/* Import Results */}
        {importResult && !isImporting && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-semibold text-lg mb-2">Import Complete</h4>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium text-green-600">
                    Successfully imported:
                  </span>{" "}
                  {importResult.imported} employees
                </p>
                {importResult.skipped > 0 && (
                  <p className="text-sm">
                    <span className="font-medium text-orange-600">
                      Skipped due to errors:
                    </span>{" "}
                    {importResult.skipped} rows
                  </p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Errors:</h5>
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
                        {err.error}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-muted-foreground italic">
                        ... and {importResult.errors.length - 10} more errors
                        (download report for full list)
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
                Cancel
              </Button>
              {file && !isImporting && (
                <Button onClick={handleImport}>Import</Button>
              )}
            </>
          )}
          {importResult && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
