interface StatusBadgeProps {
  status: 'green' | 'yellow' | null;
  label?: string;
}

/**
 * StatusBadge Component
 * 
 * Displays a colored badge with an icon to indicate completion status.
 * Used for boolean fields in the employee table to provide visual feedback.
 * 
 * @param status - Badge color state: 'green' for completed, 'yellow' for pending, null for no badge
 * @param label - Optional accessibility label (defaults based on status)
 * 
 * @returns Badge component or null if status is null
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  if (!status) return null;

  const styles = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };

  const ariaLabels = {
    green: 'Completed',
    yellow: 'Pending'
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium status-badge ${styles[status]}`}
      aria-label={label || ariaLabels[status]}
    >
      {status === 'green' ? '✓' : '⚠'}
    </span>
  );
}
