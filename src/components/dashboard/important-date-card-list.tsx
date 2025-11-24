'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import type { ImportantDate } from '@/lib/types/important-date';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { importantDateService } from '@/lib/services/important-date-service';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/i18n';
import { getDeadlineStatus } from '@/lib/utils/deadline-validator';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ImportantDateCardListProps {
  dates: ImportantDate[];
  isLoading: boolean;
  isHRAdmin: boolean;
  onDateDeleted?: () => void;
}

export function ImportantDateCardList({
  dates,
  isLoading,
  isHRAdmin,
  onDateDeleted,
}: ImportantDateCardListProps) {
  const tToasts = useTranslations('toasts');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<ImportantDate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const uniqueCategories = Array.from(new Set(dates.map((d) => d.category)));

  const filteredDates =
    categoryFilter === 'All'
      ? dates
      : dates.filter((d) => d.category === categoryFilter);

  // Sort by year and week
  const sortedDates = [...filteredDates].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const aWeek = a.week_number ?? 0;
    const bWeek = b.week_number ?? 0;
    return aWeek - bWeek;
  });

  const handleDelete = (date: ImportantDate) => {
    setSelectedDate(date);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDate) return;

    try {
      setIsDeleting(true);
      await importantDateService.delete(selectedDate.id);
      toast.success(tToasts('dates.dateDeleted'));
      setDeleteDialogOpen(false);
      onDateDeleted?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tToasts('dates.deleteFailed');
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCardExpansion = (dateId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(dateId)) {
        next.delete(dateId);
      } else {
        next.add(dateId);
      }
      return next;
    });
  };

  const isCardExpanded = (dateId: string) => expandedCards.has(dateId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Category:</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px] h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Cards */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No dates found</div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((date) => {
            const expanded = isCardExpanded(date.id);
            const assignedCount = date.assigned_employees?.length || 0;
            const availableSpots = `${assignedCount}/${date.max_spots}`;
            
            return (
              <Card key={date.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Category as first field */}
                      <Badge variant="secondary" className="mb-2">
                        {date.category}
                      </Badge>
                      <h3 className="text-lg font-semibold">{date.date_description}</h3>
                    </div>
                    {/* "Less" button in header when expanded on mobile */}
                    {isMobile && expanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCardExpansion(date.id)}
                        className="gap-1 touch-manipulation shrink-0"
                        aria-label={`Collapse details for ${date.date_description}`}
                      >
                        Less <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 text-sm">
                  {/* Always visible: Week number and available spots */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {date.week_number ? `Week ${date.week_number}` : 'No week'}
                      </span>
                    </div>
                    <span className="font-medium">
                      {availableSpots}
                    </span>
                  </div>

                  {/* Expanded section: Additional details */}
                  {(expanded || !isMobile) && (
                    <>
                      {date.date_value && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">{date.date_value}</span>
                        </div>
                      )}
                      {/* Story 8.11: Deadline display */}
                      {date.deadline_submit && (
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Inlämningsdeadline:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(new Date(date.deadline_submit + 'T00:00:00'), 'd MMM yyyy', { locale: sv })}
                            </span>
                            {getDeadlineStatus(date.deadline_submit, date.deadline_cancel) === 'submit_closed' && (
                              <Badge variant="destructive" className="text-xs">Stängd</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {date.deadline_cancel && (
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Avbokningsdeadline:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(new Date(date.deadline_cancel + 'T00:00:00'), 'd MMM yyyy', { locale: sv })}
                            </span>
                            {getDeadlineStatus(date.deadline_submit, date.deadline_cancel) === 'cancel_closed' && (
                              <Badge variant="destructive" className="text-xs">Stängd</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {date.notes && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground">Notes:</span>
                          <p className="mt-1 text-sm">{date.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>

                <CardFooter className="flex justify-between pt-3">
                  {/* More/Less button - only show on mobile */}
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => toggleCardExpansion(date.id)}
                      className="gap-2 touch-manipulation"
                      aria-label={expanded ? `Collapse details for ${date.date_description}` : `Expand details for ${date.date_description}`}
                      aria-expanded={expanded}
                    >
                      {expanded ? (
                        <>
                          Less <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          More <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Delete button - only for HR admins */}
                  {isHRAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(date)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Important Date</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{selectedDate?.date_description}&rdquo;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
