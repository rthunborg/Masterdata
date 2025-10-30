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
403 - Access Forbidden          </h1>
          <p className="mt-2 text-base text-gray-600">
            You don&apos;t have permission to access this resource.
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              This area requires higher privileges than your current role allows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="bg-gray-50 rounded-md p-4">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Current User:</span>
                    <span className="text-gray-600">{user.email}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-medium text-gray-700">Role:</span>
                    <span className="text-gray-600">{getRoleDisplayName(user.role)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Need Access?
              </h3>
              <p className="text-sm text-blue-700">
                Contact your HR administrator to request elevated permissions or role changes.
              </p>
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Error Code: 403 | HR Masterdata Management System
          </p>
        </div>
      </div>
    </div>
  );
}