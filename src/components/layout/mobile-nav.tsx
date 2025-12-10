"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Home, Calendar, Users, Settings } from "lucide-react";
import { useState } from "react";
import { SessionUser, canManageSettings, canManageEmployees, UserRole } from "@/lib/types/user";
import Image from "next/image";
import { t } from "@/lib/i18n";

interface MobileNavProps {
  user: SessionUser;
  className?: string;
}

export function MobileNav({ user, className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  
  // Determine permissions
  const showAdminTabs = canManageSettings(user.role as UserRole);
  const showImportantDates = canManageEmployees(user.role as UserRole); // HR Admin & Recruiter

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
      show: showImportantDates,
    },
    {
      href: '/dashboard/admin/users',
      label: t.admin.userManagement,
      icon: Users,
      show: showAdminTabs,
    },
    {
      href: '/dashboard/admin/columns',
      label: t.admin.columnSettings,
      icon: Settings,
      show: showAdminTabs,
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
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle className="flex flex-col items-center gap-2">
            <Image
              src="/images/stena-logo.png"
              alt="Stena Line"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
            <span className="text-base font-semibold text-center">
              Säsongsrekrytering 2026
            </span>
          </SheetTitle>
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
