import { NextRequest, NextResponse } from "next/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { userRepository } from "@/lib/server/repositories/user-repository";
import type { APIResponse } from "@/lib/types/api";
import type { User } from "@/lib/types/user";

export async function GET() {
  try {
    // Require HR Admin role
    await requireHRAdminAPI();

    // Get all users for admin management
    const users = await userRepository.findAll();

    const response: APIResponse = {
      data: {
        users: users.map((user: User) => ({
          id: user.id,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Admin users API error:", error);
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require HR Admin role
    await requireHRAdminAPI();

    await request.json();
    
    // TODO: Add validation schema for user creation
    // For now, this is a placeholder implementation
    
    const response: APIResponse = {
      data: {
        message: "User creation endpoint - to be implemented",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Admin create user API error:", error);
    return createErrorResponse(error);
  }
}