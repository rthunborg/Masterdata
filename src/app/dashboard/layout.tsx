import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/server/auth";
import { getRoleDisplayName } from "@/lib/types/user";
import Link from "next/link";
import { Toaster } from "sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                HR Masterdata Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user.email}</span>
              </div>
              <div 
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                role="status"
                aria-label={`Logged in as ${getRoleDisplayName(user.role)}`}
              >
                <span className="sr-only">Logged in as: </span>
                {getRoleDisplayName(user.role)}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="bg-gray-100 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              Employees
            </Link>
            <Link
              href="/dashboard/important-dates"
              className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              Important Dates
            </Link>
            {user.role === "hr_admin" && (
              <Link
                href="/dashboard/admin/users"
                className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
              >
                User Management
              </Link>
            )}
            {user.role === "hr_admin" && (
              <Link
                href="/dashboard/admin/columns"
                className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
              >
                Column Settings
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