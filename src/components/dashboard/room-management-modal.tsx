"use client";

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
import { useTranslations } from "@/lib/i18n";
import type { Employee } from "@/lib/types/employee";
import { BedDouble, AlertTriangle } from "lucide-react";
import { useRoomManagement } from "@/lib/hooks/use-room-management";

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

  const {
    previewData,
    isLoadingPreview,
    previewError,
    selectedHotelRequired,
    isSaving,
    showRoomSummary,
    hasChanged,
    handleHotelToggle,
    handleSave,
    getMissingFieldLabels,
    toggleRoomSummary,
  } = useRoomManagement({ employee, open, onOpenChange, onSuccess });

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

            {previewData.date_room_summary.length > 0 && (
              <div className="rounded-lg border p-4">
                <button
                  type="button"
                  onClick={toggleRoomSummary}
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
