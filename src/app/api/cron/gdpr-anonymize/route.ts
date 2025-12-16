import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";

// Force Node.js runtime
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Basic authorization check - strictly for Vercel Cron
    // In production, you should verify the Authorization header
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    const count = await employeeRepository.anonymizeOldArchivedEmployees();

    return NextResponse.json({
      success: true,
      message: `Anonymized ${count} employees`,
      meta: {
        timestamp: new Date().toISOString(),
        anonymizedCount: count,
      },
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
