"use client";

import { useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { NotificationMetadata } from "@/lib/types/notifications";
import {
  formatNotification,
  formatBatchedNotification,
} from "@/lib/utils/change-detection";

const BATCH_DELAY_MS = 200;

/**
 * Batches real-time notifications so multiple rapid changes are
 * shown as a single toast instead of one per event.
 *
 * Returns `addNotification` to enqueue a new notification.
 * The batch is automatically flushed after BATCH_DELAY_MS of inactivity
 * or on unmount.
 */
export function useNotificationBatch() {
  const batchRef = useRef<NotificationMetadata[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (batchRef.current.length === 0) return;

    const batch = [...batchRef.current];
    batchRef.current = [];

    if (batch.length === 1) {
      toast.info(formatNotification(batch[0]), {
        duration: 5000,
        action: batch[0].employeeId
          ? {
              label: "View",
              onClick: () => {
                const event = new CustomEvent("scrollToEmployee", {
                  detail: { employeeId: batch[0].employeeId },
                });
                window.dispatchEvent(event);
              },
            }
          : undefined,
      });
    } else {
      toast.info(formatBatchedNotification(batch), {
        duration: 5000,
      });
    }
  }, []);

  const addNotification = useCallback(
    (notification: NotificationMetadata) => {
      batchRef.current.push(notification);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(flush, BATCH_DELAY_MS);
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (batchRef.current.length > 0) flush();
    };
  }, [flush]);

  return { addNotification };
}
