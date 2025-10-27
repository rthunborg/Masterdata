import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="w-full max-w-2xl px-6 py-12">
        <Card className="p-8 md:p-12 shadow-lg">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                HR Masterdata Management System
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                Centralized employee data management platform with role-based access
                control and real-time synchronization.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Manage employee master data, custom columns, and important dates with 
                secure access controls tailored for HR administrators and external 
                parties like Sodexo, Bluegarden, and Silkeborg Forsyning.
              </p>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link href="/login" className="flex-1">
                  <Button className="w-full" size="lg">
                    Login to System
                  </Button>
                </Link>
                <Link href="/api/health" target="_blank" className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">
                    System Health
                  </Button>
                </Link>
              </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Version 0.1.0 | Secure Authentication Required
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

