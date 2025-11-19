'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onAddEmployee?: () => void;
  onImportCSV?: () => void;
  onQuickSearch?: () => void;
  className?: string;
}

/**
 * Floating Action Button (FAB) component for mobile dashboard
 * Story 12.6: AC 4 - FAB with menu for HR Admins
 */
export function FloatingActionButton({
  onAddEmployee,
  onImportCSV,
  onQuickSearch,
  className,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleAction = (action?: () => void) => {
    if (action) {
      action();
    }
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* Menu items - Story 12.6: AC 4 - Order: Add Employee, Import CSV, Quick Search */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 mb-2 space-y-2 animate-in fade-in-0 zoom-in-95 flex flex-col-reverse">
          {onAddEmployee && (
            <Button
              variant="default"
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
              onClick={() => handleAction(onAddEmployee)}
              aria-label="Add Employee"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          {onImportCSV && (
            <Button
              variant="default"
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
              onClick={() => handleAction(onImportCSV)}
              aria-label="Import CSV"
            >
              <Upload className="h-5 w-5" />
            </Button>
          )}
          {onQuickSearch && (
            <Button
              variant="default"
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
              onClick={() => handleAction(onQuickSearch)}
              aria-label="Quick Search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Main FAB button */}
      <Button
        variant="default"
        size="lg"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg flex items-center justify-center',
          'transition-transform duration-200',
          isOpen && 'rotate-45'
        )}
        onClick={toggleMenu}
        aria-label={isOpen ? 'Close menu' : 'Open quick actions menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}

