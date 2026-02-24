import { toast } from "sonner";

/**
 * Show an error toast from an unknown caught error.
 * Extracts the message if the error is an Error instance,
 * otherwise falls back to the provided default message.
 */
export function toastError(error: unknown, fallback: string): void {
  const message = error instanceof Error ? error.message : fallback;
  toast.error(message);
}
