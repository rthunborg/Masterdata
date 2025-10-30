import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/server/auth";
import Link from "next/link";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/header";
import { getTranslations } from "next-intl/server";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const user = await getUserFromSession();

  if (!user) {
    redirect("/login");
  }

  const { locale } = await params;
  const t = await getTranslations({ locale: locale, namespace: 'navigation' });
  const tAdmin = await getTranslations({ locale: locale, namespace: 'admin' });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Navigation */}
      <nav className="bg-gray-100 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              {t('employees')}
            </Link>
            <Link
              href="/dashboard/important-dates"
              className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              {t('importantDates')}
            </Link>
            {user.role === "hr_admin" && (
              <Link
                href="/dashboard/admin/users"
                className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
              >
                {tAdmin('userManagement')}
              </Link>
            )}
            {user.role === "hr_admin" && (
              <Link
                href="/dashboard/admin/columns"
                className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
              >
                {tAdmin('columnSettings')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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