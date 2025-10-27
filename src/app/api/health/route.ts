import { NextResponse } from "next/server";

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns system health status for monitoring and smoke tests.
 * This endpoint is public and does not require authentication.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}
