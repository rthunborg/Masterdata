'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from '@/lib/navigation';
import { t } from '@/lib/i18n';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/types/user';
import { MobileNav } from './mobile-nav';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return null;

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0">
          {/* Mobile Navigation - visible on mobile only */}
          <div className="lg:hidden shrink-0">
            <MobileNav user={user} />
          </div>
          
          <Image
            src="/images/stena-logo.png"
            alt="Stena Line"
            width={120}
            height={40}
            className="h-7 sm:h-8 md:h-10 w-auto shrink-0"
            priority
          />
          <h1 className="text-sm sm:text-base md:text-lg font-semibold hidden sm:block truncate">
            {t.common.appName}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          {/* Mobile-only user name/email display (left of logout button) */}
          <span className="text-sm text-gray-600 lg:hidden truncate max-w-[120px] sm:max-w-[150px]">
            {user.email}
          </span>
          {/* Desktop email display */}
          <span className="text-sm text-gray-600 hidden lg:inline truncate max-w-[150px]">
            {user.email}
          </span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {getRoleDisplayName(user.role)}
          </Badge>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">{t.common.signOut}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
