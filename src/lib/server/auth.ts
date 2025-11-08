import { createClient } from "@/lib/supabase/server";
import type { SessionUser, UserRole } from "@/lib/types/user";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function getUserFromSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    
    // Use getUser() instead of getSession() for better security
    // getUser() validates the JWT token with the Supabase Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Get user record from users table
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at, last_active_at")
      .eq("auth_user_id", user.id)
      .single();

    if (dbError || !userData) {
      return null;
    }

    if (!userData.is_active) {
      return null;
    }

    return {
      ...userData,
      auth_id: user.id,
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
  // Log the full error for debugging
  console.error("API Error:", error);
  
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    if (error.message === "Authentication required") {
      return createUnauthorizedResponse();
    }
    if (error.message === "Insufficient permissions") {
      return createForbiddenResponse();
    }
    
    // Return the actual error message in development
    return NextResponse.json({
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }
    }, { status: 500 });
  }
  
  return NextResponse.json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    }
  }, { status: 500 });
}