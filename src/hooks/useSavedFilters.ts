"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  SavedFilter,
  CreateSavedFilterRequest,
  GetSavedFiltersResponse,
  CreateSavedFilterResponse,
  DeleteSavedFilterResponse,
} from "@/lib/types/saved-filter";
import type { FilterState } from "@/lib/types/filter";

/**
 * React Query hook for managing saved filters
 * Story 20.6: Saved Filters
 */
export function useSavedFilters() {
  const queryClient = useQueryClient();

  // Fetch saved filters
  const {
    data: savedFilters = [],
    isLoading,
    error,
  } = useQuery<SavedFilter[]>({
    queryKey: ["user_filters"],
    queryFn: async () => {
      const response = await fetch("/api/users/filters");
      if (!response.ok) {
        throw new Error("Misslyckades att hämta filter.");
      }
      const json: GetSavedFiltersResponse = await response.json();
      return json.data;
    },
  });

  // Save filter mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      name,
      filters,
    }: {
      name: string;
      filters: FilterState[];
    }) => {
      const body: CreateSavedFilterRequest = { name, filters };
      const response = await fetch("/api/users/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Misslyckades att spara filter.");
      }

      const json: CreateSavedFilterResponse = await response.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_filters"] });
      toast.success("Filter sparat!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete filter mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/filters/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Misslyckades att ta bort filter.");
      }

      const json: DeleteSavedFilterResponse = await response.json();
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_filters"] });
      toast.success("Filter borttaget!");
    },
    onError: () => {
      toast.error("Misslyckades att ta bort filter.");
    },
  });

  return {
    savedFilters,
    isLoading,
    error,
    saveFilter: saveMutation.mutateAsync,
    deleteFilter: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
