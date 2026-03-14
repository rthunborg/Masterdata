import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAPI, requireRoleAPI, createErrorResponse } from '@/lib/server/auth';
import { staffingNeedsRepository } from '@/lib/server/repositories/staffing-needs-repository';
import { parseOrError } from '@/lib/server/api-helpers';
import { updateStaffingNeedSchema } from '@/lib/validation/staffing-needs';
import { sendStaffingNeedsUpdateEmail } from '@/lib/services/staffing-needs-notification';
import type { UserRole } from '@/lib/types/user';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireAuthAPI(request);
    const data = await staffingNeedsRepository.getAll();
    return NextResponse.json({
      data,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireRoleAPI(['hr_admin', 'crewing'] as UserRole[], request);
    const body = await request.json();
    const parsed = parseOrError(updateStaffingNeedSchema, body);
    if (parsed instanceof NextResponse) return parsed;

    const { location, headcount_need } = parsed;
    const result = await staffingNeedsRepository.updateNeed(location, headcount_need, user.id);

    // Fire-and-forget email notification (only if value actually changed)
    if (result.oldValue !== result.newValue) {
      sendStaffingNeedsUpdateEmail(location, result.oldValue, result.newValue, user.email)
        .catch((err) => console.error('Failed to send staffing needs update email:', err));
    }

    return NextResponse.json({
      data: { location, old_value: result.oldValue, new_value: result.newValue },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
