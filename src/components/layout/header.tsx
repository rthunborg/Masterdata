'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/types/user';

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
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">HR Masterdata</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden md:inline">
            {user.email}
          </span>
          <Badge variant="secondary">
            {getRoleDisplayName(user.role)}
          </Badge>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
