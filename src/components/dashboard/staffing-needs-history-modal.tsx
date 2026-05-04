"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "@/lib/i18n";
import type {
  StaffingNeedsChangelogEntry,
  StaffingLocation,
} from "@/lib/types/staffing-needs";

interface StaffingNeedsHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: StaffingLocation | null;
}

function formatChangeDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StaffingNeedsHistoryModal({
  open,
  onOpenChange,
  location,
}: StaffingNeedsHistoryModalProps) {
  const [entries, setEntries] = React.useState<StaffingNeedsChangelogEntry[]>(
    []
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (!open || !location) return;

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setEntries([]);

    fetch(
      `/api/staffing-needs/history?location=${encodeURIComponent(location)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
      .then(
        (json: { data: StaffingNeedsChangelogEntry[] }) => {
          if (!cancelled) setEntries(json.data);
        }
      )
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, location]);

  const t = useTranslations("staffingNeeds");

  if (!location) return null;

  const currentYear = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("historyModalTitle", { location })}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("historyModalTitle", { location })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div
            className="flex items-center justify-center py-8"
            data-testid="history-loading"
          >
            <span className="text-sm text-muted-foreground">{t("loading")}</span>
          </div>
        ) : hasError ? (
          <div
            className="flex items-center justify-center py-8"
            data-testid="history-error"
          >
            <span className="text-sm text-destructive">
              {t("fetchError")}
            </span>
          </div>
        ) : entries.length === 0 ? (
          <div
            className="flex items-center justify-center py-8"
            data-testid="history-empty"
          >
            <span className="text-sm text-muted-foreground">
              {t("noChangesInYear", { year: String(currentYear) })}
            </span>
          </div>
        ) : (
          <ul
            className="max-h-[50vh] space-y-2 overflow-y-auto"
            data-testid="history-list"
          >
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <span className="tabular-nums">
                  {formatChangeDate(entry.changed_at)}
                </span>
                <span className="text-muted-foreground"> — </span>
                <span>{entry.changed_by_email}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium tabular-nums">
                  {entry.old_value} → {entry.new_value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
