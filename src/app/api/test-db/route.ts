import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";


// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();

    // Query column_config table to verify database connection and seed data
    const { data, error, count } = await supabase
      .from("column_config")
      .select("*", { count: "exact" });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      columnCount: count,
      message: `Database connection successful. Found ${count} column configurations.`,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
