"use client";

import { useUIStore } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/button";
import { getRoleDisplayName } from "@/lib/types/user";
import { AlertCircle, X } from "lucide-react";

/**
 * Role Preview Banner Component
 * 
 * Displays a prominent banner when HR Admin is previewing a role.
 * Shows the current preview role and provides an "Exit Preview" button.
 * 
 * AC: 3, 7
 * - Visual banner with role name and "Preview Mode" indicator
 * - Sticky positioning at top of viewport
 * - Prominent "Exit Preview" button
 * - ARIA live region for accessibility
 */
export function RolePreviewBanner() {
  const { previewRole, setPreviewRole, isPreviewMode } = useUIStore();

  // Only render when in preview mode
  if (!isPreviewMode || !previewRole) return null;

  return (
    <div
      className="sticky top-0 z-50 bg-yellow-100 border-b border-yellow-300 px-4 py-3 flex items-center justify-between shadow-sm"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-700 shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-semibold text-yellow-900">
            👁️ Viewing as {getRoleDisplayName(previewRole)} - Preview Mode
          </span>
          <span className="text-xs text-yellow-700">
            Editing is disabled. You can test search, filter, and sort.
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPreviewRole(null)}
        className="bg-white hover:bg-yellow-50 border-yellow-400 text-yellow-900 hover:text-yellow-950 flex items-center gap-2 shrink-0"
        aria-label="Exit preview mode"
      >
        <X className="h-4 w-4" />
        Exit Preview
      </Button>
    </div>
  );
}
