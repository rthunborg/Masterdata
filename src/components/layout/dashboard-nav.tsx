'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { canManageSettings, canManageEmployees, UserRole } from '@/lib/types/user';
import { t } from '@/lib/i18n';

export function DashboardNav() {
  const { user } = useAuth();

  if (!user) return null;

  const showAdminTabs = canManageSettings(user.role as UserRole);
  const showImportantDates = canManageEmployees(user.role as UserRole);

  return (
    <nav className="bg-gray-100 border-b hidden lg:block">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          <Link
            href="/dashboard"
            className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >
            {t.navigation.employees}
          </Link>

          {showImportantDates && (
            <Link
              href="/dashboard/important-dates"
              className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              {t.navigation.importantDates}
            </Link>
          )}

          {showAdminTabs && (
            <>
              <Link
                href="/dashboard/admin/users"
                className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
              >
                {t.admin.userManagement}
              </Link>
              <Link
                href="/dashboard/admin/columns"
                className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
              >
                {t.admin.columnSettings}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
