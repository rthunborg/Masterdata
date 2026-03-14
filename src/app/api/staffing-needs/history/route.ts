import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAPI, createErrorResponse } from '@/lib/server/auth';
import { staffingNeedsRepository } from '@/lib/server/repositories/staffing-needs-repository';
import { STAFFING_LOCATIONS } from '@/lib/types/staffing-needs';
import type { StaffingLocation } from '@/lib/types/staffing-needs';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireAuthAPI(request);

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    if (!location || !STAFFING_LOCATIONS.includes(location as StaffingLocation)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid location. Must be one of: ${STAFFING_LOCATIONS.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const data = await staffingNeedsRepository.getHistory(location as StaffingLocation);
    return NextResponse.json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
