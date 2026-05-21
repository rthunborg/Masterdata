'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Archive, Eye, Phone } from 'lucide-react';
import type { Employee } from '@/lib/types/employee';
import { cn } from '@/lib/utils';

interface EmployeeContextMenuProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number } | null;
  onEdit?: (employee: Employee) => void;
  onArchive?: (employee: Employee) => void;
  onViewDetails?: (employee: Employee) => void;
  onCall?: (phoneNumber: string) => void;
}

export function EmployeeContextMenu({
  employee,
  isOpen,
  onClose,
  position,
  onEdit,
  onArchive,
  onViewDetails,
  onCall,
}: EmployeeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate close on the touch event that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  // Calculate menu position (prefer right side, adjust if near edge)
  const menuWidth = 224; // w-56 = 224px
  const menuHeight = 200; // approximate
  const padding = 8;

  let left = position.x + padding;
  let top = position.y + padding;

  // Adjust if too close to right edge
  if (left + menuWidth > window.innerWidth) {
    left = position.x - menuWidth - padding;
  }

  // Adjust if too close to bottom edge
  if (top + menuHeight > window.innerHeight) {
    top = position.y - menuHeight - padding;
  }

  // Ensure menu stays within viewport
  left = Math.max(padding, Math.min(left, window.innerWidth - menuWidth - padding));
  top = Math.max(padding, Math.min(top, window.innerHeight - menuHeight - padding));

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Employee quick actions"
      className={cn(
        'fixed z-50 w-56 rounded-md border bg-popover p-2 shadow-lg',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      <div className="space-y-1">
        {onViewDetails && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => handleAction(() => onViewDetails(employee))}
          >
            <Eye className="h-4 w-4" />
            View Details
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => handleAction(() => onEdit(employee))}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
        {onArchive && !employee.is_archived && !employee.is_terminated && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => handleAction(() => onArchive(employee))}
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        )}
        {onCall && employee.mobile && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => handleAction(() => onCall(employee.mobile!))}
          >
            <Phone className="h-4 w-4" />
            Call
          </Button>
        )}
      </div>
    </div>
  );
}

