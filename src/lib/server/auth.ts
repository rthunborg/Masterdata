import { createClient } from "@/lib/supabase/server";
import { createAPIClient } from "@/lib/supabase/server-api";
import type { SessionUser, UserRole } from "@/lib/types/user";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function getUserFromSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    
    // Use getUser() instead of getSession() for better security
    // getUser() validates the JWT token with the Supabase Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      if (userError) {
        console.error('[getUserFromSession] Auth error:', {
          message: userError.message,
          status: userError.status,
        });
      }
      return null;
    }

    // Get user record from users table
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at, last_active_at")
      .eq("auth_user_id", user.id)
      .single();

    if (dbError || !userData) {
      console.error('[getUserFromSession] Failed to fetch user from users table:', {
        auth_user_id: user.id,
        email: user.email,
        dbError: dbError ? {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
        } : null,
        hasUserData: !!userData,
      });
      return null;
    }

    if (!userData.is_active) {
      return null;
    }

    return {
      ...userData,
      auth_id: user.id,
    };
  } catch (error) {
    console.error('[getUserFromSession] Unexpected error:', error);
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

/**
 * Require authentication in API routes
 * @param request - Optional NextRequest for API routes with cookies issue workaround
 */
export async function requireAuthAPI(request?: NextRequest): Promise<SessionUser> {
  const user = request 
    ? await getUserFromSessionAPI(request)
    : await getUserFromSession();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return user;
}

/**
 * Get user session in API routes using request cookies directly
 * WORKAROUND for Next.js 16.0.7 cookies() issue in production
 */
async function getUserFromSessionAPI(request: NextRequest): Promise<SessionUser | null> {
  try {
    const supabase = createAPIClient(request);
    
    // Use getUser() instead of getSession() for better security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      if (userError) {
        console.error('[getUserFromSessionAPI] Auth error:', {
          message: userError.message,
          status: userError.status,
        });
      }
      return null;
    }

    // Get user record from users table
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at, last_active_at")
      .eq("auth_user_id", user.id)
      .single();

    if (dbError || !userData) {
      console.error('[getUserFromSessionAPI] Failed to fetch user from users table:', {
        auth_user_id: user.id,
        email: user.email,
        dbError: dbError ? {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
        } : null,
        hasUserData: !!userData,
      });
      return null;
    }

    if (!userData.is_active) {
      return null;
    }

    return {
      ...userData,
      auth_id: user.id,
    };
  } catch (error) {
    console.error('[getUserFromSessionAPI] Unexpected error:', error);
    return null;
  }
}

export async function requireRoleAPI(allowedRoles: UserRole[], request?: NextRequest): Promise<SessionUser> {
  const user = await requireAuthAPI(request);
  
  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error("Insufficient permissions");
  }
  
  return user;
}

export async function requireHRAdminAPI(request?: NextRequest): Promise<SessionUser> {
  return requireRoleAPI(["hr_admin" as UserRole], request);
}

export async function requireEmployeeManagerAPI(request?: NextRequest): Promise<SessionUser> {
  return requireRoleAPI(["hr_admin" as UserRole, "recruiter" as UserRole], request);
}

/**
 * Require a role that can edit employee fields.
 * Includes admin_limited who can edit checklist fields + lönenivå (field-level restrictions handled in app code)
 */
export async function requireEmployeeEditorAPI(): Promise<SessionUser> {
  return requireRoleAPI(["hr_admin" as UserRole, "recruiter" as UserRole, "admin_limited" as UserRole]);
}

// Error Response Utilities

export function createUnauthorizedResponse(message: string = "Inloggning krävs") {
  return NextResponse.json({
    error: {
      code: "UNAUTHORIZED",
      message
    }
  }, { status: 401 });
}

export function createForbiddenResponse(message: string = "Du saknar behörighet för denna åtgärd") {
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