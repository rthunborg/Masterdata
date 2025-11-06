'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, UserCheck, UserX, Trash2 } from 'lucide-react';
import type { User } from '@/lib/types/user';
import { getRoleDisplayName } from '@/lib/types/user';
import { useFormatter } from '@/lib/i18n';

interface UserCardProps {
  user: User;
  currentUserId: string;
  onActivate?: (user: User) => void;
  onDeactivate?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UserCard({
  user,
  currentUserId,
  onActivate,
  onDeactivate,
  onDelete,
}: UserCardProps) {
  const format = useFormatter();
  const isCurrentUser = user.id === currentUserId;

  const getStatusBadge = () => {
    if (user.is_active) {
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{user.email}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {getRoleDisplayName(user.role)}
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="hidden md:block h-4 w-4" />
          <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
            {user.email}
          </a>
        </div>

        <div className="pt-2 space-y-2 border-t">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {format.dateTime(new Date(user.created_at), {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          {user.last_active_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Active:</span>
              <span className="font-medium">
                {format.dateTime(new Date(user.last_active_at), {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {!isCurrentUser && (
        <CardFooter className="flex gap-2 pt-3">
          {user.is_active ? (
            <Button
              variant="outline"
              size="default"
              onClick={() => onDeactivate?.(user)}
              className="flex-1 gap-2 touch-manipulation"
            >
              <UserX className="h-4 w-4" />
              <span className="hidden sm:inline">Deactivate</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="default"
              onClick={() => onActivate?.(user)}
              className="flex-1 gap-2 touch-manipulation"
            >
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Activate</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="default"
            onClick={() => onDelete?.(user)}
            className="gap-2 touch-manipulation"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
