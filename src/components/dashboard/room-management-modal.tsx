"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n";
import { employeeService } from "@/lib/services/employee-service";
import type { Employee } from "@/lib/types/employee";
import { BedDouble, AlertTriangle } from "lucide-react";

interface RoomPreviewData {
  current_hotel_required: boolean;
  current_room_number: number | null;
  preview_hotel_required: boolean;
  preview_room_number: number | null;
  sharing_with: { name: string; rank: string; gender: string } | null;
  date_label: string | null;
  date_room_summary: Array<{
    room_number: number;
    occupants: Array<{ name: string; rank: string; gender: string }>;
  }>;
  missing_requirements: string[];
  employee_name: string;
  employee_rank: string | null;
  employee_gender: string | null;
}

interface RoomManagementModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RoomManagementModal({
  employee,
  open,
  onOpenChange,
  onSuccess,
}: RoomManagementModalProps) {
  const t = useTranslations("modals");
  const tCommon = useTranslations("common");

  const [previewData, setPreviewData] = useState<RoomPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedHotelRequired, setSelectedHotelRequired] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRoomSummary, setShowRoomSummary] = useState(false);

  const hasChanged = previewData != null && selectedHotelRequired !== previewData.current_hotel_required;

  const fetchPreview = useCallback(async (employeeId: string, hotelRequired: boolean) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const response = await fetch(
        `/api/employees/${employeeId}/room-preview?hotel_required=${hotelRequired}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || t("roomManagement.previewFailed"));
      }
      const result = await response.json();
      setPreviewData(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("roomManagement.previewFailed");
      setPreviewError(message);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [t]);

  useEffect(() => {
    if (open && employee) {
      setShowRoomSummary(false);
      const initial = employee.hotel_required ?? false;
      setSelectedHotelRequired(initial);
      fetchPreview(employee.id, initial);
    } else {
      setPreviewData(null);
      setPreviewError(null);
    }
  }, [open, employee, fetchPreview]);

  const handleHotelToggle = (value: boolean) => {
    setSelectedHotelRequired(value);
    if (employee) {
      fetchPreview(employee.id, value);
    }
  };

  const handleSave = async () => {
    if (!employee || !hasChanged) return;

    setIsSaving(true);
    try {
      await employeeService.update(employee.id, {
        hotel_required: selectedHotelRequired,
      });

      const name = `${employee.first_name} ${employee.surname}`;
      if (selectedHotelRequired && previewData?.preview_room_number) {
        toast.success(
          t("roomManagement.saveSuccessRoomAssigned", {
            number: previewData.preview_room_number,
            name,
          })
        );
      } else if (!selectedHotelRequired) {
        toast.success(t("roomManagement.saveSuccessRoomCleared", { name }));
      } else {
        toast.success(t("roomManagement.saveSuccess", { name }));
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("roomManagement.saveFailed");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const getMissingFieldLabels = (fields: string[]): string => {
    return fields
      .map((f) => {
        if (f === "omc_date") return t("roomManagement.missingOmcDate");
        if (f === "rank") return t("roomManagement.missingRank");
        return f;
      })
      .join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            {t("roomManagement.title")}
          </DialogTitle>
          <DialogDescription>
            {t("roomManagement.description")}
          </DialogDescription>
        </DialogHeader>

        {isLoadingPreview && !previewData ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : previewError && !previewData ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 my-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">{previewError}</p>
            </div>
          </div>
        ) : previewData ? (
          <div className="space-y-4 py-2">
            {/* Employee details */}
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">{t("roomManagement.employeeDetails")}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("roomManagement.name")}</span>
                  <span className="ml-2">{previewData.employee_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("roomManagement.rank")}</span>
                  <span className="ml-2">{previewData.employee_rank || t("roomManagement.notAvailable")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("roomManagement.gender")}</span>
                  <span className="ml-2">{previewData.employee_gender || t("roomManagement.notAvailable")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("roomManagement.omcDate")}</span>
                  <span className="ml-2">{previewData.date_label || t("roomManagement.noOmcDate")}</span>
                </div>
              </div>
            </div>

            {/* Current status */}
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">{t("roomManagement.currentStatus")}</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("roomManagement.hotelRequired")}</span>
                <span className={`font-medium ${previewData.current_hotel_required ? "text-green-700" : "text-gray-500"}`}>
                  {previewData.current_hotel_required ? tCommon("yes") : tCommon("no")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">{t("roomManagement.currentRoom")}</span>
                <span className="font-medium">
                  {previewData.current_room_number != null
                    ? t("roomManagement.room", { number: previewData.current_room_number })
                    : t("roomManagement.noRoomAssigned")}
                </span>
              </div>
            </div>

            {/* Hotel toggle */}
            <div className="rounded-lg border p-4">
              <Label className="font-medium">{t("roomManagement.changeHotelStatus")}</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={selectedHotelRequired ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleHotelToggle(true)}
                  disabled={isSaving}
                >
                  {t("roomManagement.setHotelYes")}
                </Button>
                <Button
                  type="button"
                  variant={!selectedHotelRequired ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleHotelToggle(false)}
                  disabled={isSaving}
                >
                  {t("roomManagement.setHotelNo")}
                </Button>
              </div>
            </div>

            {/* Preview */}
            {hasChanged && (
              <div className={`rounded-lg border p-4 ${
                selectedHotelRequired
                  ? previewData.missing_requirements.length > 0
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-green-300 bg-green-50"
                  : "border-blue-300 bg-blue-50"
              }`}>
                <h4 className="font-medium mb-1 text-sm">{t("roomManagement.preview")}</h4>
                {isLoadingPreview ? (
                  <Skeleton className="h-4 w-2/3" />
                ) : selectedHotelRequired ? (
                  previewData.missing_requirements.length > 0 ? (
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <p className="text-sm">
                        {t("roomManagement.missingRequirements", {
                          fields: getMissingFieldLabels(previewData.missing_requirements),
                        })}
                      </p>
                    </div>
                  ) : previewData.sharing_with ? (
                    <p className="text-sm text-green-800">
                      {t("roomManagement.previewRoomShared", {
                        number: previewData.preview_room_number ?? 0,
                        name: previewData.sharing_with.name,
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-green-800">
                      {t("roomManagement.previewRoomAssignment", {
                        number: previewData.preview_room_number ?? 0,
                      })}
                    </p>
                  )
                ) : (
                  <p className="text-sm text-blue-800">
                    {t("roomManagement.previewRoomCleared")}
                  </p>
                )}
              </div>
            )}

            {!hasChanged && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-600">{t("roomManagement.previewNoChange")}</p>
              </div>
            )}

            {/* Collapsible room summary for the date */}
            {previewData.date_room_summary.length > 0 && (
              <div className="rounded-lg border p-4">
                <button
                  type="button"
                  onClick={() => setShowRoomSummary(!showRoomSummary)}
                  className="flex items-center justify-between w-full text-sm font-medium text-left"
                >
                  <span>{t("roomManagement.dateRoomSummary")}</span>
                  <span className="text-muted-foreground text-xs">{showRoomSummary ? "▲" : "▼"}</span>
                </button>
                {showRoomSummary && (
                  <div className="mt-2 space-y-2">
                    {previewData.date_room_summary.map((room) => (
                      <div key={room.room_number} className="flex items-start gap-2 text-sm">
                        <span className="font-medium whitespace-nowrap min-w-[60px]">
                          {t("roomManagement.roomLabel", { number: room.room_number })}
                        </span>
                        <span className="text-muted-foreground">
                          {room.occupants.map((o) => `${o.name} (${o.rank})`).join(", ")}
                          {" — "}
                          {room.occupants.length === 1
                            ? t("roomManagement.privateRoom")
                            : t("roomManagement.sharedRoom")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanged || (selectedHotelRequired && (previewData?.missing_requirements?.length ?? 0) > 0)}
          >
            {isSaving ? t("roomManagement.saving") : t("roomManagement.saveButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
