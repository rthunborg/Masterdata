import { NextResponse } from "next/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { z } from "zod";

/**
 * POST /api/admin/columns/reorder
 * Batch update column display order
 * Authorization: HR Admin only
 */

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

const reorderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      display_order: z.number().int().positive(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI();

    // Parse and validate request body
    const body = await request.json();
    const validation = reorderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid reorder data",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { updates } = validation.data;

    // Batch update display orders
    await columnConfigRepository.batchUpdateDisplayOrders(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/columns/reorder error:", error);
    return createErrorResponse(error);
  }
}

