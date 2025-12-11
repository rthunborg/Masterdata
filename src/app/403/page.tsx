"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { getRoleDisplayName } from "@/lib/types/user";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md w-full">
        <div className="text-center">
          <ShieldX className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            403 - Åtkomst nekad
          </h1>
          <p className="mt-2 text-base text-gray-600">
            Du saknar behörighet att se denna sida.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Användarinformation</CardTitle>
            <CardDescription>
              Du är inloggad som:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-sm text-gray-900">{user?.email}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-500">Roll</p>
              <p className="text-sm text-gray-900">{user?.role ? getRoleDisplayName(user.role) : '-'}</p>
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Gå till Dashboard
                </Link>
              </Button>
              <Button variant="outline" onClick={() => router.back()} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Gå tillbaka
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
