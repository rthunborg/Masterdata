import { z } from 'zod';

export const updateStaffingNeedSchema = z.object({
  location: z.enum(['Trelleborg', 'Göteborg']),
  headcount_need: z.number().int().min(0).max(9999),
});

export type UpdateStaffingNeedInput = z.infer<typeof updateStaffingNeedSchema>;
