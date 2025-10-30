import { Link } from '@/lib/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div 
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/stena-bg.jpg')" }}
    >
      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-black/50 -z-10" />
      
      <main className="relative w-full max-w-2xl px-6 py-12">
        <Card className="p-8 md:p-12 shadow-lg bg-white">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
                HR Masterdata Management System
              </h1>
              <p className="text-lg text-zinc-600">
                Centralized employee data management platform with role-based access
                control and real-time synchronization.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-sm text-zinc-700">
                Manage employee master data, custom columns, and important dates with 
                secure access controls tailored for HR administrators and external 
                parties like Sodexo, Bluegarden, and Silkeborg Forsyning.
              </p>

              <div className="flex justify-center pt-2">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto px-12" size="lg">
                    Login to System
                  </Button>
                </Link>
              </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <p className="text-xs text-zinc-500">
                Version 0.1.0 | Secure Authentication Required
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

