"use client";

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
import {
  useImportantDateImport,
  DATABASE_FIELDS,
} from "@/lib/hooks/use-important-date-import";

interface ImportImportantDatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportImportantDatesModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportImportantDatesModalProps) {
  const tCommon = useTranslations("common");
  const tDates = useTranslations("dates");

  const {
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
  } = useImportantDateImport(onImportComplete);

  const handleClose = () => {
    resetAll();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="import-modal-title"
      >
        <DialogHeader>
          <DialogTitle id="import-modal-title">
            {tDates("importPE3Title")}
          </DialogTitle>
          <DialogDescription>
            {tDates("importPE3Description")}
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
              {tDates("downloadPE3Template")}
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
            <h4 className="font-semibold">{tDates("calculatedDeadlines")}</h4>
            <p className="text-sm text-gray-600">
              {tDates("basedOnFirstDate").replace(
                "{date}",
                calculatedDeadlines.firstDate
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label
                  htmlFor="deadline-submit"
                  className="block text-sm font-medium mb-1"
                >
                  {tDates("deadlineSubmitLabel")}
                </label>
                <Input
                  id="deadline-submit"
                  type="date"
                  value={
                    overrideDeadlineSubmit ||
                    calculatedDeadlines.deadlineSubmit
                  }
                  onChange={(e) => setOverrideDeadlineSubmit(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {tDates("overrideOptional")}
                </p>
              </div>
              <div>
                <label
                  htmlFor="deadline-cancel"
                  className="block text-sm font-medium mb-1"
                >
                  {tDates("deadlineCancelLabel")}
                </label>
                <Input
                  id="deadline-cancel"
                  type="date"
                  value={
                    overrideDeadlineCancel ||
                    calculatedDeadlines.deadlineCancel
                  }
                  onChange={(e) => setOverrideDeadlineCancel(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {tDates("overrideOptional")}
                </p>
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
                          {row[field] === "(empty)" ||
                          row[field] === "" ||
                          !row[field] ? (
                            <span className="text-muted-foreground italic">
                              (empty)
                            </span>
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
