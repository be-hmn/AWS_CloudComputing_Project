import { z } from 'zod';

export const uploadUrlBody = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(127),
  size: z.number().int().positive(),
  kind: z.enum(['profile', 'record']),
  context_id: z.coerce.number().int().positive().optional(),
});
