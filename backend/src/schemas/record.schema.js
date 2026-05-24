import { z } from 'zod';

export const createRecordBody = z.object({
  summary: z.string().min(1).max(5000),
  follow_up_task: z.string().max(5000).optional(),
  needs_next_consultation: z.boolean(),
  attachment_key: z.string().max(512).optional(),
});
