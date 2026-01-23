import { getUserFromSession } from "@/lib/server/auth";
import { Link, redirect } from "@/lib/navigation";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/header";
import { canManageSettings, canManageEmployees, UserRole } from "@/lib/types/user";
import { t } from "@/lib/i18n";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();

  if (!user) {
    redirect("/login");
    return null; // TypeScript guard - this line is never reached due to redirect
  }

  // Determine permissions
  const showAdminTabs = canManageSettings(user.role as UserRole);
  const showImportantDates = canManageEmployees(user.role as UserRole); // HR Admin & Recruiter

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />
      
      {/* Navigation - hidden on mobile, visible on desktop */}
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
            
            {/* Admin tabs only for HR Superusers */}
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

      <main className="w-full py-6 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        {children}
      </main>

      {/* Sonner Toast Container */}
      <Toaster 
        position="bottom-right" 
        richColors 
        closeButton 
        duration={5000}
        toastOptions={{
          style: {
            background: 'white',
            color: 'black',
            border: '1px solid #e5e7eb',
          },
        }}
      />
    </div>
  );
}
