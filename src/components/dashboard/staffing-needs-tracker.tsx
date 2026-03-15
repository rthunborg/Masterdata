"use client";

import * as React from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { canEditStaffingNeeds } from "@/lib/utils/role-utils";
import { StaffingNeedsCard } from "@/components/dashboard/staffing-needs-card";
import { EditStaffingNeedsModal } from "@/components/dashboard/edit-staffing-needs-modal";
import { StaffingNeedsHistoryModal } from "@/components/dashboard/staffing-needs-history-modal";
import { STAFFING_LOCATIONS } from "@/lib/types/staffing-needs";
import type {
  StaffingNeedWithProgress,
  StaffingLocation,
} from "@/lib/types/staffing-needs";
import { UserRole } from "@/lib/types/user";

interface StaffingNeedsTrackerProps {
  refreshToken?: number;
}

const emptyProgress = (location: StaffingLocation): StaffingNeedWithProgress => ({
  id: "",
  location,
  headcount_need: 0,
  updated_at: "",
  updated_by: null,
  crewReadyCount: 0,
  crewReadyPercentage: 0,
  last_change: null,
});

export function StaffingNeedsTracker({ refreshToken = 0 }: StaffingNeedsTrackerProps) {
  const { user } = useAuth();
  const [data, setData] = React.useState<StaffingNeedWithProgress[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyLocation, setHistoryLocation] = React.useState<StaffingLocation | null>(null);
  const [internalRefresh, setInternalRefresh] = React.useState(0);

  const role = (user?.role as UserRole) ?? UserRole.RECRUITER;
  const canEdit = canEditStaffingNeeds(role);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const res = await fetch("/api/staffing-needs");
        if (!res.ok) throw new Error("Misslyckades att ladda bemanningsbehov");
        const json = (await res.json()) as { data: StaffingNeedWithProgress[] };
        if (!cancelled) setData(json.data ?? []);
      } catch (err) {
        console.error("[StaffingNeedsTracker] Failed to load staffing needs:", err);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, internalRefresh]);

  return (
    <>
      {STAFFING_LOCATIONS.map((location) => {
        const item = data.find((d) => d.location === location) ?? emptyProgress(location);
        return (
          <StaffingNeedsCard
            key={location}
            location={location}
            crewReadyCount={item.crewReadyCount}
            headcount_need={item.headcount_need}
            crewReadyPercentage={item.crewReadyPercentage}
            lastChange={item.last_change}
            canEdit={canEdit}
            isLoading={isLoading}
            hasError={hasError}
            onEditClick={() => setEditModalOpen(true)}
            onCardClick={() => {
              setHistoryLocation(location);
              setHistoryOpen(true);
            }}
          />
        );
      })}
      <StaffingNeedsHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        location={historyLocation}
      />
      <EditStaffingNeedsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        currentNeeds={data}
        onSuccess={() => setInternalRefresh((n) => n + 1)}
      />
    </>
  );
}
