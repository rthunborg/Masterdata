import { createClient } from "@/lib/supabase/server";
import type { SessionUser, UserRole } from "@/lib/types/user";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function getUserFromSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return null;
    }

    // Get user record from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at")
      .eq("auth_user_id", session.user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    if (!userData.is_active) {
      return null;
    }

    return {
      ...userData,
      auth_id: session.user.id,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getUserFromSession();
  
  if (!user) {
    redirect("/login");
  }
  
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error("Insufficient permissions");
  }
  
  return user;
}

export async function requireHRAdmin(): Promise<SessionUser> {
  return requireRole(["hr_admin" as UserRole]);
}

// API Route Protection Utilities

export async function requireAuthAPI(): Promise<SessionUser> {
  const user = await getUserFromSession();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return user;
}

export async function requireRoleAPI(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuthAPI();
  
  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error("Insufficient permissions");
  }
  
  return user;
}

export async function requireHRAdminAPI(): Promise<SessionUser> {
  return requireRoleAPI(["hr_admin" as UserRole]);
}

// Error Response Utilities

export function createUnauthorizedResponse(message: string = "Authentication required") {
  return NextResponse.json({
    error: {
      code: "UNAUTHORIZED",
      message
    }
  }, { status: 401 });
}

export function createForbiddenResponse(message: string = "Insufficient permissions") {
  return NextResponse.json({
    error: {
      code: "FORBIDDEN", 
      message
    }
  }, { status: 403 });
}

export function createErrorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Authentication required") {
      return createUnauthorizedResponse();
    }
    if (error.message === "Insufficient permissions") {
      return createForbiddenResponse();
    }
  }
  
  return NextResponse.json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    }
  }, { status: 500 });
}