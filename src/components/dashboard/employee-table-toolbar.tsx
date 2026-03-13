"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, Minimize2, Maximize2, Save, BedDouble } from "lucide-react";
import { FilterButton } from "./FilterPanel";
import { ClearFilterButton } from "./ClearFilterButton";
import { FilteredCountDisplay } from "./FilteredCountDisplay";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";
import type { Employee } from "@/lib/types/employee";

interface EmployeeTableToolbarProps {
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  isFilterActive: boolean;
  filterCount: number;
  filteredCount: number;
  totalCount: number;
  onOpenFilterPanel: () => void;
  onClearAllFilters: () => void;
  onOpenSaveFilterDialog: () => void;
  density: "default" | "compact";
  setDensity: (density: "default" | "compact") => void;
  isEffectivelyHRAdmin: boolean;
  selectedEmployeeIds: Set<string>;
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  onOpenRoomManagement: () => void;
  handleExportClick: () => void;
  handleExportCrewReady: () => void;
  eligibleCrewReadyCount: number;
}

export function EmployeeTableToolbar({
  globalFilter,
  setGlobalFilter,
  isFilterActive,
  filterCount,
  filteredCount,
  totalCount,
  onOpenFilterPanel,
  onClearAllFilters,
  onOpenSaveFilterDialog,
  density,
  setDensity,
  isEffectivelyHRAdmin,
  selectedEmployeeIds,
  employees,
  onSelectEmployee,
  onOpenRoomManagement,
  handleExportClick,
  handleExportCrewReady,
  eligibleCrewReadyCount,
}: EmployeeTableToolbarProps) {
  const t = useTranslations("tooltips");
  const tDashboard = useTranslations("dashboard");
  const tFilter = useTranslations("filter");

  return (
    <>
      <div
        className={cn(
          "flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4",
          "w-full max-w-full"
        )}
      >
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tDashboard("searchPlaceholder")}
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 pr-9"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <FilterButton
          onClick={onOpenFilterPanel}
          isActive={isFilterActive}
          filterCount={filterCount}
        />

        <ClearFilterButton onClick={onClearAllFilters} show={isFilterActive} />

        {isFilterActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSaveFilterDialog}
            aria-label={tFilter("saveCurrentFilters")}
            data-testid="save-filter-button"
          >
            <Save className="h-4 w-4 mr-2" />
            {tFilter("saveFilter")}
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setDensity(density === "compact" ? "default" : "compact")
              }
              aria-label={
                density === "compact"
                  ? t("switchToComfortable")
                  : t("switchToCompact")
              }
            >
              {density === "compact" ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {density === "compact"
                ? t("switchToComfortable")
                : t("switchToCompact")}
            </p>
          </TooltipContent>
        </Tooltip>

        {isEffectivelyHRAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedEmployeeIds.size === 1) {
                    const selectedId = Array.from(selectedEmployeeIds)[0];
                    const emp = employees.find((e) => e.id === selectedId);
                    if (emp) {
                      onSelectEmployee(emp);
                      onOpenRoomManagement();
                    }
                  }
                }}
                disabled={selectedEmployeeIds.size !== 1}
                className="whitespace-nowrap"
              >
                <BedDouble className="h-4 w-4 mr-1" />
                {tDashboard("roomManagement")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {selectedEmployeeIds.size === 1
                  ? tDashboard("roomManagementTooltip")
                  : tDashboard("roomManagementTooltipDisabled")}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportClick}
              disabled={selectedEmployeeIds.size === 0}
              className="whitespace-nowrap"
            >
              {selectedEmployeeIds.size > 0
                ? `Export Selected (${selectedEmployeeIds.size})`
                : isFilterActive
                  ? `Export Filtered (${filteredCount})`
                  : tDashboard("exportSelected") || "Export All Employees"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {selectedEmployeeIds.size === 0
                ? isFilterActive
                  ? `Export ${filteredCount} filtered employees`
                  : tDashboard("noEmployeesSelected") || "Inga anställda valda"
                : `Export ${selectedEmployeeIds.size} selected employees`}
            </p>
          </TooltipContent>
        </Tooltip>

        {isEffectivelyHRAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCrewReady}
                disabled={eligibleCrewReadyCount === 0}
                className="whitespace-nowrap"
              >
                {tDashboard("exportCrewReady")}
                {eligibleCrewReadyCount > 0 &&
                  ` (${eligibleCrewReadyCount})`}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {eligibleCrewReadyCount === 0
                  ? tDashboard("exportCrewReadyTooltipDisabled")
                  : tDashboard(
                      eligibleCrewReadyCount === 1
                        ? "exportCrewReadyTooltip"
                        : "exportCrewReadyTooltipPlural",
                      { count: eligibleCrewReadyCount }
                    )}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <FilteredCountDisplay
        filteredCount={filteredCount}
        totalCount={totalCount}
        show={isFilterActive}
        className="mb-2"
      />

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isFilterActive &&
          `${filterCount} filters active. Showing ${filteredCount} of ${totalCount} employees.`}
      </div>
    </>
  );
}
