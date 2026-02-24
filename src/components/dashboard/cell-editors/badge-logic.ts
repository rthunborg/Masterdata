import { getOneFieldStatus, getRemainingTime } from "@/lib/services/one-field-status";

interface BadgeResult {
  status: 'green' | 'yellow' | null;
  tooltip: string | null;
}

export function calculateBadge(
  field: string,
  type: string,
  value: string | number | boolean | null,
  oneMarkedAt: string | null | undefined,
  isLoneivaField: boolean,
): BadgeResult {
  let status: 'green' | 'yellow' | null = null;
  let tooltip: string | null = null;

  if (type === "boolean" && field.toLowerCase() === 'one' && value === true) {
    status = getOneFieldStatus(value as boolean, oneMarkedAt ? new Date(oneMarkedAt) : null);
    if (status === 'yellow' && oneMarkedAt) {
      tooltip = `Pending - Will be ready in ${getRemainingTime(new Date(oneMarkedAt))}`;
    } else if (status === 'green') {
      tooltip = 'Complete - Ready for editing';
    }
  } else if (type === "boolean" && value === true) {
    status = 'green';
  } else if (isLoneivaField && value !== null && value !== undefined) {
    status = 'green';
  }

  return { status, tooltip };
}
