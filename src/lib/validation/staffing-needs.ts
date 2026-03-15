import { z } from 'zod';
import { STAFFING_LOCATIONS } from '@/lib/types/staffing-needs';

export const updateStaffingNeedSchema = z.object({
  location: z.enum(STAFFING_LOCATIONS),
  headcount_need: z.number().int().min(0).max(9999),
});

export type UpdateStaffingNeedInput = z.infer<typeof updateStaffingNeedSchema>;
