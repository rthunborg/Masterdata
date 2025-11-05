'use client';

import { useState } from 'react';
import { Menu, Home, Calendar, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Link } from '@/lib/navigation';
import { t } from '@/lib/i18n';
import type { SessionUser } from '@/lib/types/user';

interface MobileNavProps {
  user: SessionUser;
  className?: string;
}

export function MobileNav({ user, className }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const navigationItems = [
    {
      href: '/dashboard',
      label: t.navigation.employees,
      icon: Home,
      show: true,
    },
    {
      href: '/dashboard/important-dates',
      label: t.navigation.importantDates,
      icon: Calendar,
      show: user.role === 'hr_admin',
    },
    {
      href: '/dashboard/admin/users',
      label: t.admin.userManagement,
      icon: Users,
      show: user.role === 'hr_admin',
    },
    {
      href: '/dashboard/admin/columns',
      label: t.admin.columnSettings,
      icon: Settings,
      show: user.role === 'hr_admin',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 mt-6">
          {navigationItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-4 min-h-12 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
