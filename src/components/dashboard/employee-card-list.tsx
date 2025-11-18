'use client';

import { EmployeeCard } from './employee-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useMediaQuery } from '@/hooks/use-media-query';
import { toast } from 'sonner';
import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';

interface EmployeeCardListProps {
  employees: Employee[];
  isLoading: boolean;
  isHRAdmin: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onArchive?: (employee: Employee) => void;
  onUnarchive?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  columnConfigs?: ColumnConfig[];
  onEmployeeUpdated?: () => void | Promise<void>;
}

export function EmployeeCardList({
  employees,
  isLoading,
  isHRAdmin,
  searchValue,
  onSearchChange,
  onArchive,
  onUnarchive,
  onTerminate,
  onEdit,
  columnConfigs = [],
  onEmployeeUpdated,
}: EmployeeCardListProps) {
  // Only enable pull-to-refresh on mobile devices (< 1024px)
  const isMobile = useMediaQuery('(max-width: 1023px)');

  // Handle refresh callback
  const handleRefresh = useCallback(async () => {
    if (!onEmployeeUpdated) {
      return;
    }
    
    // Call the refetch function and await it if it returns a Promise
    const result = onEmployeeUpdated();
    if (result instanceof Promise) {
      await result;
    }
  }, [onEmployeeUpdated]);

  // Pull-to-refresh hook
  const threshold = 80;
  const {
    isPulling,
    pullDistance,
    shouldRefresh,
    isRefreshing,
    handlers,
    containerRef,
  } = usePullToRefresh({
    threshold,
    enabled: isMobile,
    onRefresh: handleRefresh,
    onRefreshComplete: () => {
      toast.success('Data refreshed successfully');
    },
    onRefreshError: (error) => {
      toast.error('Unable to refresh. Please check your connection and try again.', {
        description: error.message,
      });
    },
  });

  // Virtual scrolling setup (Story 12.5: Performance optimization)
  // Must be after usePullToRefresh to access containerRef
  const shouldUseVirtualScrolling = employees.length > 100;
  
  const virtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 200, // Estimated card height in pixels
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
    enabled: shouldUseVirtualScrolling,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  // Calculate pull percentage for visual feedback (0-100%)
  const pullPercentage = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div className="space-y-4 p-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search employees..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Pull-to-refresh container */}
      <div
        ref={containerRef}
        {...handlers}
        className="relative overflow-y-auto"
        style={{
          maxHeight: 'calc(100vh - 200px)',
        }}
      >
        {/* Pull-to-refresh indicator */}
        {(isPulling || isRefreshing) && (
          <div
            role="status"
            aria-live="polite"
            aria-label={isRefreshing ? "Refreshing employee data" : "Pull to refresh"}
            className={cn(
              'flex items-center justify-center transition-all duration-200',
              'absolute left-0 right-0 z-10'
            )}
            style={{
              height: `${Math.max(pullDistance, 60)}px`,
              transform: `translateY(${Math.min(pullDistance - 60, 0)}px)`,
            }}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              {isRefreshing ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Refreshing...</span>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-colors',
                      shouldRefresh
                        ? 'border-primary bg-primary/10'
                        : 'border-muted-foreground/30'
                    )}
                    style={{
                      transform: `rotate(${pullPercentage * 3.6}deg)`,
                    }}
                  >
                    <div
                      className={cn(
                        'h-full w-full rounded-full transition-all',
                        shouldRefresh ? 'bg-primary/20' : 'bg-transparent'
                      )}
                      style={{
                        clipPath: `inset(0 ${100 - pullPercentage}% 0 0)`,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs transition-colors',
                      shouldRefresh
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {shouldRefresh ? 'Release to refresh' : 'Pull to refresh'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Employee cards */}
        {employees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No employees found
          </div>
        ) : shouldUseVirtualScrolling ? (
          // Virtual scrolling for large lists (Story 12.5: Performance optimization)
          <div
            style={{
              transform: isPulling && !isRefreshing
                ? `translateY(${Math.min(pullDistance, threshold)}px)`
                : 'translateY(0)',
              transition: isPulling ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const employee = employees[virtualItem.index];
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="pb-3">
                      <EmployeeCard
                        employee={employee}
                        isHRAdmin={isHRAdmin}
                        onArchive={onArchive}
                        onUnarchive={onUnarchive}
                        onTerminate={onTerminate}
                        onEdit={onEdit}
                        columnConfigs={columnConfigs}
                        onEmployeeUpdated={onEmployeeUpdated}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Regular rendering for smaller lists
          <div
            className="space-y-3"
            style={{
              transform: isPulling && !isRefreshing
                ? `translateY(${Math.min(pullDistance, threshold)}px)`
                : 'translateY(0)',
              transition: isPulling ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                isHRAdmin={isHRAdmin}
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                onTerminate={onTerminate}
                onEdit={onEdit}
                columnConfigs={columnConfigs}
                onEmployeeUpdated={onEmployeeUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
