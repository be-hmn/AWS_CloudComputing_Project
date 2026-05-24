import { z } from 'zod';
import { APPLICATION_STATUSES } from '../domain/status.js';

export const createApplicationBody = z
  .object({
    interest_field: z.string().min(1).max(64),
    topic: z.string().min(1).max(255),
    desired_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'invalid ISO date',
    }),
    message: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (Date.parse(val.desired_at) <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['desired_at'],
        message: 'desired_at must be in the future',
      });
    }
  });

export const listApplicationsQuery = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
});

export const assignBody = z.object({
  mentor_id: z.coerce.number().int().positive(),
});

export const approveBody = z
  .object({
    scheduled_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'invalid ISO date',
    }),
  })
  .superRefine((val, ctx) => {
    if (Date.parse(val.scheduled_at) <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduled_at'],
        message: 'scheduled_at must be in the future',
      });
    }
  });

export const rejectBody = z.object({
  reject_reason: z.string().min(1).max(500),
});
