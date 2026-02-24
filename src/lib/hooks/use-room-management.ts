import { useState, useCallback, useEffect } from "react";
import { employeeService } from "@/lib/services/employee-service";
import { toast } from "sonner";
import { toastError } from "@/lib/utils/toast-helpers";
import { useTranslations } from "@/lib/i18n";
import type { Employee } from "@/lib/types/employee";

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

export type { RoomPreviewData };

interface UseRoomManagementOptions {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function useRoomManagement({
  employee,
  open,
  onOpenChange,
  onSuccess,
}: UseRoomManagementOptions) {
  const t = useTranslations("modals");

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

  const handleHotelToggle = useCallback((value: boolean) => {
    setSelectedHotelRequired(value);
    if (employee) {
      fetchPreview(employee.id, value);
    }
  }, [employee, fetchPreview]);

  const handleSave = useCallback(async () => {
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
      toastError(error, t("roomManagement.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [employee, hasChanged, selectedHotelRequired, previewData, t, onSuccess, onOpenChange]);

  const getMissingFieldLabels = useCallback((fields: string[]): string => {
    return fields
      .map((f) => {
        if (f === "omc_date") return t("roomManagement.missingOmcDate");
        if (f === "rank") return t("roomManagement.missingRank");
        return f;
      })
      .join(", ");
  }, [t]);

  const toggleRoomSummary = useCallback(() => {
    setShowRoomSummary((prev) => !prev);
  }, []);

  return {
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
  };
}
