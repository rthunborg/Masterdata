import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginFormSchema } from "@/lib/validation/auth-schema";
import { userRepository } from "@/lib/server/repositories/user-repository";
import type { APIResponse, LoginResponse } from "@/lib/types/api";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = loginFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: validationResult.error.flatten(),
          },
        } as APIResponse,
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    const supabase = await createClient();

    // Attempt authentication with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('[Login] Authentication failed:', {
        email,
        hasAuthError: !!authError,
        authErrorMessage: authError?.message,
        authErrorStatus: authError?.status,
        hasUser: !!authData?.user,
      });
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        } as APIResponse,
        { status: 401 }
      );
    }

    // Get user record from users table
    const userData = await userRepository.findByAuthId(authData.user.id);
    
    if (!userData) {
      console.error('[Login] User record not found in users table:', {
        auth_user_id: authData.user.id,
        email: authData.user.email,
      });
      return NextResponse.json(
        {
          error: {
            code: "USER_NOT_FOUND",
            message: "User account not found",
          },
        } as APIResponse,
        { status: 401 }
      );
    }

    if (!userData.is_active) {
      console.error('[Login] User account is deactivated:', {
        user_id: userData.id,
        email: userData.email,
      });
      return NextResponse.json(
        {
          error: {
            code: "ACCOUNT_DEACTIVATED",
            message: "Account has been deactivated",
          },
        } as APIResponse,
        { status: 401 }
      );
    }

    // Update last_active_at immediately on login (regardless of 5-minute rule)
    // This ensures the timestamp is always current when user logs in
    await userRepository.updateLastActive(userData.id);

    // Fetch updated user data to include the new last_active_at timestamp
    const updatedUserData = await userRepository.findByAuthId(authData.user.id);
    
    // Return successful login response with updated user data
    const finalUserData = updatedUserData || userData;
    const response: APIResponse<LoginResponse> = {
      data: {
        user: {
          id: finalUserData.id,
          email: finalUserData.email,
          role: finalUserData.role,
          is_active: finalUserData.is_active,
          auth_id: authData.user.id,
          created_at: finalUserData.created_at,
          last_active_at: finalUserData.last_active_at,
        },
        session: {
          access_token: authData.session?.access_token || "",
          expires_at: authData.session?.expires_at 
            ? new Date(authData.session.expires_at * 1000).toISOString()
            : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Login API fel:", error);
    
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
        },
      } as APIResponse,
      { status: 500 }
    );
  }
}